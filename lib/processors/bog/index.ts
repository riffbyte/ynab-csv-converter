import { BaseStatementProcessor } from '../base';
import type { StatementProcessor } from '../types';
import { CONSTANTS } from './constants';

export class BOGStatementProcessor
  extends BaseStatementProcessor
  implements StatementProcessor
{
  constructor(fileBuffer: Buffer<ArrayBuffer>) {
    super(fileBuffer, CONSTANTS.transactionsSheetName);
  }

  private extractPayee(details: string): string {
    if (typeof details !== 'string') return '';

    if (details.includes('Merchant: ')) {
      const match = details.match(/Merchant: ([^,;]+)/);
      return match?.[1] || '';
    } else if (details.includes('Outgoing Transfer - Amount')) {
      const match = details.match(/Beneficiary: ([^;]+)/);
      return match?.[1] || '';
    } else if (details.includes('Fee - Amount')) {
      return 'SOLO';
    } else if (details.includes('payment service')) {
      const match = details.match(/payment service, ([^,]+)/);
      return match?.[1] || '';
    } else if (
      details.includes('Payment - Amount') &&
      details.includes('Date:')
    ) {
      const match = details.match(/; ([^;]+); Date:/);
      return match?.[1] || '';
    } else if (details.includes('Incoming Transfer - Amount')) {
      const match = details.match(/Sender: ([^;]+); Account/);
      return match?.[1] || '';
    }

    return '';
  }

  private isCurrencyConversion(details: string): boolean {
    return details.includes('Foreign Exchange');
  }

  private findMatchingTransaction(
    conversionDetails: string,
    allRows: string[][],
  ): { details: string } | null {
    const counterAmountMatch = conversionDetails.match(
      /Counter-amount: ([A-Z]{3}[0-9]+\.?[0-9]*)/,
    );

    if (!counterAmountMatch) return null;

    const counterAmount = counterAmountMatch[1]; // e.g., "USD4.99"
    const counterCurrency = counterAmount.match(/^[A-Z]{3}/)?.[0]; // e.g., "USD"
    const counterValue = counterAmount.replace(/^[A-Z]{3}/, ''); // e.g., "4.99"

    if (!counterCurrency || !counterValue) return null;

    // Find matching transaction in the counter currency
    const counterCurrencyIdx = this.getColumnIndex(counterCurrency);
    if (counterCurrencyIdx === -1) return null;

    // Search through all rows to find matching transaction
    const foundRow = allRows.find((row, i) => {
      if (i === 0) return false; // skip header row
      const rowDetails = row[this.getColumnIndex('Details')];
      const rowAmount = row[counterCurrencyIdx];

      return (
        rowDetails &&
        rowAmount &&
        rowAmount.toString() === `-${counterValue}` &&
        !this.isCurrencyConversion(rowDetails)
      );
    });

    if (foundRow) {
      const rowDetails = foundRow[this.getColumnIndex('Details')];

      return {
        details: rowDetails,
      };
    }

    return null;
  }

  public getProcessedCSVData(
    currency: (typeof CONSTANTS.availableCurrencies)[number],
    shouldConvert: boolean = false,
  ): string {
    const dateIdx = this.getColumnIndex('Date');
    const detailsIdx = this.getColumnIndex('Details');
    const amountIdx = this.getColumnIndex(currency);

    if (dateIdx === -1 || detailsIdx === -1 || amountIdx === -1) {
      throw new Error('Required columns missing', { cause: 'Invalid data' });
    }

    this.processRows((row, _, allRows) => {
      const date = row[dateIdx];
      const details = row[detailsIdx];
      const amount = row[amountIdx];

      if (amount === undefined || amount === null || amount === '') return null;

      if (shouldConvert && this.isCurrencyConversion(details)) {
        const matchingTransaction = this.findMatchingTransaction(
          details,
          allRows,
        );

        if (matchingTransaction) {
          const matchingPayee = this.extractPayee(matchingTransaction.details);
          const matchingDetails = matchingTransaction.details;

          return [date, matchingPayee, matchingDetails, amount];
        }
      }

      const payee = this.extractPayee(details);

      return [date, payee, details, amount];
    });

    return this.getCSVData();
  }
}

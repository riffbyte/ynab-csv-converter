import { getBankConfig } from '../bankConfigs';
import { BaseXLSXProcessor } from '../base/xlsx-processor';
import { Bank, type BankStatementProcessor } from '../types';
import { validateCurrency } from '../validateCurrency';

const PAYEE_PATTERNS: {
  pattern: RegExp;
  condition: (details: string) => boolean;
}[] = [
  {
    pattern: /Merchant: ([^,;]+)/,
    condition: (details: string) => details.includes('Merchant: '),
  },
  {
    pattern: /Beneficiary: ([^;]+)/,
    condition: (details: string) =>
      details.includes('Outgoing Transfer - Amount'),
  },
  {
    pattern: /payment service, ([^,]+)/,
    condition: (details: string) => details.includes('payment service'),
  },
  {
    pattern: /; ([^;]+); Date:/,
    condition: (details: string) =>
      details.includes('Payment - Amount') && details.includes('Date:'),
  },
  {
    pattern: /Sender: ([^;]+); Account/,
    condition: (details: string) =>
      details.includes('Incoming Transfer - Amount'),
  },
];

const SPECIAL_PAYEES = {
  'Fee - Amount': 'Bank of Georgia',
} as const;

const COUNTER_AMOUNT_PATTERN = /Counter-amount: ([A-Z]{3}[0-9]+\.?[0-9]*)/;
const CONFIG = getBankConfig(Bank.BOG);

export class BOGStatementProcessor
  extends BaseXLSXProcessor
  implements BankStatementProcessor
{
  constructor(fileBuffer: Buffer<ArrayBuffer>) {
    super(fileBuffer, CONFIG.transactionsSheetName ?? 'Transactions');
  }

  private extractPayee(details: string): string {
    if (typeof details !== 'string') return '';

    // Check for special payee mappings first
    for (const [key, payee] of Object.entries(SPECIAL_PAYEES)) {
      if (details.includes(key)) return payee;
    }

    // Check pattern-based payee extraction
    for (const { pattern, condition } of PAYEE_PATTERNS) {
      if (condition(details)) {
        const match = details.match(pattern);
        if (match?.[1]) return match[1];
      }
    }

    return '';
  }

  private isCurrencyConversion(details: string): boolean {
    return details.includes('Foreign Exchange');
  }

  private parseCounterAmount(
    conversionDetails: string,
  ): { currency: string; value: string } | null {
    const match = conversionDetails.match(COUNTER_AMOUNT_PATTERN);
    if (!match) return null;

    const counterAmount = match[1]; // e.g., "USD4.99"
    const currency = counterAmount.match(/^[A-Z]{3}/)?.[0];
    const value = counterAmount.replace(/^[A-Z]{3}/, '');

    return currency && value ? { currency, value } : null;
  }

  private findMatchingTransaction(
    conversionDetails: string,
    allRows: string[][],
  ): { details: string } | null {
    const parsed = this.parseCounterAmount(conversionDetails);
    if (!parsed) return null;

    const { currency, value } = parsed;
    const counterCurrencyIdx = this.getColumnIndex(currency);
    if (counterCurrencyIdx === -1) return null;

    const detailsIdx = this.getColumnIndex('Details');
    const matchingRow = allRows.find((row, i) => {
      if (i === 0) return false; // skip header row
      const rowDetails = row[detailsIdx];
      const rowAmount = row[counterCurrencyIdx];

      return (
        rowDetails &&
        rowAmount &&
        rowAmount.toString() === `-${value}` &&
        !this.isCurrencyConversion(rowDetails)
      );
    });

    return matchingRow ? { details: matchingRow[detailsIdx] } : null;
  }

  public getProcessedCSVData(
    currency: string | null,
    shouldConvert: boolean = false,
    shouldTranslate: boolean = false,
  ): Promise<string> {
    const dateIdx = this.getColumnIndex('Date');
    const detailsIdx = this.getColumnIndex('Details');
    const amountIdx = this.getColumnIndex(validateCurrency(currency, CONFIG));

    if (dateIdx === -1 || detailsIdx === -1 || amountIdx === -1) {
      throw new Error('Required columns missing', { cause: 'Invalid data' });
    }

    this.processRows((row, _, allRows) => {
      const [date, details, amount] = [
        row[dateIdx],
        row[detailsIdx],
        row[amountIdx],
      ];

      if (amount === undefined || amount === null || amount === '') return null;

      // Handle currency conversion case
      if (shouldConvert && this.isCurrencyConversion(details)) {
        const matchingTransaction = this.findMatchingTransaction(
          details,
          allRows,
        );
        if (matchingTransaction) {
          return [
            date,
            this.extractPayee(matchingTransaction.details),
            matchingTransaction.details,
            amount,
          ];
        }
      }

      // Handle regular transaction
      return [date, this.extractPayee(details), details, amount];
    });

    return this.getCSVData(shouldTranslate);
  }
}

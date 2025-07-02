import { BaseStatementProcessor } from '../base';
import type { StatementProcessor } from '../types';

export class BOGStatementProcessor
  extends BaseStatementProcessor
  implements StatementProcessor
{
  constructor(fileBuffer: Buffer<ArrayBuffer>) {
    super(fileBuffer, 'Transactions');
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

  public getProcessedCSVData(): string {
    const dateIdx = this.getColumnIndex('Date');
    const detailsIdx = this.getColumnIndex('Details');
    const amountIdx = this.getColumnIndex('GEL');

    if (dateIdx === -1 || detailsIdx === -1 || amountIdx === -1) {
      throw new Error('Required columns missing', { cause: 'Invalid data' });
    }

    this.processRows((row) => {
      const date = row[dateIdx];
      const details = row[detailsIdx];
      const amount = row[amountIdx];

      if (amount === undefined || amount === null || amount === '') return null;

      const payee = this.extractPayee(details);

      return [date, payee, details, amount];
    });

    return this.getCSVData();
  }
}

import type { BaseStatementProcessor } from './base';

export interface StatementProcessor extends BaseStatementProcessor {
  getProcessedCSVData(): string;
}

export type StatementConstants<Currencies extends readonly string[]> = {
  availableCurrencies: Currencies;
  defaultCurrency: Currencies[number];
  transactionsSheetName: string;
  isValidCurrency(currency: string): currency is Currencies[number];
};

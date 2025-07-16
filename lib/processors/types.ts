import type { BaseStatementProcessor } from './base';

export interface StatementProcessor extends BaseStatementProcessor {
  getProcessedCSVData<Currencies extends readonly string[]>(
    currency: Currencies[number],
    shouldConvert?: boolean,
  ): string;
}

export type StatementConstants<Currencies extends readonly string[]> = {
  availableCurrencies: Currencies;
  defaultCurrency: Currencies[number];
  transactionsSheetName: string;
  isValidCurrency(currency: string): currency is Currencies[number];
};

export enum Bank {
  BOG = 'Bank of Georgia',
  TBC = 'TBC',
  CREDO = 'Credo Bank',
}

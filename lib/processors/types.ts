export type RawDataRow = string[];
export type ResultDataRow = [string, string, string, string];

export interface BankConfig<
  Currencies extends readonly string[] = readonly string[],
> {
  availableCurrencies: Currencies;
  defaultCurrency: Currencies[number];
  transactionsSheetName: string;
  canConvertMatchingTransactions: boolean;
  canTranslate: boolean;
}

export abstract class BankStatementProcessor {
  public abstract getProcessedCSVData(
    currency?: string | null,
    shouldConvert?: boolean,
    shouldTranslate?: boolean,
  ): Promise<string>;
  public abstract getPreview(rowsToShow?: number): string[][];
}

export enum Bank {
  BOG = 'Bank of Georgia',
  TBC = 'TBC',
  CREDO = 'Credo Bank',
}

import type { StatementConstants } from '../types';

const availableCurrencies = ['GEL', 'USD', 'EUR', 'GBP'] as const;

export const CONSTANTS: StatementConstants<typeof availableCurrencies> = {
  availableCurrencies,
  defaultCurrency: 'GEL',
  transactionsSheetName: 'Transactions',
  isValidCurrency: (
    currency,
  ): currency is (typeof availableCurrencies)[number] =>
    (availableCurrencies as readonly string[]).includes(currency),
};

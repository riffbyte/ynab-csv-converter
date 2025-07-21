import type { StatementConstants } from '../types';

const availableCurrencies = ['GEL'] as const;

export const CONSTANTS: StatementConstants<typeof availableCurrencies> = {
  availableCurrencies,
  defaultCurrency: 'GEL',
  transactionsSheetName: 'ტრანზაქციები',
  isValidCurrency: (
    currency,
  ): currency is (typeof availableCurrencies)[number] =>
    (availableCurrencies as readonly string[]).includes(currency),
};

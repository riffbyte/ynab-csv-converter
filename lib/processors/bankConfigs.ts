import { Bank, type BankConfig } from './types';

export const BANK_CONFIGS: Record<Bank, BankConfig> = {
  [Bank.BOG]: {
    availableCurrencies: ['GEL', 'USD', 'EUR', 'GBP'] as const,
    defaultCurrency: 'GEL' as const,
    transactionsSheetName: 'Transactions',
    canConvertMatchingTransactions: true,
    canTranslate: false,
  },
  [Bank.CREDO]: {
    availableCurrencies: ['GEL'] as const,
    defaultCurrency: 'GEL' as const,
    transactionsSheetName: 'ტრანზაქციები',
    canConvertMatchingTransactions: false,
    canTranslate: true,
  },
  [Bank.TBC]: {
    availableCurrencies: ['GEL'] as const,
    defaultCurrency: 'GEL' as const,
    transactionsSheetName: '',
    canConvertMatchingTransactions: false,
    canTranslate: true,
  },
} as const;

/**
 * Get static configuration for a bank without importing server-side dependencies.
 */
export function getBankConfig(bank: Bank): BankConfig {
  return BANK_CONFIGS[bank];
}

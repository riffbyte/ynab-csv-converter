import { Bank, type StaticBankStatementProcessor } from './types';

export const BANK_CONFIGS: Record<Bank, StaticBankStatementProcessor> = {
  [Bank.BOG]: {
    availableCurrencies: ['GEL', 'USD', 'EUR', 'GBP'] as const,
    defaultCurrency: 'GEL' as const,
  },
  [Bank.CREDO]: {
    availableCurrencies: ['GEL'] as const,
    defaultCurrency: 'GEL' as const,
  },
  [Bank.TBC]: {
    availableCurrencies: ['GEL'] as const,
    defaultCurrency: 'GEL' as const,
  },
} as const;

/**
 * Get static configuration for a bank without importing server-side dependencies.
 */
export function getBankConfig(bank: Bank): StaticBankStatementProcessor {
  return BANK_CONFIGS[bank];
}

import { CONSTANTS as BOG_CONSTANTS } from './bog/constants';
import { Bank } from './types';

export function getAvailableCurrencies(bank: Bank): {
  availableCurrencies: readonly string[];
  defaultCurrency: string;
} {
  switch (bank) {
    case Bank.BOG:
      return {
        availableCurrencies: BOG_CONSTANTS.availableCurrencies,
        defaultCurrency: BOG_CONSTANTS.defaultCurrency,
      };
    default:
      return {
        availableCurrencies: ['GEL'],
        defaultCurrency: 'GEL',
      };
  }
}

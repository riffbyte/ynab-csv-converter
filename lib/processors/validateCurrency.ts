import type { BankConfig } from './types';

export function validateCurrency(
  currency: string | null,
  config: BankConfig,
): (typeof config.availableCurrencies)[number] {
  let validatedCurrency: (typeof config.availableCurrencies)[number];
  if (!currency) {
    validatedCurrency = config.defaultCurrency;
  } else if (
    (config.availableCurrencies as readonly string[]).includes(currency)
  ) {
    validatedCurrency = currency as (typeof config.availableCurrencies)[number];
  } else {
    throw new Error('Invalid currency', {
      cause: 'Invalid data',
    });
  }

  return validatedCurrency;
}

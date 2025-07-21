import { Bank } from './types';

export function getCanConvert(bank: Bank): boolean {
  switch (bank) {
    case Bank.BOG:
      return true;
    default:
      return false;
  }
}

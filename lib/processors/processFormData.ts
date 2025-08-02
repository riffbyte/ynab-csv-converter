import path from 'node:path';
import { BOGStatementProcessor } from './bog';
import { CONSTANTS as BOG_CONSTANTS } from './bog/constants';
import { CredoStatementProcessor } from './credo';
import { CONSTANTS as CREDO_CONSTANTS } from './credo/constants';
import { Bank, type StatementProcessor } from './types';

export async function processFormData(formData: FormData) {
  const file = formData.get('file') as File | null;
  const currency = formData.get('currency') as string | null;
  const bank = formData.get('bank') as string | null;
  const shouldConvert = formData.get('shouldConvert') as string | null;
  const shouldTranslate = formData.get('shouldTranslate') as string | null;

  if (!file) {
    throw new Error('No file uploaded', {
      cause: 'Invalid data',
    });
  }

  if (!bank || !Object.values(Bank).includes(bank as Bank)) {
    throw new Error('Invalid bank', {
      cause: 'Invalid data',
    });
  }

  const fileName = file.name;
  const baseName = path.parse(fileName).name; // Remove .xlsx
  const outputFileName = `${baseName}.csv`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let processor: StatementProcessor;
  let validatedCurrency: string;

  switch (bank) {
    case Bank.BOG:
      processor = new BOGStatementProcessor(buffer);
      if (!currency) {
        validatedCurrency = BOG_CONSTANTS.defaultCurrency;
      } else if (BOG_CONSTANTS.isValidCurrency(currency)) {
        validatedCurrency = currency;
      } else {
        throw new Error('Invalid currency', {
          cause: 'Invalid data',
        });
      }

      break;
    case Bank.CREDO:
      processor = new CredoStatementProcessor(buffer);
      if (!currency) {
        validatedCurrency = CREDO_CONSTANTS.defaultCurrency;
      } else if (CREDO_CONSTANTS.isValidCurrency(currency)) {
        validatedCurrency = currency;
      } else {
        throw new Error('Invalid currency', {
          cause: 'Invalid data',
        });
      }
      break;
    default:
      throw new Error(`Bank "${bank}" is not supported yet.`, {
        cause: 'Invalid data',
      });
  }

  const csvData = await processor.getProcessedCSVData(
    validatedCurrency,
    Boolean(shouldConvert),
    Boolean(shouldTranslate),
  );

  const preview = processor.getPreview();

  return {
    csvData,
    preview,
    outputFileName,
  } as const;
}

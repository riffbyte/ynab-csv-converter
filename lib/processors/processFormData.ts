import path from 'node:path';
import { BOGStatementProcessor } from './bog';
import { CredoStatementProcessor } from './credo';
import { TBCStatementProcessor } from './tbc';
import { Bank, type BankStatementProcessor } from './types';

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

  const baseName = path.parse(file.name).name;
  const outputFileName = `${baseName}.csv`;

  let processor: BankStatementProcessor;

  switch (bank) {
    case Bank.BOG:
      processor = new BOGStatementProcessor(file);
      break;
    case Bank.CREDO:
      processor = new CredoStatementProcessor(file);
      break;
    case Bank.TBC:
      processor = new TBCStatementProcessor(file);
      break;
    default:
      throw new Error(`Bank "${bank}" is not supported yet.`, {
        cause: 'Invalid data',
      });
  }

  const csvData = await processor.getProcessedCSVData(
    currency,
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

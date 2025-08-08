import * as XLSX from 'xlsx';
import { BaseFileProcessor } from './file-processor';

export class BaseXLSXProcessor extends BaseFileProcessor {
  constructor(fileBuffer: Buffer<ArrayBuffer>, sheetName: string) {
    super(fileBuffer);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`, {
        cause: 'Invalid data',
      });
    }

    this.rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }
}

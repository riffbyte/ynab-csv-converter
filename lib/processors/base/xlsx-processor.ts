import * as XLSX from 'xlsx';
import { BaseFileProcessor } from './file-processor';

export class BaseXLSXProcessor extends BaseFileProcessor {
  private sheetName: string;

  constructor(file: File, sheetName: string) {
    if (
      !file.type.includes(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
    ) {
      throw new Error('File is not a XLSX', {
        cause: 'Invalid data',
      });
    }

    super(file);

    this.sheetName = sheetName;
  }

  /**
   * Any extending class should call this method before processing data.
   */
  protected async initializeWithXLSX() {
    try {
      await this.initializeWithFile();

      const workbook = XLSX.read(this.fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[this.sheetName];

      if (!sheet) {
        throw new Error(`Sheet "${this.sheetName}" not found`, {
          cause: 'Invalid data',
        });
      }

      this.rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error';

      throw new Error(`Failed to parse XLSX: ${message}`, {
        cause: 'Invalid data',
      });
    }
  }
}

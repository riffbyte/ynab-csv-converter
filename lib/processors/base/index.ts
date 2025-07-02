import * as XLSX from 'xlsx';

type RawDataRow = string[];
type ResultDataRow = [string, string, string, string];

export class BaseStatementProcessor {
  private rawData: RawDataRow[];
  private result: ResultDataRow[] = [['Date', 'Payee', 'Memo', 'Amount']];

  constructor(fileBuffer: Buffer<ArrayBuffer>, sheetName: string) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`, {
        cause: 'Invalid data',
      });
    }

    this.rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  public getColumnIndex(columnName: string) {
    const headers = this.rawData[0];
    return headers.indexOf(columnName);
  }

  public processRows(
    iterator: (
      row: RawDataRow,
      index: number,
      allRows: RawDataRow[],
    ) => ResultDataRow | null,
  ) {
    for (let i = 1; i < this.rawData.length; i++) {
      const rowResult = iterator(this.rawData[i], i, this.rawData);
      if (rowResult) {
        this.result.push(rowResult);
      }
    }
  }

  public getCSVData() {
    const csvSheet = XLSX.utils.aoa_to_sheet(this.result);
    return XLSX.utils.sheet_to_csv(csvSheet);
  }
}

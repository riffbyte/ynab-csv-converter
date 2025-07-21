import { v2 } from '@google-cloud/translate';
import * as XLSX from 'xlsx';

const { Translate } = v2;
const TRANSLATE_API_CHUNK_SIZE = 128;
const TRANSLATED_LANGUAGES = ['ka'];

type RawDataRow = string[];
type ResultDataRow = [string, string, string, string];

export class BaseStatementProcessor {
  private rawData: RawDataRow[];
  private result: ResultDataRow[] = [['Date', 'Payee', 'Memo', 'Amount']];
  private translate: InstanceType<typeof Translate>;

  constructor(fileBuffer: Buffer<ArrayBuffer>, sheetName: string) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found`, {
        cause: 'Invalid data',
      });
    }

    this.rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    this.translate = new Translate({
      key: process.env.GOOGLE_TRANSLATE_API_KEY,
    });
  }

  protected getColumnIndex(columnName: string) {
    const headers = this.rawData[0];
    return headers.indexOf(columnName);
  }

  protected async mapToDetectedLanguages(strings: string[]) {
    const results: Record<string, string> = {};

    for (let i = 0; i < strings.length; i += TRANSLATE_API_CHUNK_SIZE) {
      const chunk = strings.slice(i, i + TRANSLATE_API_CHUNK_SIZE);
      const [detections] = await this.translate.detect(chunk);
      chunk.forEach((string, index) => {
        results[string] = detections[index].language;
      });
    }

    return results;
  }

  protected async translateStrings(strings: string[]) {
    const translations: string[] = [];

    for (let i = 0; i < strings.length; i += TRANSLATE_API_CHUNK_SIZE) {
      const chunk = strings.slice(i, i + TRANSLATE_API_CHUNK_SIZE);
      const [chunkTranslations] = await this.translate.translate(chunk, {
        to: 'en',
      });
      translations.push(...chunkTranslations);
    }

    return translations;
  }

  protected processRows(
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

  private async translateRowsIfNeeded() {
    const allPayees = this.result.map(([_date, payee]) => payee);

    const payeesDetectedLanguages =
      await this.mapToDetectedLanguages(allPayees);

    if (
      !Object.values(payeesDetectedLanguages).some(
        (language) => language !== 'en',
      )
    ) {
      return;
    }

    const payeeTranslations = await this.translateStrings(allPayees);

    this.result.forEach((row, index) => {
      if (
        TRANSLATED_LANGUAGES.includes(payeesDetectedLanguages[allPayees[index]])
      ) {
        row[1] = payeeTranslations[index];
      }
    });
  }

  protected async getCSVData(shouldTranslate: boolean = false) {
    if (shouldTranslate) {
      await this.translateRowsIfNeeded();
    }

    const csvSheet = XLSX.utils.aoa_to_sheet(this.result);
    return XLSX.utils.sheet_to_csv(csvSheet);
  }
}

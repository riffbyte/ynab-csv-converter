import { v2 } from '@google-cloud/translate';
import * as XLSX from 'xlsx';
import type { RawDataRow, ResultDataRow } from '../types';

const TRANSLATE_API_CHUNK_SIZE = 128;
const OUTPUT_LANGUAGE = 'en';

export class BaseFileProcessor {
  protected rawData: RawDataRow[];
  protected result: ResultDataRow[];
  protected translate: InstanceType<typeof v2.Translate>;
  protected translatedLanguages: string[] = [];

  constructor(_fileBuffer: Buffer<ArrayBuffer>) {
    this.rawData = [];
    this.result = [['Date', 'Payee', 'Memo', 'Amount']];
    this.translate = new v2.Translate({
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
        to: OUTPUT_LANGUAGE,
      });
      translations.push(...chunkTranslations);
    }

    return translations;
  }

  private async translateRowsIfNeeded() {
    const allPayees = this.result.map(([_date, payee]) => payee);

    const payeesDetectedLanguages =
      await this.mapToDetectedLanguages(allPayees);

    if (
      !Object.values(payeesDetectedLanguages).some(
        (language) => language !== OUTPUT_LANGUAGE,
      )
    ) {
      return;
    }

    const payeeTranslations = await this.translateStrings(allPayees);

    this.result.forEach((row, index) => {
      if (
        this.translatedLanguages.includes(
          payeesDetectedLanguages[allPayees[index]],
        )
      ) {
        row[1] = payeeTranslations[index];
      }
    });
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

  protected async getCSVData(shouldTranslate: boolean = false) {
    if (shouldTranslate) {
      await this.translateRowsIfNeeded();
    }

    const csvSheet = XLSX.utils.aoa_to_sheet(this.result);
    return XLSX.utils.sheet_to_csv(csvSheet);
  }

  public getPreview(rowsToShow: number = 5) {
    const headerRow = this.result[0];
    const sortedRows = this.result.slice(1);

    return [headerRow, ...sortedRows.slice(0, rowsToShow)];
  }
}

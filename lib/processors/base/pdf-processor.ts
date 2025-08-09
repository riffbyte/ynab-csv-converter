import { BaseFileProcessor } from './file-processor';

// TODO: Implement this class (NOTE: most PDF libraries are not working correctly in Next.js)
export class BasePDFProcessor extends BaseFileProcessor {
  constructor(file: File) {
    if (!file.type.includes('pdf')) {
      throw new Error('File is not a PDF', {
        cause: 'Invalid data',
      });
    }

    super(file);
  }

  /**
   * Any extending class should call this method before processing data.
   */
  protected async initializeWithPDF() {
    try {
      await this.initializeWithFile();

      // TODO: Implement PDF table parsing
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected error';

      throw new Error(`Failed to parse PDF: ${message}`, {
        cause: 'Invalid data',
      });
    }

    if (this.rawData.length === 0) {
      throw new Error('No data could be extracted from PDF', {
        cause: 'Invalid data',
      });
    }
  }
}

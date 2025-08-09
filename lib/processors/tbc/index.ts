import { getBankConfig } from '../bankConfigs';
import { BasePDFProcessor } from '../base/pdf-processor';
import { Bank, type BankStatementProcessor } from '../types';

const _CONFIG = getBankConfig(Bank.TBC);

export class TBCStatementProcessor
  extends BasePDFProcessor
  implements BankStatementProcessor
{
  // TODO: Implement this
  public async getProcessedCSVData(
    _currency: string | null,
    _shouldConvert: boolean = false,
    shouldTranslate: boolean = false,
  ): Promise<string> {
    await this.initializeWithPDF();

    // this.processRows((row) => {
    //   return [date, payee, description, finalAmount];
    // });

    return this.getCSVData(shouldTranslate);
  }
}

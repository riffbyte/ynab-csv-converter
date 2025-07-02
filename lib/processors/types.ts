import type { BaseStatementProcessor } from './base';

export interface StatementProcessor extends BaseStatementProcessor {
  getProcessedCSVData(): string;
}

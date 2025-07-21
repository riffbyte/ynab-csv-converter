import { BaseStatementProcessor } from '../base';
import type { StatementProcessor } from '../types';
import { CONSTANTS } from './constants';

type PayeeMatcher =
  | {
      condition: (details: string) => boolean;
      pattern: RegExp;
    }
  | {
      condition: (details: string) => boolean;
      transform: (details: string, beneficiary: string) => string;
    };

const BENEFICIARY_PAYESS = [
  'Personal Transfer.',
  'Private transfers',
  'Конвертация суммы',
] as const;

const PAYEE_MATCHERS: PayeeMatcher[] = [
  {
    condition: (details) => details.includes('გადახდა -'),
    pattern: /გადახდა - (.+?) \d+(\.\d+)? GEL \d{2}\.\d{2}\.\d{4}/,
  },
  {
    condition: (details) => details.includes('განაღდება -'),
    transform: (details) => details.replace('განაღდება -', 'Withdrawal -'),
  },
  {
    condition: (details) => details.includes('ლარის გადარიცხვის საკომისიო'),
    transform: () => 'Transfer comission',
  },
  {
    condition: (details) => details.includes('სხვა და სხვა საკომისიო'),
    transform: () => 'Miscellaneous comission',
  },
  {
    condition: (details) => details.includes('უნაღდო კონვერტაცია'),
    transform: () => 'Cashless conversion',
  },
  {
    condition: (details) =>
      BENEFICIARY_PAYESS.some((payee) => details.includes(payee)) ||
      /^(.+?)(?: - .+?)* - [A-Z0-9]+$/i.test(details),
    transform: (_details, beneficiary) => beneficiary,
  },
  {
    condition: (details) => details.includes('ზალატაია კარონა'),
    transform: () => 'Zolotaya Korona',
  },
];

export class CredoStatementProcessor
  extends BaseStatementProcessor
  implements StatementProcessor
{
  constructor(fileBuffer: Buffer<ArrayBuffer>) {
    super(fileBuffer, CONSTANTS.transactionsSheetName);
  }

  private extractPayee(details: string, beneficiary: string): string {
    if (typeof details !== 'string') return '';

    // Check pattern-based payee extraction
    for (const matcher of PAYEE_MATCHERS) {
      if (matcher.condition(details)) {
        if ('transform' in matcher) {
          return matcher.transform(details, beneficiary);
        }
        if ('pattern' in matcher) {
          const match = details.match(matcher.pattern);
          if (match?.[1]) return match[1];
        }
      }
    }

    return '';
  }

  public getProcessedCSVData(
    _currency: (typeof CONSTANTS.availableCurrencies)[number],
    _shouldConvert: boolean = false,
    shouldTranslate: boolean = false,
  ): Promise<string> {
    const dateIdx = this.getColumnIndex('თარიღი');
    const detailsIdx = this.getColumnIndex('დანიშნულება');
    const outcomeAmountIdx = this.getColumnIndex('ბრუნვა (დებ)');
    const incomeAmountIdx = this.getColumnIndex('ბრუნვა (კრ)');
    const beneficiaryIdx = this.getColumnIndex('ბენეფიციარის სახელი');

    if (
      dateIdx === -1 ||
      detailsIdx === -1 ||
      outcomeAmountIdx === -1 ||
      incomeAmountIdx === -1 ||
      beneficiaryIdx === -1
    ) {
      throw new Error('Required columns missing', { cause: 'Invalid data' });
    }

    this.processRows((row) => {
      const [date, details, outcomeAmount, incomeAmount, beneficiary] = [
        row[dateIdx],
        row[detailsIdx],
        row[outcomeAmountIdx],
        row[incomeAmountIdx],
        row[beneficiaryIdx],
      ];

      const amount = outcomeAmount ? `-${outcomeAmount}` : incomeAmount;

      if (amount === undefined || amount === null || amount === '') return null;

      return [date, this.extractPayee(details, beneficiary), details, amount];
    });

    return this.getCSVData(shouldTranslate);
  }
}

/** biome-ignore-all lint/suspicious/noExplicitAny: This is needed for manually setting private properties */
import * as XLSX from 'xlsx';
import { CONSTANTS } from '../constants';
import { CredoStatementProcessor } from '../index';

// Mock XLSX module
jest.mock('xlsx');

describe('CredoStatementProcessor', () => {
  let mockData: string[][];
  let processor: CredoStatementProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    mockData = [
      [
        'თარიღი',
        'დანიშნულება',
        'ბრუნვა (დებ)',
        'ბრუნვა (კრ)',
        'ბენეფიციარის სახელი',
      ],
      [
        '01/01/2024',
        'გადახდა - Supermarket 12.34 GEL 01.01.2024',
        '12.34',
        '',
        '',
      ],
      ['02/01/2024', 'განაღდება - ATM', '100', '', ''],
      ['03/01/2024', 'ლარის გადარიცხვის საკომისიო', '1.5', '', ''],
      ['04/01/2024', 'სხვა და სხვა საკომისიო', '0.5', '', ''],
      ['05/01/2024', 'უნაღდო კონვერტაცია', '50', '', ''],
      ['06/01/2024', 'Personal Transfer. - ABC123', '', '200', 'John Doe'],
      ['07/01/2024', 'ზალატაია კარონა', '20', '', ''],
      ['08/01/2024', 'Unmatched details', '5', '', ''],
    ];
    (XLSX.read as jest.Mock).mockReturnValue({
      Sheets: { [CONSTANTS.transactionsSheetName]: {} },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue({});
    (XLSX.utils.sheet_to_csv as jest.Mock).mockReturnValue(
      'Date,Payee,Memo,Amount\n01/01/2024,Supermarket,გადახდა - Supermarket 12.34 GEL 01.01.2024,-12.34\n02/01/2024,Withdrawal - ATM,განაღდება - ATM,-100\n03/01/2024,Transfer comission,ლარის გადარიცხვის საკომისიო,-1.5\n04/01/2024,Miscellaneous comission,სხვა და სხვა საკომისიო,-0.5\n05/01/2024,Cashless conversion,უნაღდო კონვერტაცია,-50\n06/01/2024,John Doe,Personal Transfer. - ABC123,200\n07/01/2024,Zolotaya Korona,ზალატაია კარონა,-20\n08/01/2024,,Unmatched details,-5',
    );
    const mockFileBuffer = Buffer.from(
      'mock file content',
    ) as unknown as Buffer<ArrayBuffer>;
    processor = new CredoStatementProcessor(mockFileBuffer);
    (processor as any).rawData = mockData;
  });

  describe('constructor', () => {
    it('should create instance with valid file buffer', () => {
      expect(processor).toBeInstanceOf(CredoStatementProcessor);
    });
  });

  describe('extractPayee', () => {
    it('should extract payee from "გადახდა -" pattern', () => {
      const details = 'გადახდა - Supermarket 12.34 GEL 01.01.2024';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Supermarket');
    });
    it('should transform "განაღდება -" to Withdrawal', () => {
      const details = 'განაღდება - ATM';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Withdrawal - ATM');
    });
    it('should return Transfer comission for relevant details', () => {
      const details = 'ლარის გადარიცხვის საკომისიო';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Transfer comission');
    });
    it('should return Miscellaneous comission for relevant details', () => {
      const details = 'სხვა და სხვა საკომისიო';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Miscellaneous comission');
    });
    it('should return Cashless conversion for relevant details', () => {
      const details = 'უნაღდო კონვერტაცია';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Cashless conversion');
    });
    it('should use beneficiary if details match beneficiary payee', () => {
      const details = 'Personal Transfer. - ABC123';
      const payee = (processor as any).extractPayee(details, 'John Doe');
      expect(payee).toBe('John Doe');
    });
    it('should return Zolotaya Korona for relevant details', () => {
      const details = 'ზალატაია კარონა';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('Zolotaya Korona');
    });
    it('should return empty string for unmatched details', () => {
      const details = 'Unmatched details';
      const payee = (processor as any).extractPayee(details, '');
      expect(payee).toBe('');
    });
    it('should return empty string for non-string input', () => {
      const payee = (processor as any).extractPayee(null, '');
      expect(payee).toBe('');
    });
  });

  describe('getProcessedCSVData', () => {
    it('should process transactions correctly', async () => {
      const result = await processor.getProcessedCSVData('GEL');
      expect(result).toContain('Date,Payee,Memo,Amount');
      expect(result).toContain('Supermarket');
      expect(result).toContain('Withdrawal - ATM');
      expect(result).toContain('Transfer comission');
      expect(result).toContain('John Doe');
      expect(result).toContain('Zolotaya Korona');
    });
    it('should throw error when required columns are missing', () => {
      (processor as any).rawData = [
        ['Invalid', 'Columns'],
        ['01/01/2024', 'Test'],
      ];
      expect(() => processor.getProcessedCSVData('GEL')).toThrow(
        'Required columns missing',
      );
    });
    it('should skip rows with empty amounts', async () => {
      (processor as any).rawData = [
        [
          'თარიღი',
          'დანიშნულება',
          'ბრუნვა (დებ)',
          'ბრუნვა (კრ)',
          'ბენეფიციარის სახელი',
        ],
        [
          '01/01/2024',
          'გადახდა - Supermarket 12.34 GEL 01.01.2024',
          '',
          '',
          '',
        ],
      ];
      (XLSX.utils.sheet_to_csv as jest.Mock).mockReturnValue(
        'Date,Payee,Memo,Amount',
      );
      const result = await processor.getProcessedCSVData('GEL');
      expect(result.split('\n').length).toBe(1); // Only header
    });
  });

  describe('edge cases', () => {
    it('should handle empty details gracefully', () => {
      const payee = (processor as any).extractPayee('', '');
      expect(payee).toBe('');
    });
    it('should handle special characters in beneficiary', () => {
      const details = 'Personal Transfer. - ABC123';
      const payee = (processor as any).extractPayee(
        details,
        'Jane & Doe, Inc.',
      );
      expect(payee).toBe('Jane & Doe, Inc.');
    });
  });
});

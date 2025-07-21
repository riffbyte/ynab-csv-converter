/** biome-ignore-all lint/suspicious/noExplicitAny: This is needed for manually setting private properties */
import * as XLSX from 'xlsx';
import { CONSTANTS } from '../constants';
import { BOGStatementProcessor } from '../index';

// Mock XLSX module
jest.mock('xlsx');

describe('BOGStatementProcessor', () => {
  let mockData: string[][];
  let processor: BOGStatementProcessor;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock data as parsed JSON
    mockData = [
      ['Date', 'Details', 'GEL', 'USD', 'EUR', 'GBP'],
      ['01/01/2024', 'Merchant: Test Store', '-100.00', '', '', ''],
      [
        '02/01/2024',
        'Outgoing Transfer - Amount; Beneficiary: John Doe; Account: 123456',
        '',
        '-50.00',
        '',
        '',
      ],
      ['03/01/2024', 'payment service, Netflix', '-25.00', '', '', ''],
      [
        '04/01/2024',
        'Payment - Amount; Test Payment; Date: 04/01/2024',
        '-75.00',
        '',
        '',
        '',
      ],
      [
        '05/01/2024',
        'Incoming Transfer - Amount; Sender: Jane Smith; Account: 654321',
        '200.00',
        '',
        '',
        '',
      ],
      ['06/01/2024', 'Fee - Amount', '-5.00', '', '', ''],
      [
        '07/01/2024',
        'Foreign Exchange; Counter-amount: USD10.00',
        '-25.00',
        '',
        '',
        '',
      ],
      ['08/01/2024', 'Regular Transaction', '30.00', '', '', ''],
    ];

    // Mock XLSX functions
    (XLSX.read as jest.Mock).mockReturnValue({
      Sheets: { [CONSTANTS.transactionsSheetName]: {} },
    });
    (XLSX.utils.sheet_to_json as jest.Mock).mockReturnValue(mockData);
    (XLSX.utils.aoa_to_sheet as jest.Mock).mockReturnValue({});
    (XLSX.utils.sheet_to_csv as jest.Mock).mockReturnValue(
      'Date,Payee,Memo,Amount\n01/01/2024,Test Store,Merchant: Test Store,-100.00\n03/01/2024,Netflix,payment service, Netflix,-25.00\n05/01/2024,Jane Smith,Incoming Transfer - Amount; Sender: Jane Smith; Account: 654321,200.00\n06/01/2024,Bank of Georgia,Fee - Amount,-5.00',
    );

    // Create processor with mock buffer
    const mockFileBuffer = Buffer.from(
      'mock file content',
    ) as unknown as Buffer<ArrayBuffer>;
    processor = new BOGStatementProcessor(mockFileBuffer);

    // Directly set the parsed data
    (processor as any).rawData = mockData;
  });

  describe('constructor', () => {
    it('should create instance with valid file buffer', () => {
      expect(processor).toBeInstanceOf(BOGStatementProcessor);
    });
  });

  describe('extractPayee', () => {
    it('should extract merchant name from merchant pattern', () => {
      const details = 'Merchant: Test Store';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Test Store');
    });

    it('should extract beneficiary name from outgoing transfer', () => {
      const details =
        'Outgoing Transfer - Amount; Beneficiary: John Doe; Account: 123456';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('John Doe');
    });

    it('should extract payee from payment service', () => {
      const details = 'payment service, Netflix';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Netflix');
    });

    it('should extract payee from payment with date', () => {
      const details = 'Payment - Amount; Test Payment; Date: 04/01/2024';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Test Payment');
    });

    it('should extract sender name from incoming transfer', () => {
      const details =
        'Incoming Transfer - Amount; Sender: Jane Smith; Account: 654321';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Jane Smith');
    });

    it('should return special payee for fee transactions', () => {
      const details = 'Fee - Amount';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Bank of Georgia');
    });

    it('should return empty string for unrecognized pattern', () => {
      const details = 'Some random transaction details';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('');
    });

    it('should return empty string for non-string input', () => {
      const payee = (processor as any).extractPayee(null);
      expect(payee).toBe('');
    });
  });

  describe('isCurrencyConversion', () => {
    it('should return true for foreign exchange transactions', () => {
      const details = 'Foreign Exchange; Counter-amount: USD10.00';
      const isConversion = (processor as any).isCurrencyConversion(details);
      expect(isConversion).toBe(true);
    });

    it('should return false for regular transactions', () => {
      const details = 'Regular Transaction';
      const isConversion = (processor as any).isCurrencyConversion(details);
      expect(isConversion).toBe(false);
    });
  });

  describe('parseCounterAmount', () => {
    it('should parse valid counter amount', () => {
      const details = 'Foreign Exchange; Counter-amount: USD10.00';
      const result = (processor as any).parseCounterAmount(details);
      expect(result).toEqual({ currency: 'USD', value: '10.00' });
    });

    it('should parse counter amount without decimal', () => {
      const details = 'Foreign Exchange; Counter-amount: EUR50';
      const result = (processor as any).parseCounterAmount(details);
      expect(result).toEqual({ currency: 'EUR', value: '50' });
    });

    it('should return null for invalid counter amount format', () => {
      const details = 'Foreign Exchange; Counter-amount: invalid';
      const result = (processor as any).parseCounterAmount(details);
      expect(result).toBeNull();
    });

    it('should return null when counter amount is missing', () => {
      const details = 'Foreign Exchange; Some other details';
      const result = (processor as any).parseCounterAmount(details);
      expect(result).toBeNull();
    });
  });

  describe('findMatchingTransaction', () => {
    it('should find matching transaction for currency conversion', () => {
      const conversionDetails = 'Foreign Exchange; Counter-amount: USD10.00';
      const allRows = [
        ['Date', 'Details', 'GEL', 'USD', 'EUR', 'GBP'],
        ['01/01/2024', 'Regular Transaction', '', '-10.00', '', ''],
        [
          '02/01/2024',
          'Foreign Exchange; Counter-amount: USD10.00',
          '-25.00',
          '',
          '',
          '',
        ],
      ];

      const result = (processor as any).findMatchingTransaction(
        conversionDetails,
        allRows,
      );
      expect(result).toEqual({ details: 'Regular Transaction' });
    });

    it('should return null when no matching transaction found', () => {
      const conversionDetails = 'Foreign Exchange; Counter-amount: USD10.00';
      const allRows = [
        ['Date', 'Details', 'GEL', 'USD', 'EUR', 'GBP'],
        ['01/01/2024', 'Regular Transaction', '', '-15.00', '', ''],
        [
          '02/01/2024',
          'Foreign Exchange; Counter-amount: USD10.00',
          '-25.00',
          '',
          '',
          '',
        ],
      ];

      const result = (processor as any).findMatchingTransaction(
        conversionDetails,
        allRows,
      );
      expect(result).toBeNull();
    });

    it('should return null when counter amount cannot be parsed', () => {
      const conversionDetails = 'Foreign Exchange; Invalid counter amount';
      const allRows = [
        ['Date', 'Details', 'GEL', 'USD', 'EUR', 'GBP'],
        ['01/01/2024', 'Regular Transaction', '', '-10.00', '', ''],
      ];

      const result = (processor as any).findMatchingTransaction(
        conversionDetails,
        allRows,
      );
      expect(result).toBeNull();
    });
  });

  describe('getProcessedCSVData', () => {
    it('should process regular transactions correctly', async () => {
      const result = await processor.getProcessedCSVData('GEL');
      expect(result).toContain('Date,Payee,Memo,Amount');
      expect(result).toContain('Test Store');
      expect(result).toContain('Netflix');
      expect(result).toContain('Bank of Georgia');
    });

    it('should handle currency conversion when shouldConvert is true', async () => {
      // Mock the findMatchingTransaction method
      jest.spyOn(processor as any, 'findMatchingTransaction').mockReturnValue({
        details: 'Matching Transaction Details',
      });

      const result = await processor.getProcessedCSVData('GEL', true);
      expect(result).toContain('Date,Payee,Memo,Amount');
    });

    it('should throw error when required columns are missing', () => {
      // Set invalid data without required columns
      (processor as any).rawData = [
        ['Invalid', 'Columns'],
        ['01/01/2024', 'Test'],
      ];

      expect(() => processor.getProcessedCSVData('GEL')).toThrow(
        'Required columns missing',
      );
    });

    it('should skip rows with empty amounts', async () => {
      const result = await processor.getProcessedCSVData('GEL');
      const lines = result.split('\n');
      // Should only have header + rows with amounts
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should work with different currencies', async () => {
      const result = await processor.getProcessedCSVData('USD');
      expect(result).toContain('Date,Payee,Memo,Amount');
    });
  });

  describe('edge cases', () => {
    it('should handle empty details gracefully', () => {
      const payee = (processor as any).extractPayee('');
      expect(payee).toBe('');
    });

    it('should handle special characters in payee names', () => {
      const details = 'Merchant: Test & Store, Inc.';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Test & Store');
    });

    it('should handle multiple semicolons in details', () => {
      const details =
        'Payment - Amount; Test Payment; Date: 04/01/2024; Extra: Info';
      const payee = (processor as any).extractPayee(details);
      expect(payee).toBe('Test Payment');
    });
  });
});

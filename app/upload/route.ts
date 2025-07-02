import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { BaseStatementProcessor } from '@/lib/processors/base';

function extractPayee(details: string): string {
  if (typeof details !== 'string') return '';

  if (details.includes('Merchant: ')) {
    const match = details.match(/Merchant: ([^,;]+)/);
    return match?.[1] || '';
  } else if (details.includes('Outgoing Transfer - Amount')) {
    const match = details.match(/Beneficiary: ([^;]+)/);
    return match?.[1] || '';
  } else if (details.includes('Fee - Amount')) {
    return 'SOLO';
  } else if (details.includes('payment service')) {
    const match = details.match(/payment service, ([^,]+)/);
    return match?.[1] || '';
  } else if (
    details.includes('Payment - Amount') &&
    details.includes('Date:')
  ) {
    const match = details.match(/; ([^;]+); Date:/);
    return match?.[1] || '';
  } else if (details.includes('Incoming Transfer - Amount')) {
    const match = details.match(/Sender: ([^;]+); Account/);
    return match?.[1] || '';
  }

  return '';
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const fileName = file.name;
  const baseName = path.parse(fileName).name; // Remove .xlsx
  const outputFileName = `${baseName}.csv`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const processor = new BaseStatementProcessor(buffer, 'Transactions');

    const dateIdx = processor.getColumnIndex('Date');
    const detailsIdx = processor.getColumnIndex('Details');
    const amountIdx = processor.getColumnIndex('GEL');

    if (dateIdx === -1 || detailsIdx === -1 || amountIdx === -1) {
      return NextResponse.json(
        { error: 'Required columns missing' },
        { status: 400 },
      );
    }

    processor.processRows((row) => {
      const date = row[dateIdx];
      const details = row[detailsIdx];
      const amount = row[amountIdx];

      if (amount === undefined || amount === null || amount === '') return null;

      const payee = extractPayee(details);

      return [date, payee, details, amount];
    });

    const csvData = processor.getCSVData();

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
      },
    });
  } catch (err) {
    console.error(err);

    if (err instanceof Error && err.cause === 'Invalid data') {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to process Excel file' },
      { status: 500 },
    );
  }
}

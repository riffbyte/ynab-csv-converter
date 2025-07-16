import path from 'node:path';
import { type NextRequest, NextResponse } from 'next/server';
import { BOGStatementProcessor } from '@/lib/processors/bog';
import { CONSTANTS } from '@/lib/processors/bog/constants';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const currency = formData.get('currency') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!currency || !CONSTANTS.isValidCurrency(currency)) {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  }

  const fileName = file.name;
  const baseName = path.parse(fileName).name; // Remove .xlsx
  const outputFileName = `${baseName}.csv`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const processor = new BOGStatementProcessor(buffer);

    const csvData = processor.getProcessedCSVData(currency);

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

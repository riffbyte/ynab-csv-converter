import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import path from 'path';

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
  } else if (details.includes('Payment - Amount') && details.includes('Date:')) {
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
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheet = workbook.Sheets['Transactions'];
    if (!sheet) {
      return NextResponse.json({ error: 'Sheet "Transactions" not found' }, { status: 400 });
    }

    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = rawData[0];
    const dateIdx = headers.indexOf('Date');
    const detailsIdx = headers.indexOf('Details');
    const amountIdx = headers.indexOf('GEL');

    if (dateIdx === -1 || detailsIdx === -1 || amountIdx === -1) {
      return NextResponse.json({ error: 'Required columns missing' }, { status: 400 });
    }

    const result = [['Date', 'Payee', 'Memo', 'Amount']];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const date = row[dateIdx];
      const details = row[detailsIdx];
      const amount = row[amountIdx];

      if (amount === undefined || amount === null || amount === '') continue;

      const payee = extractPayee(details);
      result.push([date, payee, details, amount]);
    }

    const csvSheet = XLSX.utils.aoa_to_sheet(result);
    const csvData = XLSX.utils.sheet_to_csv(csvSheet);

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${outputFileName}"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to process Excel file' }, { status: 500 });
  }
}

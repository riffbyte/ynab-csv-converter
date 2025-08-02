import { type NextRequest, NextResponse } from 'next/server';
import { processFormData } from '@/lib/processors/processFormData';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  try {
    const { csvData, preview, outputFileName } =
      await processFormData(formData);

    return new NextResponse(
      JSON.stringify({ csvData, preview, outputFileName }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
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

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
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.cause === 'Invalid data') {
      return NextResponse.json(
        { message: error.message, error },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: 'Failed to process Excel file', error },
      { status: 500 },
    );
  }
}

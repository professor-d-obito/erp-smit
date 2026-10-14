import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { AssessmentIngestionService } from '@/lib/services/assessment-ingestion.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await AssessmentIngestionService.ingestMarksFromBuffer(id, buffer);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Validation failed on uploaded marks file',
          errors: result.errors,
          totalRows: result.totalRows,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated marks for ${result.savedEntries} items`,
      totalRows: result.totalRows,
      savedEntries: result.savedEntries,
    });
  } catch (error: any) {
    console.error('Error ingesting marks sheet:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

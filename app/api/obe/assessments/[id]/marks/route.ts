import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assessmentId } = await params;
    const body = await req.json();
    const { marks } = body; // Array of { questionId, rosterId, marksObtained, isAbsent, isMalpractice }

    if (!marks || !Array.isArray(marks)) {
      return NextResponse.json({ error: 'Invalid marks payload' }, { status: 400 });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (assessment.isLocked) {
      return NextResponse.json({ error: 'Assessment is locked for editing' }, { status: 400 });
    }

    // Atomic batch upsert
    await prisma.$transaction(
      marks.map((entry: any) =>
        prisma.markEntry.upsert({
          where: {
            questionId_rosterId: {
              questionId: entry.questionId,
              rosterId: entry.rosterId,
            },
          },
          create: {
            questionId: entry.questionId,
            rosterId: entry.rosterId,
            marksObtained: entry.marksObtained !== undefined ? entry.marksObtained : null,
            isAbsent: Boolean(entry.isAbsent),
            isMalpractice: Boolean(entry.isMalpractice),
          },
          update: {
            marksObtained: entry.marksObtained !== undefined ? entry.marksObtained : null,
            isAbsent: Boolean(entry.isAbsent),
            isMalpractice: Boolean(entry.isMalpractice),
          },
        })
      )
    );

    return NextResponse.json({ success: true, savedCount: marks.length });
  } catch (error: any) {
    console.error('Error saving marks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

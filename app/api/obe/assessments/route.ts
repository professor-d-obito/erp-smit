import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin, isHOD } from '@/lib/permissions';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      assignmentId,
      title,
      category,
      maxTotalMarks,
      weightage,
      conductedDate,
      questions, // array of { questionNumber, partSection, maxMarks, coId, bloomsLevel }
    } = body;

    if (!assignmentId || !title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Missing required assessment parameters' }, { status: 400 });
    }

    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: { id: assignmentId },
      include: { subject: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Role verification
    if (!isSuperAdmin(user) && !isHOD(user) && assignment.facultyId !== user.id) {
      return NextResponse.json({ error: 'Forbidden: You cannot modify this course assessment' }, { status: 403 });
    }

    // Create assessment with questions in atomic transaction
    const assessment = await prisma.$transaction(async (tx) => {
      const createdAssessment = await tx.assessment.create({
        data: {
          assignmentId,
          title,
          category: category || 'IAT_1',
          maxTotalMarks: Number(maxTotalMarks) || 50,
          weightage: Number(weightage) || 20,
          conductedDate: conductedDate ? new Date(conductedDate) : null,
        },
      });

      for (const q of questions) {
        await tx.questionMapping.create({
          data: {
            assessmentId: createdAssessment.id,
            questionNumber: q.questionNumber,
            partSection: q.partSection || 'PART_A',
            maxMarks: Number(q.maxMarks) || 2,
            coId: q.coId,
            bloomsLevel: q.bloomsLevel || 'K2_UNDERSTAND',
          },
        });
      }

      return tx.assessment.findUnique({
        where: { id: createdAssessment.id },
        include: {
          questions: {
            include: { co: true },
            orderBy: { questionNumber: 'asc' },
          },
        },
      });
    });

    return NextResponse.json({ success: true, assessment });
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

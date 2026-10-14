import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin, isHOD } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        assignment: {
          include: {
            subject: {
              include: {
                courseOutcomes: true,
              },
            },
            roster: {
              include: { student: true },
              orderBy: { student: { rollNumber: 'asc' } },
            },
          },
        },
        questions: {
          include: {
            co: true,
            marks: true,
          },
          orderBy: { questionNumber: 'asc' },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    return NextResponse.json({ assessment });
  } catch (error: any) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.assessment.update({
      where: { id },
      data: {
        title: body.title,
        maxTotalMarks: body.maxTotalMarks !== undefined ? Number(body.maxTotalMarks) : undefined,
        weightage: body.weightage !== undefined ? Number(body.weightage) : undefined,
        isLocked: body.isLocked !== undefined ? Boolean(body.isLocked) : undefined,
      },
    });

    return NextResponse.json({ success: true, assessment: updated });
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.assessment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Assessment deleted' });
  } catch (error: any) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

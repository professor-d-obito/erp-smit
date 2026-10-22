import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (err: any) {
    console.error('Exams GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve exam sessions.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      examType = 'SEMESTER',
      academicYear = '2026-2027',
      semester = 1,
      startDate,
      endDate,
      isPublished = false,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Exam title is required.' }, { status: 400 });
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        examType,
        academicYear,
        semester: Number(semester),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isPublished: Boolean(isPublished),
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'EXAM_SESSION_CREATED',
      category: 'EXAMINATIONS',
      details: `Created exam session: ${title} (${examType}, ${academicYear}, Sem ${semester}).`,
    });

    return NextResponse.json({ success: true, data: exam });
  } catch (err: any) {
    console.error('Exam POST error:', err);
    return NextResponse.json({ error: 'Failed to create exam session.' }, { status: 500 });
  }
}

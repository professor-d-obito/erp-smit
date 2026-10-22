import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin, isHOD } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const structures = await prisma.feeStructure.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, code: true, name: true } },
        department: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: structures });
  } catch (err: any) {
    console.error('FeeStructures GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve fee structures.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      academicYear,
      courseId,
      departmentId,
      semester,
      category = 'TUITION',
      amount,
      dueDate,
      description,
    } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required.' }, { status: 400 });
    }

    const structure = await prisma.feeStructure.create({
      data: {
        title,
        academicYear: academicYear || '2026-2027',
        courseId: courseId || null,
        departmentId: departmentId || null,
        semester: semester ? Number(semester) : null,
        category,
        amount: Number(amount),
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
      },
      include: {
        course: true,
        department: true,
      },
    });

    return NextResponse.json({ success: true, data: structure });
  } catch (err: any) {
    console.error('FeeStructure POST error:', err);
    return NextResponse.json({ error: 'Failed to create fee structure.' }, { status: 500 });
  }
}

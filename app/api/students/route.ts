import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin, isHOD, isStaff } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');
    const section = searchParams.get('section');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    // Branch Isolation Enforcement:
    // HODs and Staff are strictly restricted to their departmentId
    let effectiveDeptId = departmentId;
    if ((isHOD(user) || isStaff(user)) && user.departmentId) {
      effectiveDeptId = user.departmentId;
    }

    const whereCondition: any = {
      ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      ...(courseId ? { courseId } : {}),
      ...(semester ? { semester: parseInt(semester, 10) } : {}),
      ...(section ? { section } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { rollNumber: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };

    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { rollNumber: 'asc' },
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
        },
      }),
      prisma.student.count({ where: whereCondition }),
    ]);

    return NextResponse.json({
      data: students,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    console.error('Students GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve student directory.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    // Only Principal, HODs, or Staff can add students
    if (!isSuperAdmin(currentUser) && !isHOD(currentUser) && !isStaff(currentUser)) {
      return NextResponse.json({ error: 'Forbidden. Permission denied to create student records.' }, { status: 403 });
    }

    const body = await req.json();
    const { rollNumber, name, email, phone, departmentId, courseId, semester, section, batch } = body;

    if (!rollNumber || !name || !courseId) {
      return NextResponse.json(
        { error: 'Roll Number, Student Name, and Course are required fields.' },
        { status: 400 }
      );
    }

    // Branch Isolation Enforcement: HOD/Staff can only enroll students in their own department
    let targetDeptId = departmentId;
    if ((isHOD(currentUser) || isStaff(currentUser)) && currentUser.departmentId) {
      targetDeptId = currentUser.departmentId;
    }

    if (!targetDeptId) {
      return NextResponse.json({ error: 'Department ID is required to enroll a student.' }, { status: 400 });
    }

    // Check duplicate roll number
    const existing = await prisma.student.findUnique({
      where: { rollNumber: rollNumber.trim() },
    });

    if (existing) {
      return NextResponse.json({ error: `Student with roll number ${rollNumber} already exists.` }, { status: 400 });
    }

    const newStudent = await prisma.student.create({
      data: {
        rollNumber: rollNumber.trim(),
        name: name.trim(),
        email: email ? email.trim().toLowerCase() : null,
        phone: phone || null,
        departmentId: targetDeptId,
        courseId,
        semester: semester ? parseInt(semester, 10) : 1,
        section: section || 'A',
        batch: batch || '2026-2030',
        status: 'ACTIVE',
      },
      include: {
        department: true,
        course: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'STUDENT_CREATED',
      category: 'STUDENTS',
      details: `Enrolled new student ${newStudent.name} (${newStudent.rollNumber}) in department ${newStudent.department.code}.`,
    });

    return NextResponse.json({ success: true, data: newStudent });
  } catch (err: any) {
    console.error('Student POST error:', err);
    return NextResponse.json({ error: 'Failed to create student record.' }, { status: 500 });
  }
}

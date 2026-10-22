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
    const departmentId = searchParams.get('departmentId');
    const subjectId = searchParams.get('subjectId');
    const dateStr = searchParams.get('date');
    const hourStr = searchParams.get('hour');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const skip = (page - 1) * limit;

    // Department Isolation: HOD and Staff are restricted to their departmentId
    let effectiveDeptId = departmentId;
    if ((isHOD(user) || isStaff(user)) && user.departmentId) {
      effectiveDeptId = user.departmentId;
    }

    let dateFilter: any = {};
    if (dateStr) {
      const parsed = new Date(dateStr);
      const startOfDay = new Date(parsed);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(parsed);
      endOfDay.setHours(23, 59, 59, 999);
      dateFilter = {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    const whereCondition: any = {
      ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(hourStr ? { hour: parseInt(hourStr, 10) } : {}),
      ...dateFilter,
    };

    const [records, totalCount] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, rollNumber: true, name: true, section: true } },
          subject: { select: { id: true, code: true, name: true } },
          department: { select: { id: true, code: true, name: true } },
          markedByUser: { select: { id: true, name: true, employeeId: true } },
        },
      }),
      prisma.attendanceRecord.count({ where: whereCondition }),
    ]);

    return NextResponse.json({
      data: records,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    console.error('Attendance GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve attendance records.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const { studentId, subjectId, status, date, remarks, hour = 1 } = body;

    if (!studentId || !status) {
      return NextResponse.json({ error: 'Student ID and Attendance Status are required.' }, { status: 400 });
    }

    // Verify target student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json({ error: 'Target student not found.' }, { status: 404 });
    }

    // Branch Isolation Enforcement: HOD/Staff can only mark attendance for students in their department
    if (!isSuperAdmin(currentUser) && currentUser.departmentId !== student.departmentId) {
      return NextResponse.json(
        { error: 'Forbidden. You can only mark attendance for students in your assigned department.' },
        { status: 403 }
      );
    }

    const attendanceRecord = await prisma.attendanceRecord.create({
      data: {
        studentId: student.id,
        subjectId: subjectId || null,
        departmentId: student.departmentId,
        markedByUserId: currentUser.id,
        date: date ? new Date(date) : new Date(),
        hour: Number(hour) || 1,
        status, // PRESENT, ABSENT, LATE, ON_DUTY
        remarks: remarks || null,
      },
      include: {
        student: true,
        subject: true,
        department: true,
      },
    });

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'ATTENDANCE_MARKED',
      category: 'ATTENDANCE',
      details: `Marked attendance (${status}) for student ${student.name} (${student.rollNumber}) by ${currentUser.name}.`,
    });

    return NextResponse.json({ success: true, data: attendanceRecord });
  } catch (err: any) {
    console.error('Attendance POST error:', err);
    return NextResponse.json({ error: 'Failed to mark attendance record.' }, { status: 500 });
  }
}

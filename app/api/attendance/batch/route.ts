import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin, isHOD, isStaff } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

interface BatchAttendanceItem {
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_DUTY';
  remarks?: string;
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      records,
      subjectId,
      departmentId,
      date,
      hour = 1,
    }: {
      records: BatchAttendanceItem[];
      subjectId?: string;
      departmentId?: string;
      date?: string;
      hour?: number;
    } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'At least one student attendance record is required.' },
        { status: 400 }
      );
    }

    const targetDate = date ? new Date(date) : new Date();
    // Normalize date window for the day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const studentIds = records.map((r) => r.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, name: true, rollNumber: true, departmentId: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s]));

    // Department isolation check: HOD or Staff can only mark students in their assigned department
    if (!isSuperAdmin(currentUser) && currentUser.departmentId) {
      const unauthorizedStudent = students.find((s) => s.departmentId !== currentUser.departmentId);
      if (unauthorizedStudent) {
        return NextResponse.json(
          {
            error: `Access Denied: You cannot mark attendance for student ${unauthorizedStudent.name} outside your department.`,
          },
          { status: 403 }
        );
      }
    }

    // Find any existing attendance records for these students on this date & hour
    const existingRecords = await prisma.attendanceRecord.findMany({
      where: {
        studentId: { in: studentIds },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        hour: hour,
        ...(subjectId ? { subjectId } : {}),
      },
    });

    const existingMap = new Map(existingRecords.map((r) => [r.studentId, r]));

    let createdCount = 0;
    let updatedCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let onDutyCount = 0;

    for (const item of records) {
      const student = studentMap.get(item.studentId);
      if (!student) continue;

      if (item.status === 'PRESENT') presentCount++;
      else if (item.status === 'ABSENT') absentCount++;
      else if (item.status === 'LATE') lateCount++;
      else if (item.status === 'ON_DUTY') onDutyCount++;

      const existing = existingMap.get(item.studentId);

      if (existing) {
        await prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            status: item.status,
            remarks: item.remarks || null,
            markedByUserId: currentUser.id,
            subjectId: subjectId || existing.subjectId,
            hour,
          },
        });
        updatedCount++;
      } else {
        await prisma.attendanceRecord.create({
          data: {
            studentId: student.id,
            departmentId: student.departmentId,
            subjectId: subjectId || null,
            markedByUserId: currentUser.id,
            date: targetDate,
            hour,
            status: item.status,
            remarks: item.remarks || null,
          },
        });
        createdCount++;
      }
    }

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'BATCH_ATTENDANCE_MARKED',
      category: 'ATTENDANCE',
      details: `Teacher ${currentUser.name} logged batch attendance for ${records.length} students (Present: ${presentCount}, Absent: ${absentCount}, Late: ${lateCount}, OD: ${onDutyCount}) on ${targetDate.toLocaleDateString()} (Hour ${hour}).`,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed attendance for ${records.length} students.`,
      stats: {
        total: records.length,
        created: createdCount,
        updated: updatedCount,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        onDuty: onDutyCount,
      },
    });
  } catch (err: any) {
    console.error('Batch Attendance Error:', err);
    return NextResponse.json(
      { error: 'Failed to record batch attendance. Please check input data.' },
      { status: 500 }
    );
  }
}

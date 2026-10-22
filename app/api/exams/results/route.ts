import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { isSuperAdmin, isHOD, isStaff } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';

function calculateGrade(totalMarks: number, isAbsent: boolean): { grade: string; gradePoint: number; resultStatus: string } {
  if (isAbsent) {
    return { grade: 'AB', gradePoint: 0.0, resultStatus: 'AB' };
  }
  if (totalMarks >= 91) return { grade: 'O', gradePoint: 10.0, resultStatus: 'PASS' };
  if (totalMarks >= 81) return { grade: 'A+', gradePoint: 9.0, resultStatus: 'PASS' };
  if (totalMarks >= 71) return { grade: 'A', gradePoint: 8.0, resultStatus: 'PASS' };
  if (totalMarks >= 61) return { grade: 'B+', gradePoint: 7.0, resultStatus: 'PASS' };
  if (totalMarks >= 56) return { grade: 'B', gradePoint: 6.0, resultStatus: 'PASS' };
  if (totalMarks >= 50) return { grade: 'C', gradePoint: 5.0, resultStatus: 'PASS' };
  return { grade: 'RA', gradePoint: 0.0, resultStatus: 'RA' };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const subjectId = searchParams.get('subjectId');
    const studentId = searchParams.get('studentId');
    const departmentId = searchParams.get('departmentId');
    const courseId = searchParams.get('courseId');
    const semester = searchParams.get('semester');

    // Department Isolation
    let effectiveDeptId = departmentId;
    if ((isHOD(user) || isStaff(user)) && user.departmentId) {
      effectiveDeptId = user.departmentId;
    }

    const whereCondition: any = {
      ...(examId ? { examId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(studentId ? { studentId } : {}),
      student: {
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
        ...(courseId ? { courseId } : {}),
        ...(semester ? { semester: Number(semester) } : {}),
      },
    };

    const results = await prisma.examResult.findMany({
      where: whereCondition,
      orderBy: [{ student: { rollNumber: 'asc' } }],
      include: {
        exam: { select: { id: true, title: true, examType: true, academicYear: true, semester: true } },
        student: {
          select: {
            id: true,
            rollNumber: true,
            name: true,
            semester: true,
            section: true,
            department: { select: { code: true, name: true } },
            course: { select: { code: true, name: true } },
          },
        },
        subject: { select: { id: true, code: true, name: true, credits: true } },
        enteredByUser: { select: { id: true, name: true, employeeId: true } },
      },
    });

    // Statistical Analytics
    const totalCount = results.length;
    const passedCount = results.filter((r) => r.resultStatus === 'PASS').length;
    const failedCount = results.filter((r) => r.resultStatus === 'RA').length;
    const absentCount = results.filter((r) => r.resultStatus === 'AB').length;
    const passPercentage = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;
    const averageMarks =
      totalCount > 0
        ? Math.round(
            (results.reduce((acc, r) => acc + (r.resultStatus !== 'AB' ? r.totalMarks : 0), 0) /
              (totalCount - absentCount || 1)) *
              10
          ) / 10
        : 0;

    return NextResponse.json({
      success: true,
      data: results,
      stats: {
        totalEvaluated: totalCount,
        passed: passedCount,
        failed: failedCount,
        absent: absentCount,
        passPercentage,
        averageMarks,
      },
    });
  } catch (err: any) {
    console.error('ExamResults GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve exam results.' }, { status: 500 });
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
      examId,
      subjectId,
      results,
    }: {
      examId: string;
      subjectId: string;
      results: {
        studentId: string;
        internalMarks?: number;
        externalMarks?: number;
        isAbsent?: boolean;
        remarks?: string;
      }[];
    } = body;

    if (!examId || !subjectId || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Exam ID, Subject ID, and student mark entries are required.' },
        { status: 400 }
      );
    }

    // Verify Subject Credits
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });
    const credits = subject?.credits || 3;

    let savedCount = 0;
    let passedCount = 0;
    let failedCount = 0;

    for (const item of results) {
      const isAbsent = Boolean(item.isAbsent);
      const internal = Number(item.internalMarks) || 0;
      const external = Number(item.externalMarks) || 0;
      const totalMarks = Math.min(100, isAbsent ? 0 : internal + external);

      const { grade, gradePoint, resultStatus } = calculateGrade(totalMarks, isAbsent);
      if (resultStatus === 'PASS') passedCount++;
      else if (resultStatus === 'RA') failedCount++;

      // Upsert into ExamResult
      await prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId,
            studentId: item.studentId,
            subjectId,
          },
        },
        create: {
          examId,
          studentId: item.studentId,
          subjectId,
          internalMarks: internal,
          externalMarks: external,
          totalMarks,
          maxMarks: 100.0,
          grade,
          gradePoint,
          credits,
          resultStatus,
          remarks: item.remarks || null,
          enteredByUserId: currentUser.id,
        },
        update: {
          internalMarks: internal,
          externalMarks: external,
          totalMarks,
          grade,
          gradePoint,
          credits,
          resultStatus,
          remarks: item.remarks || null,
          enteredByUserId: currentUser.id,
        },
      });

      savedCount++;
    }

    await createAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      action: 'EXAM_MARKS_RECORDED',
      category: 'EXAMINATIONS',
      details: `Teacher ${currentUser.name} recorded marks for ${savedCount} students in subject ${subject?.code || subjectId}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully recorded marks for ${savedCount} students.`,
      stats: {
        total: savedCount,
        passed: passedCount,
        failed: failedCount,
        passPercentage: savedCount > 0 ? Math.round((passedCount / savedCount) * 100) : 0,
      },
    });
  } catch (err: any) {
    console.error('ExamResults POST error:', err);
    return NextResponse.json({ error: 'Failed to record exam marks.' }, { status: 500 });
  }
}

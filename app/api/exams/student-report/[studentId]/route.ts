import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized session.' }, { status: 401 });
    }

    const { studentId } = await params;
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
        course: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const whereCondition: any = {
      studentId,
      ...(examId ? { examId } : {}),
    };

    const results = await prisma.examResult.findMany({
      where: whereCondition,
      include: {
        subject: true,
        exam: true,
      },
      orderBy: { subject: { code: 'asc' } },
    });

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        student,
        exam: null,
        results: [],
        metrics: {
          totalCredits: 0,
          earnedCredits: 0,
          totalPoints: 0,
          sgpa: 0,
          overallResult: 'NO_RECORDS',
        },
      });
    }

    const exam = results[0]?.exam || null;

    let totalCredits = 0;
    let earnedCredits = 0;
    let totalPoints = 0;
    let arrearsCount = 0;

    const subjectsSummary = results.map((r) => {
      const cr = r.credits || 3;
      totalCredits += cr;
      if (r.resultStatus === 'PASS') {
        earnedCredits += cr;
        totalPoints += cr * r.gradePoint;
      } else {
        arrearsCount++;
      }

      return {
        id: r.id,
        subjectCode: r.subject.code,
        subjectName: r.subject.name,
        subjectType: r.subject.courseType,
        credits: cr,
        internalMarks: r.internalMarks,
        externalMarks: r.externalMarks,
        totalMarks: r.totalMarks,
        grade: r.grade,
        gradePoint: r.gradePoint,
        qualityPoints: cr * r.gradePoint,
        resultStatus: r.resultStatus,
        remarks: r.remarks,
      };
    });

    const sgpa = totalCredits > 0 ? Math.round((totalPoints / totalCredits) * 100) / 100 : 0;
    const overallResult =
      arrearsCount === 0
        ? sgpa >= 8.5
          ? 'FIRST CLASS WITH DISTINCTION'
          : sgpa >= 6.5
          ? 'FIRST CLASS'
          : 'SECOND CLASS'
        : `REAPPEAR (${arrearsCount} ARREAR${arrearsCount > 1 ? 'S' : ''})`;

    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        department: student.department.name,
        departmentCode: student.department.code,
        course: student.course.name,
        courseCode: student.course.code,
        semester: student.semester,
        section: student.section,
        batch: student.batch,
      },
      exam: exam
        ? {
            id: exam.id,
            title: exam.title,
            examType: exam.examType,
            academicYear: exam.academicYear,
            semester: exam.semester,
          }
        : null,
      results: subjectsSummary,
      metrics: {
        totalCredits,
        earnedCredits,
        totalPoints,
        sgpa,
        overallResult,
        arrearsCount,
      },
    });
  } catch (err: any) {
    console.error('Student Report GET error:', err);
    return NextResponse.json(
      { error: 'Failed to generate student report card.' },
      { status: 500 }
    );
  }
}

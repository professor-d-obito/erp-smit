import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSuperAdmin, isHOD } from '@/lib/permissions';

/**
 * GET /api/obe/assignments
 * Returns faculty course assignments:
 * - Super Admin: All assignments
 * - HOD: Department course assignments
 * - Faculty/Staff: Courses assigned to current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const academicYear = searchParams.get('academicYear') || '2024-2025';

    let whereClause: any = { academicYear };

    if (!isSuperAdmin(user)) {
      if (isHOD(user)) {
        // HOD sees assignments in their department
        const staffProfile = await prisma.staffProfile.findUnique({
          where: { userId: user.id },
        });
        if (staffProfile?.departmentId) {
          whereClause.subject = { departmentId: staffProfile.departmentId };
        }
      } else {
        // Faculty sees only their assigned courses
        whereClause.facultyId = user.id;
      }
    } else if (departmentId) {
      whereClause.subject = { departmentId };
    }

    const assignments = await prisma.facultyCourseAssignment.findMany({
      where: whereClause,
      include: {
        faculty: { select: { id: true, name: true, employeeId: true, email: true } },
        subject: {
          include: {
            department: { select: { id: true, code: true, name: true } },
            course: { select: { id: true, code: true, name: true } },
            courseOutcomes: { select: { id: true, code: true, bloomsLevel: true } },
          },
        },
        _count: {
          select: {
            roster: true,
            assessments: true,
            attendanceSessions: true,
          },
        },
      },
      orderBy: [
        { subject: { code: 'asc' } },
        { section: 'asc' },
      ],
    });

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Error fetching OBE assignments:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/obe/assignments
 * Assigns faculty to a course/section and seeds the student roster from department/course/section
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin or HOD can assign courses
    if (!isSuperAdmin(user) && !isHOD(user)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
    }

    const body = await req.json();
    const { facultyId, subjectId, academicYear, semester, section, courseType } = body;

    if (!facultyId || !subjectId || !academicYear || !semester || !section) {
      return NextResponse.json({ error: 'Missing required assignment fields' }, { status: 400 });
    }

    // Upsert assignment
    const assignment = await prisma.facultyCourseAssignment.upsert({
      where: {
        facultyId_subjectId_academicYear_semester_section: {
          facultyId,
          subjectId,
          academicYear,
          semester: Number(semester),
          section,
        },
      },
      create: {
        facultyId,
        subjectId,
        academicYear,
        semester: Number(semester),
        section,
        courseType: courseType || 'THEORY',
      },
      update: {
        courseType: courseType || 'THEORY',
      },
      include: {
        subject: true,
      },
    });

    // Auto-enroll eligible students in this department & semester into course roster
    const matchingStudents = await prisma.student.findMany({
      where: {
        departmentId: assignment.subject.departmentId,
        semester: Number(semester),
        section,
        status: 'ACTIVE',
      },
    });

    for (const student of matchingStudents) {
      await prisma.courseRoster.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: assignment.id,
            studentId: student.id,
          },
        },
        create: {
          assignmentId: assignment.id,
          studentId: student.id,
        },
        update: {},
      });
    }

    return NextResponse.json({
      success: true,
      assignment,
      enrolledStudentsCount: matchingStudents.length,
    });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

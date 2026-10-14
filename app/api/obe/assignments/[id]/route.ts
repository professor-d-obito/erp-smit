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

    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: { id },
      include: {
        faculty: { select: { id: true, name: true, employeeId: true, email: true } },
        subject: {
          include: {
            department: true,
            course: true,
            courseOutcomes: {
              include: {
                poMappings: {
                  include: { po: true },
                },
              },
              orderBy: { code: 'asc' },
            },
          },
        },
        roster: {
          include: {
            student: true,
          },
          orderBy: { student: { rollNumber: 'asc' } },
        },
        assessments: {
          include: {
            questions: {
              include: { co: true },
              orderBy: { questionNumber: 'asc' },
            },
            _count: {
              select: { questions: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        attendanceSessions: {
          include: {
            _count: { select: { records: true } },
          },
          orderBy: [{ date: 'desc' }, { hour: 'asc' }],
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Course assignment not found' }, { status: 404 });
    }

    // Access check: Faculty can only access their own, HOD within department, Super Admin all
    if (!isSuperAdmin(user)) {
      if (isHOD(user)) {
        const staff = await prisma.staffProfile.findUnique({ where: { userId: user.id } });
        if (staff?.departmentId && staff.departmentId !== assignment.subject.departmentId) {
          return NextResponse.json({ error: 'Forbidden: Access restricted to your department' }, { status: 403 });
        }
      } else if (assignment.facultyId !== user.id) {
        return NextResponse.json({ error: 'Forbidden: You are not assigned to this course' }, { status: 403 });
      }
    }

    // Also fetch all available Program Outcomes for mapping reference
    const programOutcomes = await prisma.programOutcome.findMany({
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    });

    return NextResponse.json({
      assignment,
      programOutcomes,
    });
  } catch (error: any) {
    console.error('Error fetching assignment details:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

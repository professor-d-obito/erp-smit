import { prisma } from '@/lib/db';

export interface MarkAttendanceDto {
  assignmentId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  hour: number; // 1..8
  sessionTopic?: string;
  conductedById: string;
  records: {
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'MEDICAL_LEAVE';
    remarks?: string;
  }[];
}

export class AttendanceEngineService {
  /**
   * Records or updates an hour-wise attendance session
   */
  static async recordSessionAttendance(dto: MarkAttendanceDto) {
    const sessionDate = new Date(dto.date);
    // Normalize to date boundary
    sessionDate.setHours(0, 0, 0, 0);

    return await prisma.$transaction(async (tx) => {
      // 1. Create or update session header
      const session = await tx.attendanceSession.upsert({
        where: {
          assignmentId_date_hour: {
            assignmentId: dto.assignmentId,
            date: sessionDate,
            hour: dto.hour,
          },
        },
        create: {
          assignmentId: dto.assignmentId,
          date: sessionDate,
          hour: dto.hour,
          sessionTopic: dto.sessionTopic || '',
          conductedById: dto.conductedById,
        },
        update: {
          sessionTopic: dto.sessionTopic || '',
          conductedById: dto.conductedById,
        },
      });

      // 2. Upsert each student record
      for (const rec of dto.records) {
        await tx.attendanceSessionRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: session.id,
              studentId: rec.studentId,
            },
          },
          create: {
            sessionId: session.id,
            studentId: rec.studentId,
            status: rec.status,
            remarks: rec.remarks,
          },
          update: {
            status: rec.status,
            remarks: rec.remarks,
          },
        });
      }

      return session;
    });
  }

  /**
   * Returns all sessions for an assignment
   */
  static async getAssignmentSessions(assignmentId: string) {
    return await prisma.attendanceSession.findMany({
      where: { assignmentId },
      include: {
        records: {
          include: { student: true },
        },
      },
      orderBy: [{ date: 'desc' }, { hour: 'asc' }],
    });
  }

  /**
   * Computes Anna University semester detention & compliance report
   */
  static async getDetentionAuditReport(assignmentId: string) {
    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: true,
        roster: {
          include: { student: true },
          orderBy: { student: { rollNumber: 'asc' } },
        },
        attendanceSessions: {
          include: { records: true },
        },
      },
    });

    if (!assignment) throw new Error('Assignment record not found');

    const totalHours = assignment.attendanceSessions.length;

    const report = assignment.roster.map((r) => {
      let attended = 0;
      let onDuty = 0;
      let medical = 0;
      let absent = 0;

      assignment.attendanceSessions.forEach((session) => {
        const rec = session.records.find((rec) => rec.studentId === r.student.id);
        if (!rec || rec.status === 'PRESENT') {
          attended++;
        } else if (rec.status === 'ON_DUTY') {
          attended++;
          onDuty++;
        } else if (rec.status === 'MEDICAL_LEAVE') {
          medical++;
        } else if (rec.status === 'ABSENT') {
          absent++;
        }
      });

      const percentage = totalHours > 0 ? (attended / totalHours) * 100.0 : 100.0;

      let status: 'ELIGIBLE' | 'CONDONATION' | 'DETAINED' = 'ELIGIBLE';
      if (percentage < 65.0) {
        status = 'DETAINED';
      } else if (percentage < 75.0) {
        status = 'CONDONATION';
      }

      return {
        studentId: r.student.id,
        rollNumber: r.student.rollNumber,
        name: r.student.name,
        totalHours,
        attendedHours: attended,
        onDutyHours: onDuty,
        medicalHours: medical,
        absentHours: absent,
        percentage: Number(percentage.toFixed(2)),
        status,
      };
    });

    const detainedCount = report.filter((r) => r.status === 'DETAINED').length;
    const condonationCount = report.filter((r) => r.status === 'CONDONATION').length;
    const eligibleCount = report.filter((r) => r.status === 'ELIGIBLE').length;

    return {
      assignmentInfo: {
        subjectCode: assignment.subject.code,
        subjectName: assignment.subject.name,
        semester: assignment.semester,
        section: assignment.section,
        totalConductedHours: totalHours,
      },
      stats: {
        totalStudents: report.length,
        eligibleCount,
        condonationCount,
        detainedCount,
      },
      students: report,
    };
  }
}

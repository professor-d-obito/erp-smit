import { prisma } from '@/lib/db';

export interface COAttainmentSummary {
  coId: string;
  coCode: string;
  description: string;
  bloomsLevel: string;
  totalQuestions: number;
  maxPossibleMarks: number;
  studentsAttempted: number;
  studentsPassedThreshold: number;
  percentageAttained: number;
  attainmentLevel: number; // 0, 1, 2, or 3
}

export interface StudentInternalBreakdown {
  studentId: string;
  registerNumber: string;
  studentName: string;
  iat1Marks: number;
  iat2Marks: number;
  assignmentMarks: number;
  practicalMarks?: number;
  finalInternalMarks: number;
  maxInternalWeight: number; // e.g. 40 for Theory (AU Reg 2021)
  attendancePercentage: number;
  attendanceStatus: 'ELIGIBLE' | 'CONDONATION' | 'DETAINED';
}

export class AttainmentEngineService {
  /**
   * Calculates Direct Course Outcome (CO) and Program Outcome (PO) Attainment
   */
  static async calculateCourseAttainment(assignmentId: string) {
    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        subject: {
          include: {
            courseOutcomes: {
              include: {
                poMappings: { include: { po: true } },
              },
            },
          },
        },
        assessments: {
          include: {
            questions: {
              include: {
                marks: { include: { roster: true } },
              },
            },
          },
        },
      },
    });

    if (!assignment) throw new Error('Course assignment not found');

    const coResults: COAttainmentSummary[] = [];
    const coLevelMap = new Map<string, number>(); // coCode -> level (0..3)

    // Process each Course Outcome
    for (const co of assignment.subject.courseOutcomes) {
      // Gather all questions mapped to this CO across all assessments
      const mappedQuestions: { maxMarks: number; marks: { studentId: string; scored: number }[] }[] = [];

      for (const assessment of assignment.assessments) {
        for (const q of assessment.questions.filter((item) => item.coId === co.id)) {
          const validMarks = q.marks
            .filter((m) => !m.isAbsent && !m.isMalpractice && m.marksObtained !== null)
            .map((m) => ({
              studentId: m.roster.studentId,
              scored: m.marksObtained!,
            }));

          mappedQuestions.push({
            maxMarks: q.maxMarks,
            marks: validMarks,
          });
        }
      }

      if (mappedQuestions.length === 0) {
        coResults.push({
          coId: co.id,
          coCode: co.code,
          description: co.description,
          bloomsLevel: co.bloomsLevel,
          totalQuestions: 0,
          maxPossibleMarks: 0,
          studentsAttempted: 0,
          studentsPassedThreshold: 0,
          percentageAttained: 0,
          attainmentLevel: 0,
        });
        coLevelMap.set(co.code, 0);
        continue;
      }

      // Aggregate by student: total scored vs total max
      const studentTotals = new Map<string, { scored: number; max: number }>();
      for (const q of mappedQuestions) {
        for (const entry of q.marks) {
          const current = studentTotals.get(entry.studentId) || { scored: 0, max: 0 };
          current.scored += entry.scored;
          current.max += q.maxMarks;
          studentTotals.set(entry.studentId, current);
        }
      }

      const totalAttempted = studentTotals.size;
      let studentsPassed = 0;

      // Threshold evaluation: student is counted if scored >= targetThresholdPercent (default 50%)
      const thresholdRatio = co.targetThresholdPercent / 100.0;
      studentTotals.forEach((data) => {
        if (data.max > 0 && data.scored / data.max >= thresholdRatio) {
          studentsPassed++;
        }
      });

      const attainmentPercentage = totalAttempted > 0 ? (studentsPassed / totalAttempted) * 100.0 : 0;

      // Level Mapping: Anna University / NBA Rubrics
      let level = 0;
      if (attainmentPercentage >= co.targetAttainmentLevel3) {
        level = 3;
      } else if (attainmentPercentage >= co.targetAttainmentLevel2) {
        level = 2;
      } else if (attainmentPercentage >= co.targetAttainmentLevel1) {
        level = 1;
      }

      coLevelMap.set(co.code, level);
      coResults.push({
        coId: co.id,
        coCode: co.code,
        description: co.description,
        bloomsLevel: co.bloomsLevel,
        totalQuestions: mappedQuestions.length,
        maxPossibleMarks: mappedQuestions.reduce((acc, q) => acc + q.maxMarks, 0),
        studentsAttempted: totalAttempted,
        studentsPassedThreshold: studentsPassed,
        percentageAttained: Number(attainmentPercentage.toFixed(2)),
        attainmentLevel: level,
      });
    }

    // PO Attainment Calculation: Weighted Average based on CO-PO Matrix
    // PO_Attainment = sum(CO_Level * Correlation_Weight) / sum(Correlation_Weight)
    const poAttainmentMap: Record<string, { totalWeightedScore: number; totalWeight: number; title: string }> = {};

    for (const co of assignment.subject.courseOutcomes) {
      const coLevel = coLevelMap.get(co.code) || 0;
      for (const map of co.poMappings) {
        const poCode = map.po.code;
        const weight = map.correlationLevel; // 1, 2, or 3
        if (weight > 0) {
          if (!poAttainmentMap[poCode]) {
            poAttainmentMap[poCode] = { totalWeightedScore: 0, totalWeight: 0, title: map.po.title };
          }
          poAttainmentMap[poCode].totalWeightedScore += coLevel * weight;
          poAttainmentMap[poCode].totalWeight += weight;
        }
      }
    }

    const finalPoAttainment: Record<string, { score: number; title: string; maxLevel: number }> = {};
    Object.keys(poAttainmentMap).forEach((po) => {
      const item = poAttainmentMap[po];
      finalPoAttainment[po] = {
        score: item.totalWeight > 0 ? Number((item.totalWeightedScore / item.totalWeight).toFixed(2)) : 0,
        title: item.title,
        maxLevel: 3,
      };
    });

    return {
      courseOutcomes: coResults,
      programOutcomes: finalPoAttainment,
    };
  }

  /**
   * Computes Anna University Internal Marks according to Course Type Regulation
   */
  static async computeAnnaUniversityInternals(
    assignmentId: string
  ): Promise<StudentInternalBreakdown[]> {
    const assignment = await prisma.facultyCourseAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        roster: {
          include: {
            student: true,
            markEntries: {
              include: { question: { include: { assessment: true } } },
            },
          },
        },
        assessments: true,
        attendanceSessions: {
          include: { records: true },
        },
      },
    });

    if (!assignment) throw new Error('Assignment not found');

    const totalSessions = assignment.attendanceSessions.length;
    const summaries: StudentInternalBreakdown[] = [];

    for (const rosterEntry of assignment.roster) {
      const student = rosterEntry.student;

      // Group marks by assessment category
      let iat1Score = 0;
      let iat1Max = 0;
      let iat2Score = 0;
      let iat2Max = 0;
      let assignScore = 0;
      let assignMax = 0;
      let labScore = 0;
      let labMax = 0;

      for (const m of rosterEntry.markEntries) {
        if (m.marksObtained === null || m.isAbsent || m.isMalpractice) continue;

        const cat = m.question.assessment.category;
        const marks = m.marksObtained;
        const qMax = m.question.maxMarks;

        if (cat === 'IAT_1') {
          iat1Score += marks;
          iat1Max += qMax;
        } else if (cat === 'IAT_2') {
          iat2Score += marks;
          iat2Max += qMax;
        } else if (cat === 'ASSIGNMENT') {
          assignScore += marks;
          assignMax += qMax;
        } else if (cat === 'LAB_CONTINUOUS' || cat === 'LAB_MODEL_EXAM') {
          labScore += marks;
          labMax += qMax;
        }
      }

      // Convert to 100 percentage scales
      const iat1Pct = iat1Max > 0 ? (iat1Score / iat1Max) * 100 : 0;
      const iat2Pct = iat2Max > 0 ? (iat2Score / iat2Max) * 100 : 0;
      const assignPct = assignMax > 0 ? (assignScore / assignMax) * 100 : 0;
      const labPct = labMax > 0 ? (labScore / labMax) * 100 : 0;

      // Calculate Internal Marks based on Anna University Course Type Formula
      let finalInternals = 0;
      let maxWeight = 40; // Default AU Regulation 2021 Theory Internal out of 40

      switch (assignment.courseType) {
        case 'THEORY':
          // Anna Univ Reg 2021 Theory: Continuous Assessment = 40 Marks
          // Formula: IAT-1 (40%) + IAT-2 (40%) + Assignments (20%) -> scaled to 40
          const theoryComposite = (iat1Pct * 0.4) + (iat2Pct * 0.4) + (assignPct * 0.2);
          finalInternals = Number(((theoryComposite / 100.0) * 40.0).toFixed(2));
          maxWeight = 40;
          break;

        case 'LABORATORY':
          // Lab Course: Continuous Assessment = 60 Marks
          finalInternals = Number(((labPct / 100.0) * 60.0).toFixed(2));
          maxWeight = 60;
          break;

        case 'LAB_INTEGRATED_THEORY':
          // Theory component (50%) + Practical component (50%) -> scaled to 50
          const theoryPart = ((iat1Pct + iat2Pct) / 2.0) * 0.25; // 25 Marks
          const labPart = (labPct / 100.0) * 25.0;              // 25 Marks
          finalInternals = Number((theoryPart + labPart).toFixed(2));
          maxWeight = 50;
          break;

        case 'PROJECT_VIVA_VOCE':
          // Project Phase: Review 1, Review 2, Review 3
          finalInternals = Number(((iat1Pct * 0.3 + iat2Pct * 0.3 + assignPct * 0.4) / 100.0 * 40.0).toFixed(2));
          maxWeight = 40;
          break;

        default:
          finalInternals = Number((((iat1Pct + iat2Pct) / 2) * 0.4).toFixed(2));
          maxWeight = 40;
      }

      // Calculate Attendance Percentage
      let attendedCount = 0;
      assignment.attendanceSessions.forEach((s) => {
        const record = s.records.find((rec) => rec.studentId === student.id);
        if (record && (record.status === 'PRESENT' || record.status === 'ON_DUTY')) {
          attendedCount++;
        }
      });

      const attendancePct = totalSessions > 0 ? (attendedCount / totalSessions) * 100 : 100;

      // Anna University Attendance Threshold Compliance
      let attendanceStatus: 'ELIGIBLE' | 'CONDONATION' | 'DETAINED' = 'ELIGIBLE';
      if (attendancePct < 65.0) {
        attendanceStatus = 'DETAINED';
      } else if (attendancePct < 75.0) {
        attendanceStatus = 'CONDONATION';
      }

      summaries.push({
        studentId: student.id,
        registerNumber: student.rollNumber,
        studentName: student.name,
        iat1Marks: Number(iat1Pct.toFixed(1)),
        iat2Marks: Number(iat2Pct.toFixed(1)),
        assignmentMarks: Number(assignPct.toFixed(1)),
        practicalMarks: labPct > 0 ? Number(labPct.toFixed(1)) : undefined,
        finalInternalMarks: finalInternals,
        maxInternalWeight: maxWeight,
        attendancePercentage: Number(attendancePct.toFixed(1)),
        attendanceStatus,
      });
    }

    return summaries;
  }
}

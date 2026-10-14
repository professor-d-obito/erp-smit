import { prisma } from '../lib/db';
import { AttainmentEngineService } from '../lib/services/attainment-engine.service';
import { AttendanceEngineService } from '../lib/services/attendance-engine.service';
import { AssessmentIngestionService } from '../lib/services/assessment-ingestion.service';
import bcrypt from 'bcryptjs';

async function verifyOBE() {
  console.log('🧪 Starting Anna University OBE & Faculty Assessment Verification Suite (Self-Contained Fixtures)...\n');

  let passed = 0;
  let failed = 0;

  // Cleanup tracking
  let cleanupAssignmentId: string | null = null;
  let cleanupUserId: string | null = null;
  let cleanupStudentId: string | null = null;
  const cleanupCoPoIds: string[] = [];

  try {
    // TEST 1: Program Outcomes (PO1-PO12, PSO1-PSO2)
    const pos = await prisma.programOutcome.findMany();
    if (pos.length >= 14) {
      console.log(`✅ TEST 1 PASSED: Program Outcomes initialized (${pos.length} POs/PSOs).`);
      passed++;
    } else {
      console.error(`❌ TEST 1 FAILED: Expected 14 POs/PSOs, found ${pos.length}`);
      failed++;
    }

    // TEST 2: Course Outcomes for CS3501
    const subject = await prisma.subject.findFirst({
      where: { code: 'CS3501' },
      include: { courseOutcomes: true },
    });

    if (subject && subject.courseOutcomes.length === 5) {
      console.log('✅ TEST 2 PASSED: Course Outcomes (CO1-CO5) defined for subject CS3501.');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Course Outcomes missing for CS3501');
      failed++;
    }

    // Setup transient test fixtures for calculation tests
    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });
    const cseDept = await prisma.department.findUnique({ where: { code: 'CSE' } });
    const courseCSE = await prisma.course.findFirst({ where: { departmentId: cseDept!.id } });
    const testPassword = await bcrypt.hash('Test@123', 10);

    const testTeacher = await prisma.user.create({
      data: {
        employeeId: 'TEST-OBE-TEACHER',
        name: 'Test OBE Faculty',
        email: 'test.obe.teacher@smit.edu.in',
        passwordHash: testPassword,
        roleId: staffRole!.id,
        status: 'ACTIVE',
      },
    });
    cleanupUserId = testTeacher.id;

    const testStudent = await prisma.student.create({
      data: {
        rollNumber: 'TEST-OBE-STUDENT',
        name: 'Test OBE Student',
        departmentId: cseDept!.id,
        courseId: courseCSE!.id,
        semester: 5,
        section: 'A',
        batch: '2023-2027',
      },
    });
    cleanupStudentId = testStudent.id;

    // Temporary CO-PO mapping for PO calculation
    const co1 = subject!.courseOutcomes[0];
    const po1 = pos[0];
    const mapping = await prisma.cO_PO_Mapping.create({
      data: {
        coId: co1.id,
        poId: po1.id,
        correlationLevel: 3,
      },
    });
    cleanupCoPoIds.push(mapping.id);

    // Create transient assignment
    const assignment = await prisma.facultyCourseAssignment.create({
      data: {
        facultyId: testTeacher.id,
        subjectId: subject!.id,
        academicYear: '2026-2027',
        semester: 5,
        section: 'A',
        courseType: 'THEORY',
      },
    });
    cleanupAssignmentId = assignment.id;

    // Enroll student
    const roster = await prisma.courseRoster.create({
      data: {
        assignmentId: assignment.id,
        studentId: testStudent.id,
      },
    });

    // Create assessment with questions
    const assessment = await prisma.assessment.create({
      data: {
        assignmentId: assignment.id,
        title: 'Test IAT Assessment',
        category: 'IAT_1',
        maxTotalMarks: 50.0,
        weightage: 20.0,
      },
    });

    const q1 = await prisma.questionMapping.create({
      data: {
        assessmentId: assessment.id,
        questionNumber: 'Q1',
        partSection: 'PART_A',
        maxMarks: 2.0,
        coId: co1.id,
        bloomsLevel: 'K1_REMEMBER',
      },
    });

    // Create mark entry
    await prisma.markEntry.create({
      data: {
        questionId: q1.id,
        rosterId: roster.id,
        marksObtained: 2.0,
        isAbsent: false,
        isMalpractice: false,
      },
    });

    // Create attendance session
    const sessionDate = new Date();
    sessionDate.setHours(0, 0, 0, 0);
    const session = await prisma.attendanceSession.create({
      data: {
        assignmentId: assignment.id,
        date: sessionDate,
        hour: 1,
        conductedById: testTeacher.id,
        sessionTopic: 'Test Compiler Session',
      },
    });

    await prisma.attendanceSessionRecord.create({
      data: {
        sessionId: session.id,
        studentId: testStudent.id,
        status: 'PRESENT',
      },
    });

    console.log('✔ Transient OBE evaluation fixtures created.\n');

    // TEST 3: Faculty Course Assignment & Student Roster
    console.log('TEST 3: Faculty Course Assignment & Student Roster');
    if (assignment && roster) {
      console.log('✅ TEST 3 PASSED: Course Assignment & Roster Enrollment verified.\n');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED');
      failed++;
    }

    // TEST 4: Direct CO Attainment & PO Projection Calculation
    console.log('TEST 4: Direct CO Attainment & PO Projection Calculation');
    const attainment = await AttainmentEngineService.calculateCourseAttainment(assignment.id);
    if (attainment.courseOutcomes.length === 5 && Object.keys(attainment.programOutcomes).length > 0) {
      const assessedCO1 = attainment.courseOutcomes.find((c) => c.coCode === 'CO1');
      console.log(`✅ TEST 4 PASSED: CO Attainment calculated (CO1 Attained: ${assessedCO1?.percentageAttained}%, Level ${assessedCO1?.attainmentLevel}).\n`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED');
      failed++;
    }

    // TEST 5: Anna University Regulation 2021 Internal Mark Formulation (Theory 40M)
    console.log('TEST 5: Anna University Regulation 2021 Internal Mark Formulation');
    const internals = await AttainmentEngineService.computeAnnaUniversityInternals(assignment.id);
    if (internals.length > 0 && internals[0].maxInternalWeight === 40) {
      console.log(`✅ TEST 5 PASSED: AU Internal marks formulated (${internals[0].studentName}: ${internals[0].finalInternalMarks} / 40M).\n`);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED');
      failed++;
    }

    // TEST 6: Decoupled Attendance & University Eligibility Engine
    console.log('TEST 6: Decoupled Attendance & University Eligibility Engine');
    const detentionReport = await AttendanceEngineService.getDetentionAuditReport(assignment.id);
    if (detentionReport.students.length > 0 && detentionReport.stats.eligibleCount === 1) {
      console.log(`✅ TEST 6 PASSED: Decoupled attendance audit verified (${detentionReport.stats.eligibleCount} Eligible).\n`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED');
      failed++;
    }

    // TEST 7: Excel Evaluation Template Generation
    console.log('TEST 7: Excel Evaluation Template Generation');
    const buffer = await AssessmentIngestionService.generateEvaluationTemplate(assessment.id);
    if (buffer && buffer.length > 0) {
      console.log(`✅ TEST 7 PASSED: Excel evaluation template generated (${buffer.length} bytes .xlsx binary).\n`);
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED');
      failed++;
    }

  } catch (e) {
    console.error('❌ EXCEPTION during OBE tests:', e);
    failed++;
  } finally {
    console.log('🧹 Cleaning up transient OBE test fixtures...');
    if (cleanupAssignmentId) {
      await prisma.markEntry.deleteMany({ where: { roster: { assignmentId: cleanupAssignmentId } } });
      await prisma.questionMapping.deleteMany({ where: { assessment: { assignmentId: cleanupAssignmentId } } });
      await prisma.assessment.deleteMany({ where: { assignmentId: cleanupAssignmentId } });
      await prisma.courseRoster.deleteMany({ where: { assignmentId: cleanupAssignmentId } });
      await prisma.attendanceSessionRecord.deleteMany({ where: { session: { assignmentId: cleanupAssignmentId } } });
      await prisma.attendanceSession.deleteMany({ where: { assignmentId: cleanupAssignmentId } });
      await prisma.facultyCourseAssignment.deleteMany({ where: { id: cleanupAssignmentId } });
    }
    for (const id of cleanupCoPoIds) {
      await prisma.cO_PO_Mapping.deleteMany({ where: { id } });
    }
    if (cleanupStudentId) {
      await prisma.student.deleteMany({ where: { id: cleanupStudentId } });
    }
    if (cleanupUserId) {
      await prisma.user.deleteMany({ where: { id: cleanupUserId } });
    }
    console.log('✨ Transient OBE cleanup complete.\n');
  }

  console.log('----------------------------------------------------');
  console.log(`📊 OBE VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('----------------------------------------------------');

  await prisma.$disconnect();

  if (failed > 0) process.exit(1);
}

verifyOBE();

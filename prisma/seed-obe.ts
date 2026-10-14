import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOBE() {
  console.log('🚀 Seeding Anna University Outcome-Based Education (OBE) & Faculty Assessments...');

  // 1. Seed Program Outcomes (PO1 - PO12) + Program Specific Outcomes (PSO1, PSO2)
  const poData = [
    { code: 'PO1', title: 'Engineering Knowledge', description: 'Apply knowledge of mathematics, science, engineering fundamentals, and an engineering specialization.', category: 'PO' },
    { code: 'PO2', title: 'Problem Analysis', description: 'Identify, formulate, review research literature, and analyze complex engineering problems.', category: 'PO' },
    { code: 'PO3', title: 'Design/Development of Solutions', description: 'Design solutions for complex engineering problems and design system components or processes.', category: 'PO' },
    { code: 'PO4', title: 'Conduct Investigations', description: 'Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data.', category: 'PO' },
    { code: 'PO5', title: 'Modern Tool Usage', description: 'Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools.', category: 'PO' },
    { code: 'PO6', title: 'The Engineer and Society', description: 'Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues.', category: 'PO' },
    { code: 'PO7', title: 'Environment & Sustainability', description: 'Understand the impact of the professional engineering solutions in societal and environmental contexts.', category: 'PO' },
    { code: 'PO8', title: 'Ethics', description: 'Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.', category: 'PO' },
    { code: 'PO9', title: 'Individual & Team Work', description: 'Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.', category: 'PO' },
    { code: 'PO10', title: 'Communication', description: 'Communicate effectively on complex engineering activities with the engineering community and with society at large.', category: 'PO' },
    { code: 'PO11', title: 'Project Management & Finance', description: 'Demonstrate knowledge and understanding of the engineering and management principles and apply these to one’s own work.', category: 'PO' },
    { code: 'PO12', title: 'Life-long Learning', description: 'Recognize the need for, and have the preparation and ability to engage in independent and life-long learning.', category: 'PO' },
    { code: 'PSO1', title: 'Professional Core Competence', description: 'Design and develop robust system architectures, scalable software solutions, and automated engineering applications.', category: 'PSO' },
    { code: 'PSO2', title: 'Intelligence & Research', description: 'Employ data intelligence, algorithm engineering, and distributed computing to solve industrial-scale problems.', category: 'PSO' },
  ];

  const pos: Record<string, string> = {};
  for (const item of poData) {
    const created = await prisma.programOutcome.upsert({
      where: { code: item.code },
      create: item,
      update: item,
    });
    pos[item.code] = created.id;
  }
  console.log(`✅ Seeded ${Object.keys(pos).length} Program Outcomes & PSOs.`);

  // 2. Find Subject CS3501 (Compiler Design)
  const subjectCS = await prisma.subject.findFirst({
    where: { code: 'CS3501' },
  });

  if (!subjectCS) {
    console.error('❌ Subject CS3501 not found! Please run db:seed first.');
    return;
  }

  // 3. Seed Course Outcomes for CS3501
  const coData = [
    { code: 'CO1', description: 'Understand the phases of a compiler and build lexical analyzers using lex tools', bloomsLevel: 'K2_UNDERSTAND', targetThresholdPercent: 50.0 },
    { code: 'CO2', description: 'Design top-down and bottom-up parsers, eliminating ambiguities and constructing parse tables', bloomsLevel: 'K3_APPLY', targetThresholdPercent: 50.0 },
    { code: 'CO3', description: 'Generate syntax directed translation schemes and intermediate three-address code representations', bloomsLevel: 'K3_APPLY', targetThresholdPercent: 50.0 },
    { code: 'CO4', description: 'Implement runtime storage management, activation records, and symbol table operations', bloomsLevel: 'K4_ANALYZE', targetThresholdPercent: 50.0 },
    { code: 'CO5', description: 'Apply basic block code optimization techniques and generate target machine assembly code', bloomsLevel: 'K4_ANALYZE', targetThresholdPercent: 50.0 },
  ];

  const cos: Record<string, string> = {};
  for (const item of coData) {
    const created = await prisma.courseOutcome.upsert({
      where: {
        subjectId_code: {
          subjectId: subjectCS.id,
          code: item.code,
        },
      },
      create: {
        subjectId: subjectCS.id,
        code: item.code,
        description: item.description,
        bloomsLevel: item.bloomsLevel,
        targetThresholdPercent: item.targetThresholdPercent,
      },
      update: {
        description: item.description,
        bloomsLevel: item.bloomsLevel,
      },
    });
    cos[item.code] = created.id;
  }
  console.log(`✅ Seeded ${Object.keys(cos).length} Course Outcomes (CO1 - CO5) for CS3501.`);

  // 4. Seed CO-PO Mapping Matrix
  const coPoMap: Record<string, Record<string, number>> = {
    CO1: { PO1: 3, PO2: 2, PO3: 1, PO5: 2, PSO1: 3 },
    CO2: { PO1: 3, PO2: 3, PO3: 2, PO4: 2, PO5: 3, PSO1: 3 },
    CO3: { PO1: 3, PO2: 3, PO3: 3, PO5: 2, PSO1: 2, PSO2: 2 },
    CO4: { PO1: 2, PO2: 2, PO3: 2, PO4: 1, PSO1: 2 },
    CO5: { PO1: 3, PO2: 3, PO3: 3, PO4: 2, PO5: 2, PSO1: 3, PSO2: 3 },
  };

  for (const [coCode, poRatings] of Object.entries(coPoMap)) {
    const coId = cos[coCode];
    if (!coId) continue;
    for (const [poCode, level] of Object.entries(poRatings)) {
      const poId = pos[poCode];
      if (!poId) continue;
      await prisma.cO_PO_Mapping.upsert({
        where: { coId_poId: { coId, poId } },
        create: { coId, poId, correlationLevel: level },
        update: { correlationLevel: level },
      });
    }
  }
  console.log('✅ Seeded CO-PO correlation matrix.');

  // 5. Find Faculty User (Prof. N. Suresh)
  const teacherUser = await prisma.user.findFirst({
    where: { email: 'suresh.n@smit.edu.in' },
  });

  if (!teacherUser) {
    console.error('❌ Teacher user suresh.n@smit.edu.in not found!');
    return;
  }

  // 6. Assign Faculty to CS3501
  const assignment = await prisma.facultyCourseAssignment.upsert({
    where: {
      facultyId_subjectId_academicYear_semester_section: {
        facultyId: teacherUser.id,
        subjectId: subjectCS.id,
        academicYear: '2024-2025',
        semester: 5,
        section: 'A',
      },
    },
    create: {
      facultyId: teacherUser.id,
      subjectId: subjectCS.id,
      academicYear: '2024-2025',
      semester: 5,
      section: 'A',
      courseType: 'THEORY',
    },
    update: {
      courseType: 'THEORY',
    },
  });
  console.log(`✅ Assigned Prof. N. Suresh to ${subjectCS.code} - ${subjectCS.name}.`);

  // 7. Enroll Students into Roster
  const students = await prisma.student.findMany({
    where: { departmentId: subjectCS.departmentId },
  });

  const rosterIds: string[] = [];
  for (const student of students) {
    const r = await prisma.courseRoster.upsert({
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
    rosterIds.push(r.id);
  }
  console.log(`✅ Enrolled ${rosterIds.length} students into course roster.`);

  // 8. Create Assessment: Internal Assessment Test 1 (IAT-1)
  const existingAssessment = await prisma.assessment.findFirst({
    where: {
      assignmentId: assignment.id,
      title: 'Internal Assessment Test 1 (IAT-1)',
    },
  });

  let assessment = existingAssessment;
  if (!assessment) {
    assessment = await prisma.assessment.create({
      data: {
        assignmentId: assignment.id,
        title: 'Internal Assessment Test 1 (IAT-1)',
        category: 'IAT_1',
        maxTotalMarks: 50.0,
        weightage: 20.0,
        conductedDate: new Date('2026-09-15'),
      },
    });

    // Create Questions for IAT-1
    const questionsDef = [
      // Part A: 5 questions x 2 marks = 10 marks
      { questionNumber: 'Q1', partSection: 'PART_A', maxMarks: 2.0, coId: cos['CO1'], bloomsLevel: 'K1_REMEMBER' },
      { questionNumber: 'Q2', partSection: 'PART_A', maxMarks: 2.0, coId: cos['CO1'], bloomsLevel: 'K2_UNDERSTAND' },
      { questionNumber: 'Q3', partSection: 'PART_A', maxMarks: 2.0, coId: cos['CO2'], bloomsLevel: 'K2_UNDERSTAND' },
      { questionNumber: 'Q4', partSection: 'PART_A', maxMarks: 2.0, coId: cos['CO2'], bloomsLevel: 'K3_APPLY' },
      { questionNumber: 'Q5', partSection: 'PART_A', maxMarks: 2.0, coId: cos['CO3'], bloomsLevel: 'K2_UNDERSTAND' },
      // Part B: 3 questions = 40 marks
      { questionNumber: 'Q11a', partSection: 'PART_B', maxMarks: 13.0, coId: cos['CO1'], bloomsLevel: 'K3_APPLY' },
      { questionNumber: 'Q12a', partSection: 'PART_B', maxMarks: 13.0, coId: cos['CO2'], bloomsLevel: 'K4_ANALYZE' },
      { questionNumber: 'Q13a', partSection: 'PART_B', maxMarks: 14.0, coId: cos['CO3'], bloomsLevel: 'K4_ANALYZE' },
    ];

    const createdQuestions: any[] = [];
    for (const q of questionsDef) {
      const qm = await prisma.questionMapping.create({
        data: {
          assessmentId: assessment.id,
          questionNumber: q.questionNumber,
          partSection: q.partSection,
          maxMarks: q.maxMarks,
          coId: q.coId,
          bloomsLevel: q.bloomsLevel,
        },
      });
      createdQuestions.push(qm);
    }

    // Populate marks for roster students
    for (let i = 0; i < rosterIds.length; i++) {
      const rosterId = rosterIds[i];
      // Generate realistic student marks
      const factor = (i % 4 === 3) ? 0.45 : (i % 4 === 2) ? 0.72 : (i % 4 === 1) ? 0.85 : 0.92;

      for (const q of createdQuestions) {
        const mark = Number((q.maxMarks * factor).toFixed(1));
        await prisma.markEntry.create({
          data: {
            questionId: q.id,
            rosterId,
            marksObtained: mark,
            isAbsent: false,
            isMalpractice: false,
          },
        });
      }
    }
    console.log('✅ Created IAT-1 assessment with 8 questions and populated marks.');
  }

  // 9. Create Decoupled Attendance Sessions (10 hours conducted)
  const baseDate = new Date('2026-09-01');
  for (let d = 0; d < 5; d++) {
    for (let h = 1; h <= 2; h++) {
      const sessionDate = new Date(baseDate);
      sessionDate.setDate(baseDate.getDate() + (d * 2));
      sessionDate.setHours(0, 0, 0, 0);

      const sess = await prisma.attendanceSession.upsert({
        where: {
          assignmentId_date_hour: {
            assignmentId: assignment.id,
            date: sessionDate,
            hour: h,
          },
        },
        create: {
          assignmentId: assignment.id,
          date: sessionDate,
          hour: h,
          sessionTopic: `Unit 1 Compiler Construction - Lecture ${d * 2 + h}`,
          conductedById: teacherUser.id,
        },
        update: {},
      });

      // Mark records for students
      for (let sIdx = 0; sIdx < students.length; sIdx++) {
        const student = students[sIdx];
        // student at index 0: 100% present, student at index 3: irregular (absent in some)
        const isAbsent = (sIdx === 3 && (d % 2 === 0));
        await prisma.attendanceSessionRecord.upsert({
          where: {
            sessionId_studentId: {
              sessionId: sess.id,
              studentId: student.id,
            },
          },
          create: {
            sessionId: sess.id,
            studentId: student.id,
            status: isAbsent ? 'ABSENT' : 'PRESENT',
          },
          update: {},
        });
      }
    }
  }
  console.log('✅ Created 10 hour-wise Decoupled Attendance Sessions with attendance records.');

  console.log('🎉 OBE & Faculty Assessment Seeding Completed Successfully!');
}

seedOBE()
  .catch((e) => {
    console.error('Error seeding OBE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

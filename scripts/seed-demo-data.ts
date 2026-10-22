import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Populating realistic demo students, fee structures, and exam results...');

  const deptCSE = await prisma.department.findUnique({ where: { code: 'CSE' } });
  const deptECE = await prisma.department.findUnique({ where: { code: 'ECE' } });
  const courseCSE = await prisma.course.findUnique({ where: { code: 'BE-CSE' } });
  const courseECE = await prisma.course.findUnique({ where: { code: 'BE-ECE' } });

  const subjectCS3501 = await prisma.subject.findUnique({ where: { code: 'CS3501' } });
  const subjectCS3391 = await prisma.subject.findUnique({ where: { code: 'CS3391' } });
  const subjectCS3452 = await prisma.subject.findUnique({ where: { code: 'CS3452' } });
  const subjectCS3511 = await prisma.subject.findUnique({ where: { code: 'CS3511' } });

  const admin = await prisma.user.findFirst({ where: { email: 'admin@smit.edu.in' } });

  if (!deptCSE || !courseCSE) {
    console.error('Core department or course missing.');
    return;
  }

  // 1. Seed 8 CSE Students
  const cseStudentsData = [
    { rollNumber: '211421104001', name: 'Aarav Kumar', email: 'aarav.21cse@smit.edu.in', phone: '9840123001' },
    { rollNumber: '211421104002', name: 'Priya Dharshini', email: 'priya.21cse@smit.edu.in', phone: '9840123002' },
    { rollNumber: '211421104003', name: 'Karthi Keyan', email: 'karthi.21cse@smit.edu.in', phone: '9840123003' },
    { rollNumber: '211421104004', name: 'Sneha Murugan', email: 'sneha.21cse@smit.edu.in', phone: '9840123004' },
    { rollNumber: '211421104005', name: 'Rahul Dev', email: 'rahul.21cse@smit.edu.in', phone: '9840123005' },
    { rollNumber: '211421104006', name: 'Deepa Lakshmi', email: 'deepa.21cse@smit.edu.in', phone: '9840123006' },
    { rollNumber: '211421104007', name: 'Vignesh Sundaram', email: 'vignesh.21cse@smit.edu.in', phone: '9840123007' },
    { rollNumber: '211421104008', name: 'Ananya Ramesh', email: 'ananya.21cse@smit.edu.in', phone: '9840123008' },
  ];

  const createdCseStudents: any[] = [];
  for (const s of cseStudentsData) {
    const student = await prisma.student.upsert({
      where: { rollNumber: s.rollNumber },
      create: {
        ...s,
        departmentId: deptCSE.id,
        courseId: courseCSE.id,
        semester: 5,
        section: 'A',
        batch: '2023-2027',
      },
      update: {},
    });
    createdCseStudents.push(student);
  }
  console.log(`✅ Seeded ${createdCseStudents.length} CSE students in Semester 5 Section A.`);

  // 2. Fee Structures
  const tuitionStructure = await prisma.feeStructure.create({
    data: {
      title: 'B.E. CSE Semester 5 Tuition Fee',
      academicYear: '2026-2027',
      courseId: courseCSE.id,
      departmentId: deptCSE.id,
      semester: 5,
      category: 'TUITION',
      amount: 85000.0,
      dueDate: new Date('2026-11-30'),
      description: 'Annual tuition and laboratory development charges for B.E. Computer Science.',
    },
  });

  const examFeeStructure = await prisma.feeStructure.create({
    data: {
      title: 'Anna University Semester 5 Examination Fee',
      academicYear: '2026-2027',
      courseId: courseCSE.id,
      semester: 5,
      category: 'EXAM',
      amount: 2500.0,
      dueDate: new Date('2026-10-31'),
      description: 'End semester university examination theory & lab candidate fee.',
    },
  });

  const busFeeStructure = await prisma.feeStructure.create({
    data: {
      title: 'College Bus Transport Fee (Route 12 - Tambaram)',
      academicYear: '2026-2027',
      category: 'TRANSPORT',
      amount: 28000.0,
      dueDate: new Date('2026-09-15'),
      description: 'Full academic year institutional transport service.',
    },
  });

  console.log('✅ Seeded Standard Fee Structures.');

  // 3. Student Invoices & Payment Transactions
  if (createdCseStudents.length >= 4) {
    // Aarav: Fully Paid
    const feeAarav = await prisma.studentFee.create({
      data: {
        studentId: createdCseStudents[0].id,
        feeStructureId: tuitionStructure.id,
        title: 'Semester 5 Tuition Fee',
        category: 'TUITION',
        academicYear: '2026-2027',
        totalAmount: 85000.0,
        paidAmount: 85000.0,
        balance: 0.0,
        status: 'PAID',
        dueDate: new Date('2026-11-30'),
      },
    });

    await prisma.feePayment.create({
      data: {
        studentFeeId: feeAarav.id,
        receiptNumber: 'REC-2026-00001',
        amount: 85000.0,
        paymentMode: 'UPI_ONLINE',
        transactionRef: 'UPI-HDFC-9912038102',
        paidDate: new Date('2026-10-15T10:30:00Z'),
        collectedByUserId: admin?.id,
        remarks: 'Paid via GooglePay UPI.',
      },
    });

    // Priya: Partially Paid
    const feePriya = await prisma.studentFee.create({
      data: {
        studentId: createdCseStudents[1].id,
        feeStructureId: tuitionStructure.id,
        title: 'Semester 5 Tuition Fee',
        category: 'TUITION',
        academicYear: '2026-2027',
        totalAmount: 85000.0,
        paidAmount: 50000.0,
        balance: 35000.0,
        status: 'PARTIAL',
        dueDate: new Date('2026-11-30'),
      },
    });

    await prisma.feePayment.create({
      data: {
        studentFeeId: feePriya.id,
        receiptNumber: 'REC-2026-00002',
        amount: 50000.0,
        paymentMode: 'NET_BANKING',
        transactionRef: 'NEFT-SBI-481920381',
        paidDate: new Date('2026-10-16T14:15:00Z'),
        collectedByUserId: admin?.id,
        remarks: 'First installment paid via NetBanking.',
      },
    });

    // Karthi: Unpaid
    await prisma.studentFee.create({
      data: {
        studentId: createdCseStudents[2].id,
        feeStructureId: tuitionStructure.id,
        title: 'Semester 5 Tuition Fee',
        category: 'TUITION',
        academicYear: '2026-2027',
        totalAmount: 85000.0,
        paidAmount: 0.0,
        balance: 85000.0,
        status: 'PENDING',
        dueDate: new Date('2026-11-30'),
      },
    });

    // Sneha: Exam Fee Paid
    const feeSneha = await prisma.studentFee.create({
      data: {
        studentId: createdCseStudents[3].id,
        feeStructureId: examFeeStructure.id,
        title: 'Semester 5 Examination Fee',
        category: 'EXAM',
        academicYear: '2026-2027',
        totalAmount: 2500.0,
        paidAmount: 2500.0,
        balance: 0.0,
        status: 'PAID',
        dueDate: new Date('2026-10-31'),
      },
    });

    await prisma.feePayment.create({
      data: {
        studentFeeId: feeSneha.id,
        receiptNumber: 'REC-2026-00003',
        amount: 2500.0,
        paymentMode: 'CASH',
        transactionRef: 'COUNTER-CHIT-1049',
        paidDate: new Date('2026-10-18T11:00:00Z'),
        collectedByUserId: admin?.id,
        remarks: 'Cash paid at accounts counter.',
      },
    });

    // Rahul: Overdue Bus Fee
    await prisma.studentFee.create({
      data: {
        studentId: createdCseStudents[4].id,
        feeStructureId: busFeeStructure.id,
        title: 'College Bus Transport Fee',
        category: 'TRANSPORT',
        academicYear: '2026-2027',
        totalAmount: 28000.0,
        paidAmount: 0.0,
        balance: 28000.0,
        status: 'OVERDUE',
        dueDate: new Date('2026-09-15'),
      },
    });
    console.log('✅ Seeded Student Fee Invoices & Payment Receipts.');
  }

  // 4. Exam Sessions
  const semExam = await prisma.exam.create({
    data: {
      title: 'April/May 2026 End Semester Examinations',
      examType: 'SEMESTER',
      academicYear: '2026-2027',
      semester: 5,
      startDate: new Date('2026-05-02'),
      endDate: new Date('2026-05-24'),
      isPublished: true,
    },
  });

  const iat1Exam = await prisma.exam.create({
    data: {
      title: 'Internal Assessment Test - I (IAT-1)',
      examType: 'INTERNAL_IAT1',
      academicYear: '2026-2027',
      semester: 5,
      startDate: new Date('2026-08-10'),
      endDate: new Date('2026-08-16'),
      isPublished: true,
    },
  });
  console.log('✅ Seeded Exam Sessions.');

  // 5. Exam Results for Aarav & Priya
  if (subjectCS3501 && subjectCS3391 && subjectCS3452 && subjectCS3511) {
    const aarav = createdCseStudents[0];
    const priya = createdCseStudents[1];

    // Aarav: Distinction All Clear
    await prisma.examResult.createMany({
      data: [
        {
          examId: semExam.id,
          studentId: aarav.id,
          subjectId: subjectCS3501.id,
          internalMarks: 38,
          externalMarks: 56,
          totalMarks: 94,
          maxMarks: 100,
          grade: 'O',
          gradePoint: 10.0,
          credits: 4,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: aarav.id,
          subjectId: subjectCS3391.id,
          internalMarks: 35,
          externalMarks: 52,
          totalMarks: 87,
          maxMarks: 100,
          grade: 'A+',
          gradePoint: 9.0,
          credits: 3,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: aarav.id,
          subjectId: subjectCS3452.id,
          internalMarks: 36,
          externalMarks: 48,
          totalMarks: 84,
          maxMarks: 100,
          grade: 'A+',
          gradePoint: 9.0,
          credits: 3,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: aarav.id,
          subjectId: subjectCS3511.id,
          internalMarks: 39,
          externalMarks: 55,
          totalMarks: 94,
          maxMarks: 100,
          grade: 'O',
          gradePoint: 10.0,
          credits: 2,
          resultStatus: 'PASS',
        },
      ],
    });

    // Priya: First Class
    await prisma.examResult.createMany({
      data: [
        {
          examId: semExam.id,
          studentId: priya.id,
          subjectId: subjectCS3501.id,
          internalMarks: 34,
          externalMarks: 47,
          totalMarks: 81,
          maxMarks: 100,
          grade: 'A+',
          gradePoint: 9.0,
          credits: 4,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: priya.id,
          subjectId: subjectCS3391.id,
          internalMarks: 32,
          externalMarks: 44,
          totalMarks: 76,
          maxMarks: 100,
          grade: 'A',
          gradePoint: 8.0,
          credits: 3,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: priya.id,
          subjectId: subjectCS3452.id,
          internalMarks: 30,
          externalMarks: 42,
          totalMarks: 72,
          maxMarks: 100,
          grade: 'A',
          gradePoint: 8.0,
          credits: 3,
          resultStatus: 'PASS',
        },
        {
          examId: semExam.id,
          studentId: priya.id,
          subjectId: subjectCS3511.id,
          internalMarks: 37,
          externalMarks: 52,
          totalMarks: 89,
          maxMarks: 100,
          grade: 'A+',
          gradePoint: 9.0,
          credits: 2,
          resultStatus: 'PASS',
        },
      ],
    });
    console.log('✅ Seeded Semester Exam Grades & Transcripts for sample candidates.');
  }

  // 6. Seed Sample Attendance for Today
  const today = new Date();
  for (let i = 0; i < createdCseStudents.length; i++) {
    const st = createdCseStudents[i];
    const status = i === 2 ? 'ABSENT' : i === 4 ? 'LATE' : 'PRESENT';
    const remarks = i === 2 ? 'Medical leave' : i === 4 ? 'College bus delay' : null;

    await prisma.attendanceRecord.create({
      data: {
        studentId: st.id,
        departmentId: deptCSE.id,
        subjectId: subjectCS3501?.id || null,
        markedByUserId: admin?.id || '',
        date: today,
        hour: 1,
        status,
        remarks,
      },
    });
  }
  console.log('✅ Seeded Sample Class Attendance Records.');

  console.log('\n✨ Demo data successfully initialized for Attendance, Fees, and Exams!');
}

main()
  .catch((e) => {
    console.error('Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

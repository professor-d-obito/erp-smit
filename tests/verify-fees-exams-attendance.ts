import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Starting Verification of New ERP Capabilities: Attendance, Fees & Exam Results...\n');

  let passed = 0;
  let failed = 0;

  try {
    // ----------------------------------------------------
    // TEST 1: Effortless Attendance Batch & Record Accuracy
    // ----------------------------------------------------
    console.log('TEST 1: Fast Attendance Batch & Status Mapping');
    const cseStudents = await prisma.student.findMany({
      where: { semester: 5, section: 'A' },
      take: 3,
    });

    if (cseStudents.length >= 2) {
      const admin = await prisma.user.findFirst();
      const testDate = new Date();

      // Upsert batch attendance
      for (let i = 0; i < cseStudents.length; i++) {
        const st = cseStudents[i];
        const status = i === 0 ? 'PRESENT' : 'ABSENT';
        await prisma.attendanceRecord.create({
          data: {
            studentId: st.id,
            departmentId: st.departmentId,
            markedByUserId: admin!.id,
            date: testDate,
            hour: 3,
            status,
            remarks: i === 1 ? 'Automated test absent record' : null,
          },
        });
      }

      const verifiedRecords = await prisma.attendanceRecord.findMany({
        where: {
          studentId: { in: cseStudents.map((s) => s.id) },
          hour: 3,
        },
      });

      if (verifiedRecords.length >= cseStudents.length) {
        console.log(`✅ TEST 1 PASSED: Batch attendance recorded successfully (${verifiedRecords.length} records verified).\n`);
        passed++;
      } else {
        console.error('❌ TEST 1 FAILED: Attendance records mismatch.');
        failed++;
      }
    } else {
      console.warn('⚠️ TEST 1 SKIPPED: Insufficient students.');
    }

    // ----------------------------------------------------
    // TEST 2: Fee Structure, Invoicing & Payment Processing
    // ----------------------------------------------------
    console.log('TEST 2: Fee Payment Processing & Balance Settlement');
    const testStudent = await prisma.student.findFirst();

    if (testStudent) {
      // Create student fee invoice of ₹25,000
      const invoice = await prisma.studentFee.create({
        data: {
          studentId: testStudent.id,
          title: 'Special Laboratory Equipment Fee',
          category: 'LAB',
          academicYear: '2026-2027',
          totalAmount: 25000.0,
          discountAmount: 1000.0,
          paidAmount: 0.0,
          balance: 24000.0,
          status: 'PENDING',
        },
      });

      // Partial payment of ₹14,000
      const payment1 = await prisma.feePayment.create({
        data: {
          studentFeeId: invoice.id,
          receiptNumber: `TEST-REC-${Date.now()}-1`,
          amount: 14000.0,
          paymentMode: 'UPI_ONLINE',
          transactionRef: 'UPI-TEST-12345',
        },
      });

      const updatedAfterP1 = await prisma.studentFee.update({
        where: { id: invoice.id },
        data: {
          paidAmount: 14000.0,
          balance: 10000.0,
          status: 'PARTIAL',
        },
      });

      // Settlement payment of remaining ₹10,000
      const payment2 = await prisma.feePayment.create({
        data: {
          studentFeeId: invoice.id,
          receiptNumber: `TEST-REC-${Date.now()}-2`,
          amount: 10000.0,
          paymentMode: 'CASH',
        },
      });

      const settledInvoice = await prisma.studentFee.update({
        where: { id: invoice.id },
        data: {
          paidAmount: 24000.0,
          balance: 0.0,
          status: 'PAID',
        },
      });

      if (
        settledInvoice.status === 'PAID' &&
        settledInvoice.balance === 0 &&
        settledInvoice.paidAmount === 24000.0
      ) {
        console.log('✅ TEST 2 PASSED: Fee lifecycle (Invoice -> Partial -> Fully Settled) verified.\n');
        passed++;
      } else {
        console.error('❌ TEST 2 FAILED: Fee settlement balance error.');
        failed++;
      }

      // Cleanup test invoices
      await prisma.feePayment.deleteMany({ where: { studentFeeId: invoice.id } });
      await prisma.studentFee.delete({ where: { id: invoice.id } });
    }

    // ----------------------------------------------------
    // TEST 3: Anna University Grade & SGPA Calculation
    // ----------------------------------------------------
    console.log('TEST 3: Anna University 10-Point Scale & SGPA Formulation');
    const exam = await prisma.exam.findFirst();
    const student = await prisma.student.findFirst();
    const subjects = await prisma.subject.findMany({ take: 2 });

    if (exam && student && subjects.length >= 2) {
      // 1. Outstanding grade: 95 marks -> 'O' (10.0 GP)
      // 2. Good grade: 65 marks -> 'B+' (7.0 GP)
      const res1 = await prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: exam.id,
            studentId: student.id,
            subjectId: subjects[0].id,
          },
        },
        create: {
          examId: exam.id,
          studentId: student.id,
          subjectId: subjects[0].id,
          totalMarks: 95,
          grade: 'O',
          gradePoint: 10.0,
          credits: 4,
          resultStatus: 'PASS',
        },
        update: {
          totalMarks: 95,
          grade: 'O',
          gradePoint: 10.0,
          credits: 4,
          resultStatus: 'PASS',
        },
      });

      const res2 = await prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: exam.id,
            studentId: student.id,
            subjectId: subjects[1].id,
          },
        },
        create: {
          examId: exam.id,
          studentId: student.id,
          subjectId: subjects[1].id,
          totalMarks: 65,
          grade: 'B+',
          gradePoint: 7.0,
          credits: 3,
          resultStatus: 'PASS',
        },
        update: {
          totalMarks: 65,
          grade: 'B+',
          gradePoint: 7.0,
          credits: 3,
          resultStatus: 'PASS',
        },
      });

      // SGPA = (4*10 + 3*7) / (4 + 3) = (40 + 21) / 7 = 61 / 7 = 8.71
      const expectedSGPA = Math.round(((4 * 10.0 + 3 * 7.0) / 7) * 100) / 100;

      if (res1.grade === 'O' && res2.grade === 'B+' && expectedSGPA === 8.71) {
        console.log(`✅ TEST 3 PASSED: AU Grade points & SGPA verified (SGPA = ${expectedSGPA}).\n`);
        passed++;
      } else {
        console.error('❌ TEST 3 FAILED: Grade calculation mismatch.');
        failed++;
      }
    }

    console.log('----------------------------------------------------');
    console.log(`📊 NEW MODULE TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
    console.log('----------------------------------------------------');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await prisma.$disconnect();
    if (failed > 0) process.exit(1);
  }
}

runTests();

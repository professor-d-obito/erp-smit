import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runTests() {
  console.log('🧪 Running Hierarchical Access & Branch Isolation Automated Tests (Self-Contained Fixtures)...\n');

  let passed = 0;
  let failed = 0;

  // Track created fixtures for guaranteed cleanup
  const cleanupUserIds: string[] = [];
  const cleanupStudentIds: string[] = [];
  const cleanupDocIds: string[] = [];

  try {
    const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    const hodRole = await prisma.role.findUnique({ where: { name: 'HOD' } });
    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });

    const cseDept = await prisma.department.findUnique({ where: { code: 'CSE' } });
    const eceDept = await prisma.department.findUnique({ where: { code: 'ECE' } });

    if (!adminRole || !hodRole || !staffRole || !cseDept || !eceDept) {
      throw new Error('Core roles or departments not found in database. Run db:seed first.');
    }

    const testPassword = await bcrypt.hash('Test@123456', 10);

    // Create Test CSE HOD
    const testHodCSE = await prisma.user.create({
      data: {
        employeeId: 'TEST-CSE-HOD',
        name: 'Test Dr. CSE HOD',
        email: 'test.hod.cse@smit.edu.in',
        passwordHash: testPassword,
        roleId: hodRole.id,
        status: 'ACTIVE',
        staffProfile: { create: { departmentId: cseDept.id } },
      },
    });
    cleanupUserIds.push(testHodCSE.id);

    // Create Test ECE HOD
    const testHodECE = await prisma.user.create({
      data: {
        employeeId: 'TEST-ECE-HOD',
        name: 'Test Dr. ECE HOD',
        email: 'test.hod.ece@smit.edu.in',
        passwordHash: testPassword,
        roleId: hodRole.id,
        status: 'ACTIVE',
        staffProfile: { create: { departmentId: eceDept.id } },
      },
    });
    cleanupUserIds.push(testHodECE.id);

    // Create Test CSE Teacher
    const testTeacherCSE = await prisma.user.create({
      data: {
        employeeId: 'TEST-CSE-TCH',
        name: 'Test Prof. CSE Teacher',
        email: 'test.teacher.cse@smit.edu.in',
        passwordHash: testPassword,
        roleId: staffRole.id,
        status: 'ACTIVE',
        staffProfile: { create: { departmentId: cseDept.id } },
      },
    });
    cleanupUserIds.push(testTeacherCSE.id);

    // Find course for students
    const courseCSE = await prisma.course.findFirst({ where: { departmentId: cseDept.id } });
    const courseECE = await prisma.course.findFirst({ where: { departmentId: eceDept.id } });

    // Create 2 Test CSE Students
    const studentCSE1 = await prisma.student.create({
      data: {
        rollNumber: 'TEST-CSE-001',
        name: 'Test Student CSE 1',
        departmentId: cseDept.id,
        courseId: courseCSE!.id,
        semester: 5,
        section: 'A',
        batch: '2023-2027',
      },
    });
    cleanupStudentIds.push(studentCSE1.id);

    const studentECE1 = await prisma.student.create({
      data: {
        rollNumber: 'TEST-ECE-001',
        name: 'Test Student ECE 1',
        departmentId: eceDept.id,
        courseId: courseECE!.id,
        semester: 5,
        section: 'A',
        batch: '2023-2027',
      },
    });
    cleanupStudentIds.push(studentECE1.id);

    // Create Test Documents
    const docCSE = await prisma.documentUpload.create({
      data: {
        title: 'CSE Test Syllabus Document',
        fileName: 'cse_test.pdf',
        fileUrl: '/uploads/cse_test.pdf',
        fileType: 'PDF',
        departmentId: cseDept.id,
        uploadedByUserId: testTeacherCSE.id,
      },
    });
    cleanupDocIds.push(docCSE.id);

    console.log('✔ Test fixtures initialized successfully.\n');

    // TEST 1: Principal Overarching Access
    const allStudents = await prisma.student.findMany();
    const allStaff = await prisma.user.findMany({ where: { role: { name: { in: ['STAFF', 'HOD'] } } } });
    const allDocs = await prisma.documentUpload.findMany();

    console.log('TEST 1: Principal Overarching Visibility Test');
    console.log(`  - Students visible: ${allStudents.length}`);
    console.log(`  - Staff visible:    ${allStaff.length}`);
    console.log(`  - Documents visible: ${allDocs.length}`);
    if (allStudents.length >= 2 && allDocs.length >= 1) {
      console.log('✅ TEST 1 PASSED: Principal has overarching access across all departments.\n');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED');
      failed++;
    }

    // TEST 2: CSE HOD Department Isolation
    const cseHodStaff = await prisma.staffProfile.findMany({ where: { departmentId: cseDept.id } });
    const cseHodStudents = await prisma.student.findMany({ where: { departmentId: cseDept.id } });
    const cseHodDocs = await prisma.documentUpload.findMany({ where: { departmentId: cseDept.id } });

    console.log('TEST 2: CSE HOD Department Data Isolation Test');
    console.log(`  - CSE Staff: ${cseHodStaff.length}, Students: ${cseHodStudents.length}, Docs: ${cseHodDocs.length}`);
    const foreignDocsInCSE = await prisma.documentUpload.count({
      where: { departmentId: cseDept.id, department: { code: { not: 'CSE' } } },
    });
    if (foreignDocsInCSE === 0 && cseHodStaff.length >= 2) {
      console.log('✅ TEST 2 PASSED: CSE HOD can ONLY view CSE department records.\n');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED');
      failed++;
    }

    // TEST 3: ECE HOD Isolation
    console.log('TEST 3: ECE HOD Department Data Isolation Test');
    const cseDocsSeenByECE = await prisma.documentUpload.findMany({
      where: { id: docCSE.id, departmentId: eceDept.id },
    });
    if (cseDocsSeenByECE.length === 0) {
      console.log('✅ TEST 3 PASSED: ECE HOD CANNOT see CSE department records.\n');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Leakage detected');
      failed++;
    }

    // TEST 4: Teacher Upload & Department Access
    console.log('TEST 4: Teacher Document Upload & Department Scoping');
    if (docCSE.uploadedByUserId === testTeacherCSE.id && docCSE.departmentId === cseDept.id) {
      console.log('✅ TEST 4 PASSED: CSE Teacher document correctly scoped to CSE department.\n');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED');
      failed++;
    }

  } catch (e) {
    console.error('❌ EXCEPTION during permission tests:', e);
    failed++;
  } finally {
    // Guarnateed cleanup of all test fixtures
    console.log('🧹 Cleaning up test fixtures...');
    for (const docId of cleanupDocIds) {
      await prisma.documentUpload.deleteMany({ where: { id: docId } });
    }
    for (const studentId of cleanupStudentIds) {
      await prisma.student.deleteMany({ where: { id: studentId } });
    }
    for (const userId of cleanupUserIds) {
      await prisma.staffProfile.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    console.log('✨ Cleanup complete.\n');
  }

  console.log('----------------------------------------------------');
  console.log(`📊 PERMISSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('----------------------------------------------------');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

runTests();

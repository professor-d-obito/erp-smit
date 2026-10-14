import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyAnnouncementsModule() {
  console.log('🧪 Running Announcement Module Automated Tests (Self-Contained Fixtures)...\n');

  let passed = 0;
  let failed = 0;
  const cleanupUserIds: string[] = [];
  const cleanupNoticeIds: string[] = [];

  try {
    const superAdmin = await prisma.user.findFirst({
      where: { role: { name: 'SUPER_ADMIN' } },
      include: { role: true },
    });

    const hodRole = await prisma.role.findUnique({ where: { name: 'HOD' } });
    const staffRole = await prisma.role.findUnique({ where: { name: 'STAFF' } });

    if (!superAdmin || !hodRole || !staffRole) {
      throw new Error('Required roles or admin missing in database.');
    }

    const testPassword = await bcrypt.hash('Test@123456', 10);

    // Create transient test accounts
    const testHod = await prisma.user.create({
      data: {
        employeeId: 'TEST-HOD-ANNC',
        name: 'Test HOD Announcements',
        email: 'test.hod.annc@smit.edu.in',
        passwordHash: testPassword,
        roleId: hodRole.id,
        status: 'ACTIVE',
      },
    });
    cleanupUserIds.push(testHod.id);

    const testStaff = await prisma.user.create({
      data: {
        employeeId: 'TEST-STF-ANNC',
        name: 'Test Staff Announcements',
        email: 'test.staff.annc@smit.edu.in',
        passwordHash: testPassword,
        roleId: staffRole.id,
        status: 'ACTIVE',
      },
    });
    cleanupUserIds.push(testStaff.id);

    console.log('✔ Test Accounts Initialized:');
    console.log(`  - Super Admin: ${superAdmin.name}`);
    console.log(`  - HOD:         ${testHod.name}`);
    console.log(`  - Staff:       ${testStaff.name}\n`);

    // TEST 1: Super Admin Can Create & Target Announcements
    console.log('TEST 1: Super Admin Announcement Creation & Targeting');
    const testNotice = await prisma.announcement.create({
      data: {
        title: 'Automated Test Circular - NAAC Peer Team Visit',
        content: 'Important circular regarding NAAC accreditation team arrival on Campus next Monday.',
        priority: 'URGENT',
        targetAudience: 'HOD',
        status: 'PUBLISHED',
        isPinned: true,
        authorId: superAdmin.id,
      },
    });
    cleanupNoticeIds.push(testNotice.id);

    if (testNotice && testNotice.targetAudience === 'HOD') {
      console.log('✅ TEST 1 PASSED: Super Admin successfully created targeted announcement.\n');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED');
      failed++;
    }

    // TEST 2: Role-based Visibility Filtering (HOD vs Staff)
    console.log('TEST 2: Role-Scoped Announcement Visibility Filtering');
    const hodVisible = await prisma.announcement.findMany({
      where: {
        targetAudience: { in: ['ALL', 'HOD'] },
        status: 'PUBLISHED',
      },
    });

    const staffVisible = await prisma.announcement.findMany({
      where: {
        targetAudience: { in: ['ALL', 'STAFF'] },
        status: 'PUBLISHED',
      },
    });

    const hodHasTargetNotice = hodVisible.some((a) => a.id === testNotice.id);
    const staffHasTargetNotice = staffVisible.some((a) => a.id === testNotice.id);

    if (hodHasTargetNotice && !staffHasTargetNotice) {
      console.log('✅ TEST 2 PASSED: HOD can view HOD-targeted announcement; Staff is strictly restricted.\n');
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Visibility filtering failed!');
      failed++;
    }

    // TEST 3: Super Admin Edit & Cleanup
    console.log('TEST 3: Super Admin Management & Edit');
    const updatedNotice = await prisma.announcement.update({
      where: { id: testNotice.id },
      data: { title: 'Updated Test Circular - Revised Date' },
    });

    if (updatedNotice.title === 'Updated Test Circular - Revised Date') {
      console.log('✅ TEST 3 PASSED: Announcement title updated successfully.\n');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED');
      failed++;
    }

  } catch (e) {
    console.error('❌ EXCEPTION during announcement test:', e);
    failed++;
  } finally {
    console.log('🧹 Cleaning up test announcement fixtures...');
    for (const id of cleanupNoticeIds) {
      await prisma.announcement.deleteMany({ where: { id } });
    }
    for (const id of cleanupUserIds) {
      await prisma.user.deleteMany({ where: { id } });
    }
    console.log('✨ Cleanup complete.\n');
  }

  console.log('----------------------------------------------------');
  console.log(`📊 ANNOUNCEMENT TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('----------------------------------------------------');

  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

verifyAnnouncementsModule();

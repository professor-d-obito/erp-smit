import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing all data from SMIT ERP database...');

  // Deleting records in foreign-key safe order
  const marks = await prisma.markEntry.deleteMany();
  const questions = await prisma.questionMapping.deleteMany();
  const assessments = await prisma.assessment.deleteMany();
  const roster = await prisma.courseRoster.deleteMany();
  const sessionRecords = await prisma.attendanceSessionRecord.deleteMany();
  const sessions = await prisma.attendanceSession.deleteMany();
  const assignments = await prisma.facultyCourseAssignment.deleteMany();
  const coPo = await prisma.cO_PO_Mapping.deleteMany();
  const cos = await prisma.courseOutcome.deleteMany();
  const pos = await prisma.programOutcome.deleteMany();

  const announcements = await prisma.announcement.deleteMany();
  const documents = await prisma.documentUpload.deleteMany();
  const attendance = await prisma.attendanceRecord.deleteMany();
  const students = await prisma.student.deleteMany();
  const auditLogs = await prisma.auditLog.deleteMany();
  const appSettings = await prisma.appSetting.deleteMany();
  const rolePermissions = await prisma.rolePermission.deleteMany();
  const permissions = await prisma.permission.deleteMany();

  const subjects = await prisma.subject.deleteMany();
  const courses = await prisma.course.deleteMany();
  const staffProfiles = await prisma.staffProfile.deleteMany();
  
  // Unlink HODs before deleting departments and users
  await prisma.department.updateMany({ data: { hodUserId: null } });
  const departments = await prisma.department.deleteMany();
  
  const designations = await prisma.designation.deleteMany();
  const users = await prisma.user.deleteMany();
  const roles = await prisma.role.deleteMany();

  console.log('✅ Database completely wiped!');
  console.log(`   - Deleted ${students.count} Students`);
  console.log(`   - Deleted ${staffProfiles.count} Staff Profiles`);
  console.log(`   - Deleted ${users.count} Users`);
  console.log(`   - Deleted ${documents.count} Documents`);
  console.log(`   - Deleted ${announcements.count} Announcements`);
  console.log(`   - Deleted ${marks.count} Mark Entries`);
  console.log(`   - Deleted ${assessments.count} Assessments`);
  console.log(`   - Deleted ${auditLogs.count} Audit Logs`);
  console.log('🎉 Database is now 100% reset and clean.');
}

main()
  .catch((e) => {
    console.error('❌ Error clearing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

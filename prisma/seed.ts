import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing SMIT College ERP in Clean Commercial Production State...');

  // 1. Clear existing data in safe foreign key order
  await prisma.markEntry.deleteMany();
  await prisma.questionMapping.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.courseRoster.deleteMany();
  await prisma.attendanceSessionRecord.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.facultyCourseAssignment.deleteMany();
  await prisma.cO_PO_Mapping.deleteMany();
  await prisma.courseOutcome.deleteMany();
  await prisma.programOutcome.deleteMany();

  await prisma.announcement.deleteMany();
  await prisma.documentUpload.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.student.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.course.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.department.updateMany({ data: { hodUserId: null } });
  await prisma.department.deleteMany();
  await prisma.designation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('🧹 Purged all previous mock records.');

  // 2. Define System Permissions
  const permissionsData = [
    // Staff Management
    { code: 'staff:view', name: 'View All Staff', category: 'Staff', description: 'Can view staff directory and profiles' },
    { code: 'staff:create', name: 'Add New Staff', category: 'Staff', description: 'Can create new staff user accounts' },
    { code: 'staff:edit', name: 'Edit Staff Profile', category: 'Staff', description: 'Can edit staff details and departments' },
    { code: 'staff:deactivate', name: 'Activate/Deactivate Staff', category: 'Staff', description: 'Can change staff activation status' },
    { code: 'staff:reset_password', name: 'Reset User Password', category: 'Staff', description: 'Can reset staff passwords' },
    { code: 'staff:export', name: 'Export Staff Data', category: 'Staff', description: 'Can export staff reports' },
    { code: 'staff:view_self', name: 'View Own Profile', category: 'Staff', description: 'Can view personal staff profile' },

    // Academic Management
    { code: 'academic:view', name: 'View Academic Master Data', category: 'Academic', description: 'Can view departments, courses, subjects, designations' },
    { code: 'academic:manage', name: 'Manage Academic Master Data', category: 'Academic', description: 'Can edit departments and courses' },

    // Students Management
    { code: 'students:view', name: 'View Student Directory', category: 'Students', description: 'Can view student roster and details' },
    { code: 'students:manage', name: 'Manage Students', category: 'Students', description: 'Can enroll or edit student profiles' },

    // Attendance Management
    { code: 'attendance:manage', name: 'Manage Attendance', category: 'Attendance', description: 'Can mark and view student attendance records' },

    // Document & Report Uploads
    { code: 'documents:upload', name: 'Upload Student Reports & Files', category: 'Documents', description: 'Can upload Word, PDF, Excel reports' },
    { code: 'documents:view', name: 'View Department Documents', category: 'Documents', description: 'Can view uploaded department files' },
    { code: 'documents:manage', name: 'Manage Documents', category: 'Documents', description: 'Can manage or delete document uploads' },

    // Reports & Analytics
    { code: 'reports:view', name: 'View & Download Reports', category: 'Reports', description: 'Can access reporting dashboard' },

    // Audit Logs
    { code: 'audit:view', name: 'View System Audit Logs', category: 'Audit', description: 'Can view system audit trails' },

    // System Settings & Roles
    { code: 'settings:manage', name: 'Manage College Settings', category: 'Settings', description: 'Can customize college settings' },
    { code: 'roles:manage', name: 'Manage Roles & Permissions', category: 'Settings', description: 'Can configure permissions assigned to each user role' },

    // Announcement Module
    { code: 'announcements:view', name: 'View Campus Announcements', category: 'Announcements', description: 'Can view official institution circulars and announcements' },
    { code: 'announcements:manage', name: 'Manage Announcements', category: 'Announcements', description: 'Exclusive permission to create, edit, target, and delete announcements' },

    // Outcome-Based Education (OBE)
    { code: 'obe:view', name: 'View OBE & Attainment', category: 'Academic', description: 'Can view CO-PO mappings, attainment calculations and reports' },
    { code: 'obe:manage', name: 'Manage OBE Assessments', category: 'Academic', description: 'Can create question paper breakdowns, input marks and sync Excel templates' },
  ];

  const permissions: Record<string, string> = {};
  for (const item of permissionsData) {
    const created = await prisma.permission.create({ data: item });
    permissions[item.code] = created.id;
  }
  console.log(`✅ Initialized ${Object.keys(permissions).length} system permissions.`);

  // 3. System Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'SUPER_ADMIN',
      label: 'Principal / Super Admin',
      description: 'Full overarching access to all departments, HODs, staff, students, and settings across the institution.',
      isSystem: true,
    },
  });

  const hodRole = await prisma.role.create({
    data: {
      name: 'HOD',
      label: 'Head of Department (HOD)',
      description: 'Access strictly restricted to reporting staff, students, attendance, and documents of their assigned department.',
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.create({
    data: {
      name: 'STAFF',
      label: 'Faculty / Teacher',
      description: 'Can manage student attendance, OBE assessments, and upload reports for assigned subjects.',
      isSystem: true,
    },
  });

  // Assign ALL permissions to Super Admin (Principal)
  for (const permId of Object.values(permissions)) {
    await prisma.rolePermission.create({
      data: { roleId: adminRole.id, permissionId: permId },
    });
  }

  // Assign permissions to HOD (Department Head)
  const hodPermCodes = [
    'staff:view', 'staff:edit', 'staff:view_self',
    'academic:view',
    'students:view', 'students:manage',
    'attendance:manage',
    'documents:upload', 'documents:view', 'documents:manage',
    'reports:view',
    'announcements:view',
    'obe:view', 'obe:manage'
  ];
  for (const code of hodPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: hodRole.id, permissionId: permissions[code] },
      });
    }
  }

  // Assign permissions to Staff / Teacher
  const staffPermCodes = [
    'staff:view_self',
    'academic:view',
    'students:view',
    'attendance:manage',
    'documents:upload', 'documents:view',
    'announcements:view',
    'obe:view', 'obe:manage'
  ];
  for (const code of staffPermCodes) {
    if (permissions[code]) {
      await prisma.rolePermission.create({
        data: { roleId: staffRole.id, permissionId: permissions[code] },
      });
    }
  }
  console.log('✅ Configured Roles (SUPER_ADMIN, HOD, STAFF) and mapped permissions.');

  // 4. Academic Designations
  await prisma.designation.createMany({
    data: [
      { code: 'PROF', title: 'Professor', category: 'TEACHING' },
      { code: 'ASSOC_PROF', title: 'Associate Professor', category: 'TEACHING' },
      { code: 'ASST_PROF', title: 'Assistant Professor', category: 'TEACHING' },
      { code: 'HOD_DESIG', title: 'Head of the Department', category: 'TEACHING' },
      { code: 'LAB_ASST', title: 'Laboratory Assistant', category: 'NON_TEACHING' },
      { code: 'ADMIN_OFFICER', title: 'Administrative Officer', category: 'ADMINISTRATIVE' },
    ],
  });
  console.log('✅ Initialized Standard Designations.');

  // 5. College Branding & Institution Settings
  const defaultSettings = [
    { key: 'college_name', value: 'Sri Muthukumaran Institute of Technology', group: 'BRANDING' },
    { key: 'college_short_name', value: 'SMIT', group: 'BRANDING' },
    { key: 'college_tagline', value: 'Approved by AICTE, Affiliated to Anna University, Chennai', group: 'BRANDING' },
    { key: 'primary_color', value: '#701111', group: 'BRANDING' },
    { key: 'secondary_color', value: '#e59835', group: 'BRANDING' },
    { key: 'academic_year', value: '2026-2027', group: 'ACADEMIC' },
    { key: 'current_semester', value: 'Odd Semester', group: 'ACADEMIC' },
    { key: 'contact_email', value: 'info@smit.edu.in', group: 'GENERAL' },
    { key: 'contact_phone', value: '+91 44 2478 0005', group: 'GENERAL' },
  ];
  for (const s of defaultSettings) {
    await prisma.appSetting.create({ data: s });
  }
  console.log('✅ Seeded Default Institution Settings.');

  // 6. Departments (Standard AICTE / Anna University Branches - Clean state, no fake staff)
  const deptCSE = await prisma.department.create({
    data: { code: 'CSE', name: 'Computer Science & Engineering', description: 'Department of Computer Science & Engineering.' },
  });
  const deptECE = await prisma.department.create({
    data: { code: 'ECE', name: 'Electronics & Communication Engineering', description: 'Department of Electronics & Communication Engineering.' },
  });
  const deptAIDS = await prisma.department.create({
    data: { code: 'AIDS', name: 'Artificial Intelligence & Data Science', description: 'Department of AI & Data Science.' },
  });
  const deptMECH = await prisma.department.create({
    data: { code: 'MECH', name: 'Mechanical Engineering', description: 'Department of Mechanical Engineering.' },
  });
  const deptCIVIL = await prisma.department.create({
    data: { code: 'CIVIL', name: 'Civil Engineering', description: 'Department of Civil Engineering.' },
  });
  console.log('✅ Created 5 Core Engineering Departments (CSE, ECE, AIDS, MECH, CIVIL).');

  // 7. Degree Courses & Subjects
  const courseBECSE = await prisma.course.create({
    data: { code: 'BE-CSE', name: 'B.E. Computer Science and Engineering', departmentId: deptCSE.id, degreeType: 'UNDERGRADUATE', durationYears: 4, totalSemesters: 8 },
  });
  const courseBEECE = await prisma.course.create({
    data: { code: 'BE-ECE', name: 'B.E. Electronics and Communication Engineering', departmentId: deptECE.id, degreeType: 'UNDERGRADUATE', durationYears: 4, totalSemesters: 8 },
  });
  const courseBTAIDS = await prisma.course.create({
    data: { code: 'BTECH-AIDS', name: 'B.Tech Artificial Intelligence and Data Science', departmentId: deptAIDS.id, degreeType: 'UNDERGRADUATE', durationYears: 4, totalSemesters: 8 },
  });

  const subjectCS3501 = await prisma.subject.create({
    data: {
      code: 'CS3501',
      name: 'Compiler Design',
      departmentId: deptCSE.id,
      courseId: courseBECSE.id,
      semester: 5,
      credits: 4,
      subjectType: 'THEORY',
      courseType: 'THEORY',
    },
  });

  await prisma.subject.createMany({
    data: [
      { code: 'CS3391', name: 'Object Oriented Programming', departmentId: deptCSE.id, courseId: courseBECSE.id, semester: 3, credits: 3, subjectType: 'THEORY', courseType: 'THEORY' },
      { code: 'CS3452', name: 'Theory of Computation', departmentId: deptCSE.id, courseId: courseBECSE.id, semester: 4, credits: 3, subjectType: 'THEORY', courseType: 'THEORY' },
      { code: 'EC8451', name: 'Digital Signal Processing', departmentId: deptECE.id, courseId: courseBEECE.id, semester: 6, credits: 4, subjectType: 'THEORY', courseType: 'THEORY' },
      { code: 'CS3511', name: 'Compiler Design Laboratory', departmentId: deptCSE.id, courseId: courseBECSE.id, semester: 5, credits: 2, subjectType: 'PRACTICAL', courseType: 'LABORATORY' },
    ],
  });
  console.log('✅ Initialized Academic Degree Courses & Standard Subject Master List.');

  // 8. Program Outcomes (14 Washington Accord Attributes: PO1 - PO12, PSO1, PSO2)
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
  for (const item of poData) {
    await prisma.programOutcome.create({ data: item });
  }
  console.log('✅ Initialized 14 Washington Accord Program Outcomes & PSOs for OBE Framework.');

  // 9. Standard Course Outcomes (CO1 to CO5) for Core Subject CS3501
  await prisma.courseOutcome.createMany({
    data: [
      { subjectId: subjectCS3501.id, code: 'CO1', description: 'Understand the phases of a compiler and build lexical analyzers using lex tools', bloomsLevel: 'K2_UNDERSTAND', targetThresholdPercent: 50.0 },
      { subjectId: subjectCS3501.id, code: 'CO2', description: 'Design top-down and bottom-up parsers, eliminating ambiguities and constructing parse tables', bloomsLevel: 'K3_APPLY', targetThresholdPercent: 50.0 },
      { subjectId: subjectCS3501.id, code: 'CO3', description: 'Generate syntax directed translation schemes and intermediate three-address code representations', bloomsLevel: 'K3_APPLY', targetThresholdPercent: 50.0 },
      { subjectId: subjectCS3501.id, code: 'CO4', description: 'Implement runtime storage management, activation records, and symbol table operations', bloomsLevel: 'K4_ANALYZE', targetThresholdPercent: 50.0 },
      { subjectId: subjectCS3501.id, code: 'CO5', description: 'Apply basic block code optimization techniques and generate target machine assembly code', bloomsLevel: 'K4_ANALYZE', targetThresholdPercent: 50.0 },
    ],
  });
  console.log('✅ Initialized Standard Course Outcomes (CO1 - CO5).');

  // 10. Root Super Administrator Account (Clean Production Account)
  const passwordHash = await bcrypt.hash('Admin@123456', 10);
  const rootAdmin = await prisma.user.create({
    data: {
      employeeId: 'EMP-ADMIN-001',
      email: 'admin@smit.edu.in',
      name: 'System Administrator',
      passwordHash,
      roleId: adminRole.id,
      status: 'ACTIVE',
      mustChangePassword: true, // Forces immediate password change for security
    },
  });

  // 11. Initial Audit Trail Record
  await prisma.auditLog.create({
    data: {
      userId: rootAdmin.id,
      userName: rootAdmin.name,
      userEmail: rootAdmin.email,
      action: 'SYSTEM_INITIALIZED',
      category: 'SYSTEM',
      details: 'College Staff ERP initialized in clean commercial production state for institution deployment.',
    },
  });

  console.log('\n----------------------------------------------------');
  console.log('🎉 COMMERCIAL PRODUCTION SETUP COMPLETED SUCCESSFULLY!');
  console.log('----------------------------------------------------');
  console.log('📊 DATABASE STATUS:');
  console.log('  - Enrolled Students:   0  (Clean Roster)');
  console.log('  - Staff Directory:     0  (Clean Directory)');
  console.log('  - Document Uploads:    0  (Clean Storage)');
  console.log('  - Announcements:       0  (Clean Bulletins)');
  console.log('  - Attendance Records:  0  (Clean Tracking)');
  console.log('  - Assessment Marks:    0  (Clean OBE Engine)');
  console.log('  - Departments:         5  (CSE, ECE, AIDS, MECH, CIVIL)');
  console.log('  - Roles & Permissions: Configured & Verified');
  console.log('  - OBE Outcomes:        14 POs/PSOs + Bloom\'s Levels Initialized');
  console.log('----------------------------------------------------');
  console.log('🔑 ROOT ADMINISTRATOR CREDENTIALS:');
  console.log('  - Email:        admin@smit.edu.in');
  console.log('  - Employee ID:  EMP-ADMIN-001');
  console.log('  - Password:     Admin@123456');
  console.log('  - First Login:  Prompts to set a new custom password');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error initializing database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

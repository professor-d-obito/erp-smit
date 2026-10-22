import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Users,
  Building2,
  BookOpen,
  UserCheck,
  UserPlus,
  FileText,
  Activity,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  FolderOpen,
  Upload,
  Megaphone,
  Pin,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  CreditCard,
  BookOpenCheck,
} from 'lucide-react';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) return null;

  // Role-scoped fetch for Announcements Widget
  let announcementWhere: any = {};
  if (user.roleName === 'HOD') {
    announcementWhere = { targetAudience: { in: ['ALL', 'HOD'] }, status: 'PUBLISHED' };
  } else if (user.roleName === 'STAFF') {
    announcementWhere = { targetAudience: { in: ['ALL', 'STAFF'] }, status: 'PUBLISHED' };
  } else {
    // SUPER_ADMIN
    announcementWhere = {};
  }

  const latestAnnouncements = await prisma.announcement.findMany({
    where: announcementWhere,
    take: 3,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    include: {
      author: {
        select: { name: true, role: { select: { label: true } } },
      },
    },
  });

  // Render Announcements Card Component
  const AnnouncementsWidget = (
    <Card className="border-amber-200/80 bg-gradient-to-br from-white via-amber-50/20 to-amber-100/10 shadow-md">
      <CardHeader className="flex items-center justify-between border-b border-amber-100 bg-amber-500/10 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-smit-950 font-bold shadow-xs">
            <Megaphone className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-smit-900 uppercase tracking-wider flex items-center gap-1.5">
              Campus Circulars & Bulletins
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            </h3>
            <p className="text-[10px] text-slate-500">Official institution communications</p>
          </div>
        </div>
        <Link
          href="/announcements"
          className="text-xs font-extrabold text-amber-700 hover:text-amber-900 flex items-center gap-1 transition-colors"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardBody className="p-0 divide-y divide-amber-100/60">
        {latestAnnouncements.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No active announcements.
          </div>
        ) : (
          latestAnnouncements.map((item) => (
            <div key={item.id} className="p-4 hover:bg-amber-50/40 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  {item.isPinned && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-400 text-smit-950 text-[9px] font-extrabold uppercase flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5 fill-smit-950" /> Pinned
                    </span>
                  )}
                  <span
                    className={`text-[9px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      item.priority === 'URGENT'
                        ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                        : item.priority === 'HIGH'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Target: {item.targetAudience}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h4 className="text-xs font-extrabold text-slate-900 mb-1">{item.title}</h4>
              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                {item.content}
              </p>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>By {item.author?.name || 'Principal'} ({item.author?.role?.label || 'Super Admin'})</span>
                <Link
                  href="/announcements"
                  className="text-amber-800 font-bold hover:underline flex items-center gap-0.5"
                >
                  Read details <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );

  // 1. SUPER ADMIN (PRINCIPAL) DASHBOARD
  if (user.roleName === 'SUPER_ADMIN') {
    const [
      totalStaff,
      activeStaffCount,
      deptCount,
      studentCount,
      documentCount,
      recentDocs,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.department.count({ where: { status: 'ACTIVE' } }),
      prisma.student.count(),
      prisma.documentUpload.count(),
      prisma.documentUpload.findMany({
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: { department: true, uploadedByUser: true },
      }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return (
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-2xl border border-white/20">
          <div
            className="absolute inset-0 bg-cover bg-center z-0 scale-105 transform transition-transform duration-1000"
            style={{ backgroundImage: "url('/smit-building.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-[#701111]/85 to-black/80 z-0 backdrop-blur-[1px]" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-3xl space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="admin">Principal / Super Admin View</Badge>
                <span className="text-xs text-amber-300 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  • Sri Muthukumaran Institute of Technology
                </span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
                Welcome, {user.name}
              </h2>
              <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed drop-shadow-sm font-medium">
                Overarching administrative visibility across all 5 departments (CSE, ECE, AIDS, MECH, CIVIL). Control announcements, HODs, faculty rosters, student data, attendance, and document uploads.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Link href="/announcements">
                <Button variant="gold" size="sm" icon={<Megaphone className="h-4 w-4" />}>
                  Manage Circulars
                </Button>
              </Link>
              <Link href="/staff">
                <Button variant="outline" size="sm" className="text-white border-white/30 hover:bg-white/20 backdrop-blur-md" icon={<UserPlus className="h-4 w-4" />}>
                  Staff Directory
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Primary Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Staff & HODs"
            value={activeStaffCount}
            subtitle={`${totalStaff} total system accounts`}
            icon={<Users className="h-6 w-6 text-white" />}
            colorBg="bg-[#701111]"
          />
          <StatCard
            title="Departments"
            value={deptCount}
            subtitle="Active Engineering Branches"
            icon={<Building2 className="h-6 w-6 text-white" />}
            colorBg="bg-blue-700"
          />
          <StatCard
            title="Enrolled Students"
            value={studentCount}
            subtitle="Branch-wise student rosters"
            icon={<GraduationCap className="h-6 w-6 text-white" />}
            colorBg="bg-amber-600"
          />
          <StatCard
            title="Uploaded Reports"
            value={documentCount}
            subtitle="Word, PDF & Excel documents"
            icon={<FolderOpen className="h-6 w-6 text-white" />}
            colorBg="bg-emerald-700"
          />
        </div>

        {/* Quick Actions Panel */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#701111]">Principal Quick Control Panel</span>
            <span className="text-xs text-slate-500">Shortcuts to main modules</span>
          </CardHeader>
          <CardBody className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Link href="/announcements" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <Megaphone className="h-5 w-5 text-amber-600 group-hover:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold">Announcements</span>
            </Link>
            <Link href="/attendance" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <UserCheck className="h-5 w-5 text-emerald-600 group-hover:text-emerald-400 mb-1.5" />
              <span className="text-xs font-bold">Fast Attendance</span>
            </Link>
            <Link href="/exams" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <BookOpenCheck className="h-5 w-5 text-sky-600 group-hover:text-sky-400 mb-1.5" />
              <span className="text-xs font-bold">Exam Results</span>
            </Link>
            <Link href="/fees" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <CreditCard className="h-5 w-5 text-purple-600 group-hover:text-purple-400 mb-1.5" />
              <span className="text-xs font-bold">Fee Payments</span>
            </Link>
            <Link href="/staff" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <UserPlus className="h-5 w-5 text-[#701111] group-hover:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold">Staff Directory</span>
            </Link>
            <Link href="/students" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <GraduationCap className="h-5 w-5 text-[#701111] group-hover:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold">Student Roster</span>
            </Link>
            <Link href="/documents" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <FolderOpen className="h-5 w-5 text-[#701111] group-hover:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold">Word/PDF Files</span>
            </Link>
            <Link href="/reports" className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#701111] hover:text-white transition-all text-center group">
              <FileText className="h-5 w-5 text-[#701111] group-hover:text-amber-400 mb-1.5" />
              <span className="text-xs font-bold">Analytics & Export</span>
            </Link>
          </CardBody>
        </Card>

        {/* Announcements & Recent Uploaded Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {AnnouncementsWidget}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-[#701111]" />
                  <span className="text-sm font-bold text-[#701111]">Latest Teacher Document Uploads</span>
                </div>
                <Link href="/documents" className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardBody className="divide-y divide-slate-100 p-0">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{doc.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-[#701111]">
                        {doc.department.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Uploaded by {doc.uploadedByUser.name} • {doc.fileType} format ({doc.fileName})
                    </p>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[#701111]" />
                  <span className="text-sm font-bold text-[#701111]">Audit & Action Log</span>
                </div>
                <Link href="/audit-logs" className="text-xs font-semibold text-amber-600 hover:underline flex items-center gap-1">
                  Full Audit Trail <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardBody className="divide-y divide-slate-100 p-0">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="p-3.5 text-xs hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="text-[#701111] font-bold">{log.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 text-[11px] line-clamp-1">{log.details}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 2. DEPARTMENT HEAD (HOD) DASHBOARD
  if (user.roleName === 'HOD') {
    const department = user.departmentId
      ? await prisma.department.findUnique({
          where: { id: user.departmentId },
          include: {
            courses: true,
            subjects: true,
            staff: {
              include: { user: { include: { role: true } }, designation: true },
            },
            students: true,
            documents: {
              take: 5,
              orderBy: { createdAt: 'desc' },
              include: { uploadedByUser: true },
            },
          },
        })
      : null;

    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-2xl border border-white/20">
          <div
            className="absolute inset-0 bg-cover bg-center z-0 scale-105 transform transition-transform duration-1000"
            style={{ backgroundImage: "url('/smit-building.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-[#701111]/85 to-black/80 z-0 backdrop-blur-[1px]" />

          <div className="relative z-10 space-y-2">
            <Badge variant="hod">Department Head Dashboard</Badge>
            <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
              {department?.name || 'Department Management'}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed font-medium max-w-3xl">
              Strict Branch-Wise Data Isolation Active for <strong>{department?.code}</strong>. You have control and management access strictly for reporting staff, students, and document uploads within your department.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard
            title="Reporting Staff"
            value={department?.staff.length || 0}
            subtitle="Faculty Members"
            icon={<Users className="h-6 w-6 text-white" />}
            colorBg="bg-[#701111]"
          />
          <StatCard
            title="Department Students"
            value={department?.students.length || 0}
            subtitle="Enrolled Roster"
            icon={<GraduationCap className="h-6 w-6 text-white" />}
            colorBg="bg-blue-700"
          />
          <StatCard
            title="Department Documents"
            value={department?.documents.length || 0}
            subtitle="Uploaded Reports"
            icon={<FolderOpen className="h-6 w-6 text-white" />}
            colorBg="bg-emerald-700"
          />
          <StatCard
            title="Offered Courses"
            value={department?.courses.length || 0}
            subtitle="Degree Curriculums"
            icon={<BookOpen className="h-6 w-6 text-white" />}
            colorBg="bg-amber-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {AnnouncementsWidget}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#701111]">Reporting Staff in {department?.code}</span>
                <Link href="/staff" className="text-xs font-semibold text-amber-600 hover:underline">
                  Manage Directory
                </Link>
              </CardHeader>
              <CardBody className="p-0 divide-y divide-slate-100">
                {department?.staff.map((sp) => (
                  <div key={sp.id} className="flex items-center justify-between p-4 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900">{sp.user.name}</h4>
                      <p className="text-slate-500 text-[11px]">{sp.user.email} • {sp.designation?.title || 'Faculty'}</p>
                    </div>
                    <Badge variant={sp.user.status === 'ACTIVE' ? 'active' : 'inactive'}>{sp.user.status}</Badge>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#701111]">Staff Uploaded Word/PDF/Excel Reports</span>
                <Link href="/documents" className="text-xs font-semibold text-amber-600 hover:underline">
                  View All Files
                </Link>
              </CardHeader>
              <CardBody className="p-0 divide-y divide-slate-100">
                {department?.documents.map((doc) => (
                  <div key={doc.id} className="p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">{doc.title}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                        {doc.fileType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Uploaded by {doc.uploadedByUser.name} ({doc.fileName})</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // 3. STAFF / TEACHER DASHBOARD
  const myProfile = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      role: true,
      staffProfile: {
        include: { department: true, designation: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-8 text-white shadow-2xl border border-white/20">
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105 transform transition-transform duration-1000"
          style={{ backgroundImage: "url('/smit-building.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-[#701111]/85 to-black/80 z-0 backdrop-blur-[1px]" />

        <div className="relative z-10 space-y-2">
          <Badge variant="staff">Faculty / Teacher Portal</Badge>
          <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">
            Welcome, {user.name}
          </h2>
          <p className="text-xs sm:text-sm text-amber-100/90 font-medium">
            Employee ID: <span className="font-bold text-amber-300">{user.employeeId}</span> • Department: <strong>{myProfile?.staffProfile?.department?.name || 'Unassigned'}</strong>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {AnnouncementsWidget}
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/attendance" className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-lg hover:shadow-xl hover:border-emerald-600 transition-all flex flex-col items-start space-y-2 group">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Fast Class Attendance</h3>
            <p className="text-xs text-slate-500">Effortless 1-click batch attendance entry and absentee tracking for your classes.</p>
          </Link>
          <Link href="/exams" className="p-5 rounded-2xl bg-white border border-sky-200 shadow-lg hover:shadow-xl hover:border-sky-600 transition-all flex flex-col items-start space-y-2 group">
            <div className="p-2.5 rounded-xl bg-sky-100 text-sky-800 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Exam Results & Marks Entry</h3>
            <p className="text-xs text-slate-500">Fast evaluation spreadsheet, auto letter grade formatting, and student grade cards.</p>
          </Link>
          <Link href="/fees" className="p-5 rounded-2xl bg-white border border-purple-200 shadow-lg hover:shadow-xl hover:border-purple-600 transition-all flex flex-col items-start space-y-2 group">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Student Fee Management</h3>
            <p className="text-xs text-slate-500">Review student fee payment statuses, dues, and official digital receipts.</p>
          </Link>
          <Link href="/documents" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-lg hover:shadow-xl hover:border-[#701111] transition-all flex flex-col items-start space-y-2 group">
            <div className="p-2.5 rounded-xl bg-rose-100 text-[#701111] group-hover:bg-[#701111] group-hover:text-white transition-colors">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-900">Upload Student Reports</h3>
            <p className="text-xs text-slate-500">Upload Word (.docx), PDF marksheets, and Excel files for department records.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

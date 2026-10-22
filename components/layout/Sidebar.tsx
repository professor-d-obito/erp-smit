'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileSpreadsheet,
  History,
  Settings,
  X,
  Award,
  UserCheck,
  FolderOpen,
  Megaphone,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  BookOpenCheck,
} from 'lucide-react';
import { AuthenticatedUser, hasPermission, PERMISSION_CODES, isSuperAdmin, isHOD } from '@/lib/permissions';

interface SidebarProps {
  user: AuthenticatedUser;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, onClose }) => {
  const pathname = usePathname();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Campus Insights',
      show: true,
    },
    {
      label: 'Announcements',
      href: '/announcements',
      icon: Megaphone,
      description: 'Campus Bulletins & Circulars',
      badge: 'Live',
      show: true,
    },
    {
      label: 'Faculty OBE Portal',
      href: '/obe',
      icon: Award,
      description: 'CO-PO Attainment & Assessments',
      badge: 'AU 2021',
      show: true,
    },
    {
      label: 'Staff Directory',
      href: '/staff',
      icon: Users,
      description: 'Faculty & Administrative Roster',
      show: hasPermission(user, PERMISSION_CODES.STAFF_VIEW) || isSuperAdmin(user) || isHOD(user),
    },
    {
      label: 'Students Roster',
      href: '/students',
      icon: GraduationCap,
      description: 'Student Records & Details',
      show: true,
    },
    {
      label: 'Attendance Tracker',
      href: '/attendance',
      icon: UserCheck,
      description: 'Daily Student Attendance',
      show: true,
    },
    {
      label: 'Exam Results',
      href: '/exams',
      icon: BookOpenCheck,
      description: 'Marks Entry, Grade Cards & SGPA',
      show: true,
    },
    {
      label: 'Fee Management',
      href: '/fees',
      icon: CreditCard,
      description: 'Student Fees & Payment Receipts',
      show: true,
    },
    {
      label: 'Documents & Uploads',
      href: '/documents',
      icon: FolderOpen,
      description: 'Word, PDF & Excel Files',
      show: true,
    },
    {
      label: 'Academic Master',
      href: '/academic',
      icon: GraduationCap,
      description: 'Depts, Courses & Subjects',
      show: hasPermission(user, PERMISSION_CODES.ACADEMIC_VIEW) || isSuperAdmin(user) || isHOD(user),
    },
    {
      label: 'Reports & Exports',
      href: '/reports',
      icon: FileSpreadsheet,
      description: 'Analytics & Downloads',
      show: hasPermission(user, PERMISSION_CODES.REPORTS_VIEW) || isSuperAdmin(user) || isHOD(user),
    },
    {
      label: 'Audit Logs',
      href: '/audit-logs',
      icon: History,
      description: 'System Activity Trail',
      show: hasPermission(user, PERMISSION_CODES.AUDIT_VIEW) || isSuperAdmin(user),
    },
    {
      label: 'Settings & Roles',
      href: '/settings',
      icon: Settings,
      description: 'System Config & Privileges',
      show: hasPermission(user, PERMISSION_CODES.SETTINGS_MANAGE) || isSuperAdmin(user),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop with AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-[#4a0e17] via-[#701111] to-[#800000] text-slate-100 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 border-r border-white/10 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-5 bg-black/20">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1 shadow-lg ring-2 ring-amber-400/40 shrink-0"
            >
              <img
                src="/smit-logo.png"
                alt="SMIT Emblem"
                className="max-h-10 max-w-10 object-contain"
              />
            </motion.div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-white leading-tight flex items-center gap-1">
                SMIT ERP
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </h2>
              <p className="text-[10px] text-amber-300 font-semibold">Est. 1996 • Chennai</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-white/10 hover:text-white lg:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Scope Banner */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/5 flex items-center justify-between text-[11px] text-amber-200">
          <span className="flex items-center gap-1.5 font-medium truncate">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{user.roleLabel || user.roleName}</span>
          </span>
          {isSuperAdmin(user) && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase tracking-wider border border-amber-400/30">
              Super Admin
            </span>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-300/80 mb-2">
            Main Navigation
          </p>

          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

              return (
                <div key={item.href} className="relative">
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onMouseEnter={() => setHoveredNav(item.href)}
                    onMouseLeave={() => setHoveredNav(null)}
                  >
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg font-bold border border-amber-300/30'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 transition-transform ${isActive ? 'text-white scale-110' : 'text-amber-400'}`} />
                        <span>{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-400 text-smit-900 shadow-xs animate-pulse">
                            {item.badge}
                          </span>
                        )}
                        <ChevronRight className={`h-3.5 w-3.5 opacity-60 transition-transform ${isActive ? 'translate-x-0.5 opacity-100' : ''}`} />
                      </div>

                      {/* Active Indicator Glow Bar */}
                      {isActive && (
                        <motion.div
                          layoutId="activeSideBarNav"
                          className="absolute left-0 top-1 bottom-1 w-1 bg-white rounded-r"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                    </Link>
                  </motion.div>

                  {/* Dynamic Pop-up Hover Submenu Card */}
                  <AnimatePresence>
                    {hoveredNav === item.href && !isActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -10, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -5, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="hidden lg:block absolute left-full top-0 ml-3 z-50 w-52 p-3 rounded-xl bg-slate-900 text-slate-100 shadow-2xl border border-white/15 backdrop-blur-xl pointer-events-none"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4 text-amber-400 shrink-0" />
                          <p className="text-xs font-bold text-white">{item.label}</p>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-tight">{item.description}</p>
                        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] text-amber-300 font-medium">
                          <span>Click to open</span>
                          <ChevronRight className="h-3 w-3 text-amber-400" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
        </div>

        {/* Footer info banner */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="border-t border-white/10 p-3.5 m-3 rounded-xl bg-black/30 backdrop-blur-md"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
            <Award className="h-4 w-4 text-amber-400 shrink-0" />
            <span className="truncate">Sri Muthukumaran</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-normal">
            Institute of Technology, Mangadu, Chennai
          </p>
        </motion.div>
      </aside>
    </>
  );
};

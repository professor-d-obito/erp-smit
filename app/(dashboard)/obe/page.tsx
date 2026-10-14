'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Layers,
} from 'lucide-react';

interface Assignment {
  id: string;
  academicYear: string;
  semester: number;
  section: string;
  courseType: 'THEORY' | 'LABORATORY' | 'LAB_INTEGRATED_THEORY' | 'PROJECT_VIVA_VOCE';
  faculty: {
    id: string;
    name: string;
    employeeId: string;
    email: string;
  };
  subject: {
    id: string;
    code: string;
    name: string;
    department: { id: string; code: string; name: string };
    course: { id: string; code: string; name: string };
    courseOutcomes: { id: string; code: string; bloomsLevel: string }[];
  };
  _count: {
    roster: number;
    assessments: number;
    attendanceSessions: number;
  };
}

export default function FacultyOBEPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [academicYear, setAcademicYear] = useState('2024-2025');

  useEffect(() => {
    fetchAssignments();
  }, [academicYear]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/obe/assignments?academicYear=${academicYear}`);
      const data = await res.json();
      if (data.assignments) {
        setAssignments(data.assignments);
      }
    } catch (e) {
      console.error('Failed to load OBE assignments:', e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = assignments.filter((a) => {
    const matchesSearch =
      a.subject.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.faculty.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'ALL' || a.courseType === selectedType;
    return matchesSearch && matchesType;
  });

  const getCourseTypeBadge = (type: string) => {
    switch (type) {
      case 'THEORY':
        return { label: 'Theory (40M CA / 60M End-Sem)', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'LABORATORY':
        return { label: 'Laboratory (60M CA / 40M Model)', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'LAB_INTEGRATED_THEORY':
        return { label: 'Lab Integrated Theory (50M / 50M)', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'PROJECT_VIVA_VOCE':
        return { label: 'Project Work / Viva Voce (40M)', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: type, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider text-indigo-100 border border-white/20">
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Outcome-Based Education (OBE) Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Anna University Curriculum & Faculty Assessment
            </h1>
            <p className="text-sm sm:text-base text-indigo-200 max-w-2xl">
              Configure Course Outcomes (CO1–CO6), disaggregate question papers, record student mark matrices with Excel sync, and compute real-time CO-PO attainments and internal marks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[110px]">
              <div className="text-2xl font-black">{assignments.length}</div>
              <div className="text-xs text-indigo-200">Assigned Courses</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[110px]">
              <div className="text-2xl font-black">
                {assignments.reduce((acc, a) => acc + (a._count.assessments || 0), 0)}
              </div>
              <div className="text-xs text-indigo-200">Assessments</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[110px]">
              <div className="text-2xl font-black">
                {assignments.reduce((acc, a) => acc + (a._count.roster || 0), 0)}
              </div>
              <div className="text-xs text-indigo-200">Enrolled Students</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Controls Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject code, name, or faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Curriculum Modes</option>
            <option value="THEORY">Theory</option>
            <option value="LABORATORY">Laboratory</option>
            <option value="LAB_INTEGRATED_THEORY">Lab Integrated Theory</option>
            <option value="PROJECT_VIVA_VOCE">Project Work</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Academic Year:</span>
            <span className="font-semibold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-md">{academicYear}</span>
          </div>
        </div>
      </div>

      {/* Course Assignments Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-20 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-lg mx-auto space-y-4">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-lg font-bold text-gray-800">No Course Assignments Found</h3>
          <p className="text-sm text-gray-500">
            No course assignments match your search filter for academic year {academicYear}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((assignment) => {
            const badge = getCourseTypeBadge(assignment.courseType);
            return (
              <motion.div
                key={assignment.id}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded-md">
                      {assignment.subject.code}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                      {assignment.courseType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-gray-900 line-clamp-1">
                      {assignment.subject.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {assignment.subject.department.name} • Sem {assignment.semester} (Sec {assignment.section})
                    </p>
                  </div>
                </div>

                {/* Faculty & Quick Stats */}
                <div className="p-5 flex-1 space-y-4 text-xs">
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50/80 p-2.5 rounded-lg">
                    <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="truncate">
                      <span className="font-semibold text-gray-800">{assignment.faculty.name}</span>
                      <span className="text-gray-400 block text-[11px]">{assignment.faculty.email}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-50/50 border border-blue-100 p-2 rounded-lg">
                      <span className="block text-sm font-bold text-blue-700">
                        {assignment.subject.courseOutcomes.length || 5}
                      </span>
                      <span className="text-[10px] text-blue-600 font-medium">COs Defined</span>
                    </div>
                    <div className="bg-purple-50/50 border border-purple-100 p-2 rounded-lg">
                      <span className="block text-sm font-bold text-purple-700">
                        {assignment._count.assessments}
                      </span>
                      <span className="text-[10px] text-purple-600 font-medium">Assessments</span>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-2 rounded-lg">
                      <span className="block text-sm font-bold text-emerald-700">
                        {assignment._count.roster}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">Students</span>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 bg-gray-50/60 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <Link
                    href={`/obe/courses/${assignment.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-sm"
                  >
                    <span>OBE Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/obe/attendance/${assignment.id}`}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs border border-gray-200 rounded-lg transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Attendance</span>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

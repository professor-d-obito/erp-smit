'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Search,
  CheckCheck,
  AlertCircle,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Users,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface Student {
  id: string;
  rollNumber: string;
  name: string;
  section: string;
  semester: number;
  department: { id: string; code: string; name: string };
  course?: { id: string; code: string; name: string };
}

interface ClassAttendanceItem {
  studentId: string;
  rollNumber: string;
  name: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_DUTY';
  remarks: string;
}

interface AttendanceLog {
  id: string;
  status: string;
  remarks: string | null;
  date: string;
  hour: number | null;
  student: { rollNumber: string; name: string };
  subject?: { code: string; name: string } | null;
  department: { code: string; name: string };
  markedByUser: { name: string };
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<'quick_entry' | 'history'>('quick_entry');

  // Filter & Class Selection States
  const [courses, setCourses] = useState<{ id: string; code: string; name: string; departmentId: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; code: string; name: string; semester: number }[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('5');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedHour, setSelectedHour] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Students & Batch Attendance State
  const [roster, setRoster] = useState<ClassAttendanceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // History Log States
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilterDate, setLogFilterDate] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('ALL');

  useEffect(() => {
    fetchMetadata();
    fetchLogs();
  }, []);

  // Fetch Courses & Subjects
  const fetchMetadata = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        fetch('/api/academic/courses'),
        fetch('/api/academic/subjects'),
      ]);
      const cData = await cRes.json();
      const sData = await sRes.json();

      if (cData.data && cData.data.length > 0) {
        setCourses(cData.data);
        setSelectedCourseId(cData.data[0].id);
      }
      if (sData.data && sData.data.length > 0) {
        setSubjects(sData.data);
        setSelectedSubjectId(sData.data[0].id);
      }
    } catch (e) {
      console.error('Error fetching academic metadata:', e);
    }
  };

  // Load Class Roster
  const handleLoadClassRoster = async () => {
    if (!selectedCourseId) return;
    setLoadingRoster(true);
    setToastMessage(null);
    try {
      // 1. Fetch Students matching Course, Semester, Section
      const stUrl = `/api/students?courseId=${selectedCourseId}&semester=${selectedSemester}&section=${selectedSection}&limit=100`;
      const stRes = await fetch(stUrl);
      const stData = await stRes.json();
      const loadedStudents: Student[] = stData.data || [];

      // 2. Fetch existing attendance for this class on this date & hour
      const attUrl = `/api/attendance?date=${selectedDate}&hour=${selectedHour}${selectedSubjectId ? `&subjectId=${selectedSubjectId}` : ''}&limit=100`;
      const attRes = await fetch(attUrl);
      const attData = await attRes.json();
      const existingRecords: AttendanceLog[] = attData.data || [];

      const existingStatusMap = new Map<string, { status: any; remarks: string | null }>();
      existingRecords.forEach((rec: any) => {
        if (rec.student?.id) {
          existingStatusMap.set(rec.student.id, { status: rec.status, remarks: rec.remarks });
        }
      });

      // 3. Build Roster (Default everyone to PRESENT if not previously marked!)
      const initialRoster: ClassAttendanceItem[] = loadedStudents.map((st) => {
        const existing = existingStatusMap.get(st.id);
        return {
          studentId: st.id,
          rollNumber: st.rollNumber,
          name: st.name,
          status: (existing?.status as any) || 'PRESENT',
          remarks: existing?.remarks || '',
        };
      });

      setRoster(initialRoster);
      if (initialRoster.length === 0) {
        setToastMessage({
          type: 'error',
          text: `No students enrolled in Semester ${selectedSemester}, Section ${selectedSection} for this course. Please enroll students or adjust filters.`,
        });
      } else {
        setToastMessage({
          type: 'success',
          text: `Loaded ${initialRoster.length} students. Ready for quick attendance entry!`,
        });
      }
    } catch (err) {
      console.error('Failed to load class roster:', err);
      setToastMessage({ type: 'error', text: 'Failed to load class roster.' });
    } finally {
      setLoadingRoster(false);
    }
  };

  // Quick Action: Mark All Present
  const handleMarkAllPresent = () => {
    setRoster((prev) => prev.map((item) => ({ ...item, status: 'PRESENT' })));
  };

  // Quick Action: Mark All Absent
  const handleMarkAllAbsent = () => {
    setRoster((prev) => prev.map((item) => ({ ...item, status: 'ABSENT' })));
  };

  // Toggle single student status
  const handleToggleStatus = (studentId: string, newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_DUTY') => {
    setRoster((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, status: newStatus } : item))
    );
  };

  // Update remarks for a student
  const handleRemarkChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, remarks } : item))
    );
  };

  // Save Batch Attendance
  const handleSaveBatchAttendance = async () => {
    if (roster.length === 0) return;
    setSavingBatch(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: roster.map((r) => ({
            studentId: r.studentId,
            status: r.status,
            remarks: r.remarks,
          })),
          subjectId: selectedSubjectId || undefined,
          date: selectedDate,
          hour: Number(selectedHour),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage({
          type: 'success',
          text: `Attendance saved successfully! (${data.stats.present} Present, ${data.stats.absent} Absent, ${data.stats.late} Late, ${data.stats.onDuty} OD)`,
        });
        fetchLogs();
      } else {
        setToastMessage({ type: 'error', text: data.error || 'Failed to save attendance.' });
      }
    } catch (e) {
      setToastMessage({ type: 'error', text: 'Error submitting attendance records.' });
    } finally {
      setSavingBatch(false);
    }
  };

  // Fetch Attendance Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      let url = '/api/attendance?limit=50';
      if (logFilterDate) url += `&date=${logFilterDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.data) {
        setAttendanceLogs(data.data);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Filtered Roster for UI
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase();
    return roster.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q)
    );
  }, [roster, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = roster.length;
    const present = roster.filter((r) => r.status === 'PRESENT').length;
    const absent = roster.filter((r) => r.status === 'ABSENT').length;
    const late = roster.filter((r) => r.status === 'LATE').length;
    const onDuty = roster.filter((r) => r.status === 'ON_DUTY').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, onDuty, percentage };
  }, [roster]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#701111] via-[#851616] to-[#9c1c1c] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            Fast-Track Faculty Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight">Smart Attendance Command Center</h1>
          <p className="text-xs text-amber-100/90 mt-1">
            Effortless 1-tap whole-class attendance entry, instant absentees marking, and real-time attendance registers.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-black/25 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('quick_entry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'quick_entry'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <CheckCheck className="h-4 w-4" />
            Quick Class Entry
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              fetchLogs();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Attendance History
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-md transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : 'bg-rose-50 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {activeTab === 'quick_entry' ? (
        <div className="space-y-6">
          {/* Class Selector Panel */}
          <Card className="p-5 shadow-lg border-t-4 border-t-[#701111]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-sm font-extrabold text-[#701111] flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                Select Class, Subject & Session Details
              </h2>
              <span className="text-xs text-slate-500 font-medium">Step 1: Choose Class to Load Roster</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              {/* Course */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Course / Degree *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Semester *</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Section *</label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {['A', 'B', 'C', 'D'].map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject (Optional)</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  <option value="">-- General / Daily --</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                />
              </div>

              {/* Hour / Period */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Period / Hour *</label>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <option key={h} value={h}>
                      Hour {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleLoadClassRoster}
                disabled={loadingRoster}
                className="bg-[#701111] hover:bg-[#580d0d] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
              >
                {loadingRoster ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading Students...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    Load Class Roster
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Quick Attendance Entry Table & Actions */}
          {roster.length > 0 && (
            <div className="space-y-4">
              {/* Live Statistics & Bulk Actions Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{stats.total} Students</p>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Present</p>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900">
                      {stats.percentage}%
                    </span>
                  </div>
                  <p className="text-xl font-black text-emerald-800 mt-1">{stats.present}</p>
                </div>
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-xs">
                  <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Absent</p>
                  <p className="text-xl font-black text-rose-800 mt-1">{stats.absent}</p>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-xs">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Late</p>
                  <p className="text-xl font-black text-amber-800 mt-1">{stats.late}</p>
                </div>
                <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200 shadow-xs col-span-2 sm:col-span-4 lg:col-span-1">
                  <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">On Duty (OD)</p>
                  <p className="text-xl font-black text-sky-800 mt-1">{stats.onDuty}</p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or roll number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 font-medium focus:ring-2 focus:ring-[#701111]"
                  />
                </div>

                {/* Bulk Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleMarkAllPresent}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                  >
                    <CheckCheck className="h-4 w-4" />
                    Mark All Present
                  </button>
                  <button
                    onClick={handleMarkAllAbsent}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    Mark All Absent
                  </button>
                </div>
              </div>

              {/* Student Roster Cards List */}
              <Card className="shadow-lg overflow-hidden border border-slate-200">
                <div className="divide-y divide-slate-100">
                  {filteredRoster.map((student, idx) => (
                    <div
                      key={student.studentId}
                      className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                        student.status === 'ABSENT'
                          ? 'bg-rose-50/60'
                          : student.status === 'LATE'
                          ? 'bg-amber-50/60'
                          : student.status === 'ON_DUTY'
                          ? 'bg-sky-50/60'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Student Identification */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black shadow-xs shrink-0 ${
                            student.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : student.status === 'ABSENT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 ring-2 ring-rose-400'
                              : student.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-sky-100 text-sky-800 border border-sky-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900">{student.name}</span>
                            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {student.rollNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Section {selectedSection} • Semester {selectedSemester}
                          </p>
                        </div>
                      </div>

                      {/* Quick 1-Tap Status Selector */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Pills */}
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                          {/* Present */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.studentId, 'PRESENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                              student.status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            P
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.studentId, 'ABSENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                              student.status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            A
                          </button>

                          {/* Late */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.studentId, 'LATE')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                              student.status === 'LATE'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5" />
                            L
                          </button>

                          {/* On Duty */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.studentId, 'ON_DUTY')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                              student.status === 'ON_DUTY'
                                ? 'bg-sky-600 text-white shadow-xs'
                                : 'text-slate-600 hover:bg-sky-50 hover:text-sky-800'
                            }`}
                          >
                            OD
                          </button>
                        </div>

                        {/* Inline Remarks Input */}
                        <input
                          type="text"
                          placeholder="Remarks / Note (optional)..."
                          value={student.remarks}
                          onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                          className="w-44 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 focus:ring-1 focus:ring-[#701111]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Sticky Submit Bar */}
              <div className="sticky bottom-4 z-20 bg-slate-900/90 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-amber-300">Class Attendance Summary:</span>{' '}
                    <span>
                      {stats.present} Present ({stats.percentage}%) • {stats.absent} Absent • {stats.late} Late •{' '}
                      {stats.onDuty} OD
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSaveBatchAttendance}
                  disabled={savingBatch}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {savingBatch ? (
                    <>
                      <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Saving Class Attendance...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="h-4 w-4 text-slate-950" />
                      Submit & Save Class Attendance
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History & Register View */
        <Card className="p-6 space-y-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#701111]" />
                Institutional Attendance Register & Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review logged attendance records by date, subject, and student roll number.
              </p>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={logFilterDate}
                onChange={(e) => setLogFilterDate(e.target.value)}
                className="text-xs p-2 rounded-lg border border-slate-300 font-medium"
              />
              <Button
                onClick={fetchLogs}
                className="bg-[#701111] hover:bg-[#580d0d] text-white text-xs px-3 py-2 rounded-lg font-bold"
              >
                Filter
              </Button>
              {logFilterDate && (
                <button
                  onClick={() => {
                    setLogFilterDate('');
                    setTimeout(fetchLogs, 50);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Subject / Period</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Remarks</th>
                  <th className="p-3">Marked By</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-500">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : attendanceLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-500">
                      No attendance entries found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{log.student.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{log.student.rollNumber}</div>
                      </td>
                      <td className="p-3 text-slate-700">
                        <div className="font-bold text-[#701111]">
                          {log.subject ? `${log.subject.code} - ${log.subject.name}` : 'General Session'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Period / Hour: {log.hour || 1}
                        </div>
                      </td>
                      <td className="p-3 font-bold text-slate-700">{log.department.code}</td>
                      <td className="p-3">
                        {log.status === 'PRESENT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> PRESENT
                          </span>
                        )}
                        {log.status === 'ABSENT' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-800">
                            <XCircle className="h-3 w-3" /> ABSENT
                          </span>
                        )}
                        {log.status === 'LATE' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                            <Clock className="h-3 w-3" /> LATE
                          </span>
                        )}
                        {log.status === 'ON_DUTY' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-800">
                            ON DUTY
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 italic max-w-xs truncate">
                        {log.remarks || '—'}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">{log.markedByUser.name}</td>
                      <td className="p-3 text-slate-500 font-mono">
                        {new Date(log.date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

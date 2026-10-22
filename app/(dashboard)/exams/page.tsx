'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  BookOpenCheck,
  GraduationCap,
  Award,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';

interface ExamSession {
  id: string;
  title: string;
  examType: string;
  academicYear: string;
  semester: number;
  isPublished: boolean;
  _count?: { results: number };
}

interface StudentItem {
  id: string;
  rollNumber: string;
  name: string;
  semester: number;
  section: string;
  department: { code: string; name: string };
  course: { code: string; name: string };
}

interface MarkRow {
  studentId: string;
  rollNumber: string;
  name: string;
  internalMarks: number;
  externalMarks: number;
  isAbsent: boolean;
  remarks: string;
}

export default function ExamResultsPage() {
  const [activeTab, setActiveTab] = useState<'entry' | 'report_card' | 'sessions'>('entry');

  // Metadata
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; code: string; name: string; semester: number }[]>([]);

  // Selection states for Marks Entry
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('5');
  const [selectedSection, setSelectedSection] = useState('A');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  // Roster & Marks
  const [markRows, setMarkRows] = useState<MarkRow[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Student Report Card States
  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // New Exam Modal
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState('April/May 2026 End Semester Examinations');
  const [newExamType, setNewExamType] = useState('SEMESTER');
  const [newExamYear, setNewExamYear] = useState('2026-2027');
  const [newExamSem, setNewExamSem] = useState('5');
  const [submittingExam, setSubmittingExam] = useState(false);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [eRes, cRes, sRes, stRes] = await Promise.all([
        fetch('/api/exams/sessions'),
        fetch('/api/academic/courses'),
        fetch('/api/academic/subjects'),
        fetch('/api/students?limit=100'),
      ]);

      const eData = await eRes.json();
      const cData = await cRes.json();
      const sData = await sRes.json();
      const stData = await stRes.json();

      if (eData.success && eData.data.length > 0) {
        setExams(eData.data);
        setSelectedExamId(eData.data[0].id);
      }
      if (cData.data && cData.data.length > 0) {
        setCourses(cData.data);
        setSelectedCourseId(cData.data[0].id);
      }
      if (sData.data && sData.data.length > 0) {
        setSubjects(sData.data);
        setSelectedSubjectId(sData.data[0].id);
      }
      if (stData.data && stData.data.length > 0) {
        setAllStudents(stData.data);
        setSelectedReportStudentId(stData.data[0].id);
      }
    } catch (e) {
      console.error('Error fetching exam metadata:', e);
    }
  };

  // Load Class Roster for Mark Entry
  const handleLoadClassRoster = async () => {
    if (!selectedCourseId || !selectedSubjectId || !selectedExamId) {
      alert('Please select an Exam Session, Course, and Subject.');
      return;
    }

    setLoadingRoster(true);
    setToastMessage(null);
    try {
      // 1. Fetch Students
      const stRes = await fetch(
        `/api/students?courseId=${selectedCourseId}&semester=${selectedSemester}&section=${selectedSection}&limit=100`
      );
      const stData = await stRes.json();
      const students: StudentItem[] = stData.data || [];

      // 2. Fetch Existing Results for this Exam & Subject
      const rRes = await fetch(
        `/api/exams/results?examId=${selectedExamId}&subjectId=${selectedSubjectId}`
      );
      const rData = await rRes.json();
      const existingResults: any[] = rData.data || [];

      const existingMap = new Map<string, any>();
      existingResults.forEach((r) => existingMap.set(r.studentId, r));

      // 3. Build Mark Rows
      const rows: MarkRow[] = students.map((st) => {
        const existing = existingMap.get(st.id);
        return {
          studentId: st.id,
          rollNumber: st.rollNumber,
          name: st.name,
          internalMarks: existing ? existing.internalMarks || 0 : 35,
          externalMarks: existing ? existing.externalMarks || 0 : 45,
          isAbsent: existing ? existing.resultStatus === 'AB' : false,
          remarks: existing?.remarks || '',
        };
      });

      setMarkRows(rows);
      if (rows.length === 0) {
        setToastMessage({
          type: 'error',
          text: `No students enrolled in Semester ${selectedSemester}, Section ${selectedSection}. Please verify class filters.`,
        });
      } else {
        setToastMessage({
          type: 'success',
          text: `Loaded ${rows.length} students. Enter internal & external marks below.`,
        });
      }
    } catch (err) {
      console.error('Error loading roster:', err);
      setToastMessage({ type: 'error', text: 'Failed to load class students.' });
    } finally {
      setLoadingRoster(false);
    }
  };

  // Live Grade Calculator
  const getGradeInfo = (internal: number, external: number, isAbsent: boolean) => {
    if (isAbsent) return { grade: 'AB', points: 0.0, isPass: false };
    const total = Math.min(100, (Number(internal) || 0) + (Number(external) || 0));
    if (total >= 91) return { grade: 'O', points: 10.0, isPass: true };
    if (total >= 81) return { grade: 'A+', points: 9.0, isPass: true };
    if (total >= 71) return { grade: 'A', points: 8.0, isPass: true };
    if (total >= 61) return { grade: 'B+', points: 7.0, isPass: true };
    if (total >= 56) return { grade: 'B', points: 6.0, isPass: true };
    if (total >= 50) return { grade: 'C', points: 5.0, isPass: true };
    return { grade: 'RA', points: 0.0, isPass: false };
  };

  // Update a single mark row
  const updateRow = (index: number, field: keyof MarkRow, value: any) => {
    setMarkRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Submit Batch Marks
  const handleSubmitMarks = async () => {
    if (markRows.length === 0 || !selectedExamId || !selectedSubjectId) return;

    setSubmittingMarks(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/exams/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: selectedSubjectId,
          results: markRows.map((r) => ({
            studentId: r.studentId,
            internalMarks: Number(r.internalMarks) || 0,
            externalMarks: Number(r.externalMarks) || 0,
            isAbsent: r.isAbsent,
            remarks: r.remarks,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setToastMessage({
          type: 'success',
          text: `Marks saved successfully! (${data.stats.passed} Passed, ${data.stats.failed} Re-appear, Pass: ${data.stats.passPercentage}%)`,
        });
      } else {
        setToastMessage({ type: 'error', text: data.error || 'Failed to save marks.' });
      }
    } catch (e) {
      setToastMessage({ type: 'error', text: 'Error recording student marks.' });
    } finally {
      setSubmittingMarks(false);
    }
  };

  // Fetch Student Report Card
  const handleLoadReportCard = async (studentId: string) => {
    if (!studentId) return;
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/exams/student-report/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (e) {
      console.error('Error fetching student report:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  // Create New Exam Session
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle) return;

    setSubmittingExam(true);
    try {
      const res = await fetch('/api/exams/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newExamTitle,
          examType: newExamType,
          academicYear: newExamYear,
          semester: parseInt(newExamSem, 10),
          isPublished: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsExamModalOpen(false);
        fetchMetadata();
      } else {
        alert(data.error || 'Failed to create exam session.');
      }
    } catch (err) {
      alert('Error creating exam session.');
    } finally {
      setSubmittingExam(false);
    }
  };

  // Marks Summary Stats
  const entryStats = useMemo(() => {
    const total = markRows.length;
    let pass = 0;
    let fail = 0;
    let abs = 0;
    let sumMarks = 0;

    markRows.forEach((r) => {
      const { isPass } = getGradeInfo(r.internalMarks, r.externalMarks, r.isAbsent);
      if (r.isAbsent) abs++;
      else if (isPass) pass++;
      else fail++;

      if (!r.isAbsent) {
        sumMarks += (Number(r.internalMarks) || 0) + (Number(r.externalMarks) || 0);
      }
    });

    const passPct = total > 0 ? Math.round((pass / total) * 100) : 0;
    const avg = total - abs > 0 ? Math.round((sumMarks / (total - abs)) * 10) / 10 : 0;
    return { total, pass, fail, abs, passPct, avg };
  }, [markRows]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#701111] via-[#851616] to-[#9c1c1c] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 mb-2">
            <Award className="h-3.5 w-3.5" />
            Controller of Examinations (CoE) Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight">Academic Exam Results & Grade Cards</h1>
          <p className="text-xs text-amber-100/90 mt-1">
            Spreadsheet-style faculty marks entry, Anna University 10-point scale grade formulations, SGPA calculators, and printable transcripts.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center bg-black/25 p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'entry'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Teacher Marks Sheet
          </button>
          <button
            onClick={() => {
              setActiveTab('report_card');
              if (selectedReportStudentId) handleLoadReportCard(selectedReportStudentId);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'report_card'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Student Grade Card
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sessions'
                ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-100 hover:text-white hover:bg-white/10'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Exam Sessions
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

      {/* TAB 1: TEACHER MARKS ENTRY SHEET */}
      {activeTab === 'entry' && (
        <div className="space-y-6">
          {/* Class & Exam Selector Panel */}
          <Card className="p-5 shadow-lg border-t-4 border-t-[#701111]">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-sm font-extrabold text-[#701111] flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-amber-600" />
                Select Examination Session & Subject
              </h2>
              <span className="text-xs text-slate-500 font-medium">Step 1: Choose Target Subject & Class</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
              {/* Exam Session */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Exam Session *</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.academicYear})
                    </option>
                  ))}
                </select>
              </div>

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
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
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
                  {['A', 'B', 'C'].map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
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
                    <FileSpreadsheet className="h-4 w-4" />
                    Load Evaluation Sheet
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Marks Entry Spreadsheet Table */}
          {markRows.length > 0 && (
            <div className="space-y-4">
              {/* Analytics KPI Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Enrolled Candidates</p>
                  <p className="text-xl font-black text-slate-900 mt-1">{entryStats.total}</p>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-xs">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase">Passing Candidates</p>
                  <p className="text-xl font-black text-emerald-800 mt-1">{entryStats.pass}</p>
                </div>
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-xs">
                  <p className="text-[11px] font-bold text-rose-700 uppercase">Arrears / Re-appear</p>
                  <p className="text-xl font-black text-rose-800 mt-1">{entryStats.fail}</p>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-xs">
                  <p className="text-[11px] font-bold text-amber-700 uppercase">Class Pass %</p>
                  <p className="text-xl font-black text-amber-800 mt-1">{entryStats.passPct}%</p>
                </div>
                <div className="bg-sky-50 p-3.5 rounded-xl border border-sky-200 shadow-xs col-span-2 sm:col-span-1">
                  <p className="text-[11px] font-bold text-sky-700 uppercase">Average Marks</p>
                  <p className="text-xl font-black text-sky-800 mt-1">{entryStats.avg} / 100</p>
                </div>
              </div>

              {/* Table */}
              <Card className="shadow-lg overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">Candidate Name & Roll No</th>
                        <th className="p-3 w-32">Internal (40M)</th>
                        <th className="p-3 w-32">External (60M)</th>
                        <th className="p-3 w-28">Total (100M)</th>
                        <th className="p-3 w-28">Letter Grade</th>
                        <th className="p-3 w-24">Grade Pt</th>
                        <th className="p-3 w-24 text-center">Absent?</th>
                        <th className="p-3">Faculty Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {markRows.map((row, idx) => {
                        const { grade, points, isPass } = getGradeInfo(
                          row.internalMarks,
                          row.externalMarks,
                          row.isAbsent
                        );
                        const total = row.isAbsent ? 0 : Math.min(100, (Number(row.internalMarks) || 0) + (Number(row.externalMarks) || 0));

                        return (
                          <tr
                            key={row.studentId}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.isAbsent
                                ? 'bg-slate-100/70 text-slate-400'
                                : !isPass
                                ? 'bg-rose-50/50'
                                : ''
                            }`}
                          >
                            <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                            <td className="p-3 font-bold text-slate-900">
                              <div>{row.name}</div>
                              <div className="text-[11px] font-mono text-slate-500">{row.rollNumber}</div>
                            </td>

                            {/* Internal Marks Input */}
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                max={40}
                                disabled={row.isAbsent}
                                value={row.internalMarks}
                                onChange={(e) =>
                                  updateRow(idx, 'internalMarks', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 p-2 rounded-lg border border-slate-300 font-mono font-bold text-center focus:ring-2 focus:ring-[#701111]"
                              />
                            </td>

                            {/* External Marks Input */}
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                max={60}
                                disabled={row.isAbsent}
                                value={row.externalMarks}
                                onChange={(e) =>
                                  updateRow(idx, 'externalMarks', parseFloat(e.target.value) || 0)
                                }
                                className="w-24 p-2 rounded-lg border border-slate-300 font-mono font-bold text-center focus:ring-2 focus:ring-[#701111]"
                              />
                            </td>

                            {/* Total Marks */}
                            <td className="p-3 font-black text-sm text-slate-900 font-mono">
                              {row.isAbsent ? 'AB' : total}
                            </td>

                            {/* Letter Grade Badge */}
                            <td className="p-3">
                              {grade === 'O' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                                  O (Outstanding)
                                </span>
                              )}
                              {grade === 'A+' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  A+ (Excellent)
                                </span>
                              )}
                              {grade === 'A' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-teal-100 text-teal-900 border border-teal-200">
                                  A (Very Good)
                                </span>
                              )}
                              {grade === 'B+' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-sky-100 text-sky-900 border border-sky-200">
                                  B+ (Good)
                                </span>
                              )}
                              {grade === 'B' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                                  B (Average)
                                </span>
                              )}
                              {grade === 'C' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                                  C (Pass)
                                </span>
                              )}
                              {grade === 'RA' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-200">
                                  RA (Re-appear)
                                </span>
                              )}
                              {grade === 'AB' && (
                                <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-200 text-slate-800">
                                  ABSENT
                                </span>
                              )}
                            </td>

                            {/* Grade Point */}
                            <td className="p-3 font-mono font-extrabold text-slate-700">
                              {points.toFixed(1)}
                            </td>

                            {/* Absent Toggle */}
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={row.isAbsent}
                                onChange={(e) => updateRow(idx, 'isAbsent', e.target.checked)}
                                className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                              />
                            </td>

                            {/* Remarks */}
                            <td className="p-3">
                              <input
                                type="text"
                                placeholder="Optional feedback..."
                                value={row.remarks}
                                onChange={(e) => updateRow(idx, 'remarks', e.target.value)}
                                className="w-full p-1.5 text-[11px] rounded border border-slate-200 focus:ring-1 focus:ring-[#701111]"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Sticky Submit Bar */}
              <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-amber-300">Marks Submission Summary:</span>{' '}
                    <span>
                      {entryStats.total} Evaluated • {entryStats.pass} Clear ({entryStats.passPct}%) •{' '}
                      {entryStats.fail} Arrears • Avg: {entryStats.avg}/100
                    </span>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitMarks}
                  disabled={submittingMarks}
                  className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {submittingMarks ? (
                    <>
                      <span className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Saving Class Marks...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-slate-950" />
                      Commit & Publish Class Marks
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT GRADE CARD & MARKSHEET */}
      {activeTab === 'report_card' && (
        <div className="space-y-6">
          {/* Student Selector Card */}
          <Card className="p-5 shadow-lg border-t-4 border-t-[#701111] print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-extrabold text-[#701111] flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-amber-600" />
                  Select Candidate for Transcript Generation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fetch official semester marksheet, credits earned, and SGPA calculations.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedReportStudentId}
                  onChange={(e) => {
                    setSelectedReportStudentId(e.target.value);
                    handleLoadReportCard(e.target.value);
                  }}
                  className="p-2.5 text-xs rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-[#701111] min-w-[260px]"
                >
                  {allStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.rollNumber} - {st.name} ({st.department.code})
                    </option>
                  ))}
                </select>

                <Button
                  onClick={() => handleLoadReportCard(selectedReportStudentId)}
                  disabled={loadingReport}
                  className="bg-[#701111] hover:bg-[#500c0c] text-white px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs"
                >
                  {loadingReport ? 'Loading...' : 'Generate Transcript'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Official Printable Grade Card */}
          {reportData && (
            <Card className="shadow-2xl overflow-hidden border border-slate-300 bg-white">
              {/* Top Print Toolbar */}
              <div className="bg-slate-900 px-6 py-3 text-white flex items-center justify-between print:hidden">
                <span className="text-xs font-bold flex items-center gap-2 text-amber-300">
                  <Printer className="h-4 w-4" />
                  Official Semester Grade Card & Marksheet Preview
                </span>
                <button
                  onClick={() => window.print()}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Official Marksheet
                </button>
              </div>

              {/* The Formal Marksheet Document */}
              <div className="p-8 md:p-12 space-y-6 bg-white" id="official-marksheet">
                {/* College Emblem & Anna University Header */}
                <div className="text-center border-b-2 border-slate-900 pb-5">
                  <img
                    src="/smit-logo.png"
                    alt="SMIT Emblem"
                    className="h-16 mx-auto mb-3 object-contain"
                  />
                  <h1 className="text-xl font-black tracking-tight text-[#701111]">
                    SRI MUTHUKUMARAN INSTITUTE OF TECHNOLOGY
                  </h1>
                  <p className="text-xs text-slate-700 font-bold mt-0.5">
                    (Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai)
                  </p>
                  <p className="text-[11px] text-slate-500">Chikkarayapuram, Near Mangadu, Chennai - 600069</p>

                  <div className="mt-3 inline-block px-4 py-1 rounded-full bg-slate-100 border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-800">
                    Grade Sheet / Statement of Marks • {reportData.exam?.title || 'Semester Examinations'}
                  </div>
                </div>

                {/* Candidate Particulars */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Candidate Name</span>
                    <span className="font-extrabold text-sm text-slate-900">{reportData.student.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Register / Roll No</span>
                    <span className="font-mono font-black text-sm text-[#701111]">
                      {reportData.student.rollNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Degree & Branch</span>
                    <span className="font-bold text-slate-800">
                      {reportData.student.course} ({reportData.student.departmentCode})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Semester & Batch</span>
                    <span className="font-bold text-slate-800">
                      Semester {reportData.student.semester} • Batch {reportData.student.batch}
                    </span>
                  </div>
                </div>

                {/* Subject-Wise Grades Table */}
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="p-3 border-r border-slate-300">Course Code</th>
                      <th className="p-3 border-r border-slate-300">Course Title</th>
                      <th className="p-3 border-r border-slate-300 text-center w-16">Credits</th>
                      <th className="p-3 border-r border-slate-300 text-center w-20">Grade</th>
                      <th className="p-3 border-r border-slate-300 text-center w-20">Grade Pt</th>
                      <th className="p-3 border-r border-slate-300 text-center w-24">Quality Pts</th>
                      <th className="p-3 text-center w-24">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.results.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-slate-500">
                          No examination results recorded for this student yet. Use the "Teacher Marks Sheet" tab to enter grades!
                        </td>
                      </tr>
                    ) : (
                      reportData.results.map((res: any) => (
                        <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 border-r border-slate-300">
                            {res.subjectCode}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 border-r border-slate-300">
                            {res.subjectName}
                          </td>
                          <td className="p-3 text-center font-bold border-r border-slate-300">
                            {res.credits}
                          </td>
                          <td className="p-3 text-center border-r border-slate-300 font-black">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-xs ${
                                res.grade === 'O'
                                  ? 'text-purple-700'
                                  : res.grade === 'A+' || res.grade === 'A'
                                  ? 'text-emerald-700'
                                  : res.grade === 'RA' || res.grade === 'AB'
                                  ? 'text-rose-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              {res.grade}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold border-r border-slate-300">
                            {res.gradePoint.toFixed(1)}
                          </td>
                          <td className="p-3 text-center font-mono font-bold border-r border-slate-300">
                            {res.qualityPoints.toFixed(1)}
                          </td>
                          <td className="p-3 text-center font-black">
                            {res.resultStatus === 'PASS' ? (
                              <span className="text-emerald-700">PASS</span>
                            ) : (
                              <span className="text-rose-700">RA</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Cumulative Performance Summary (SGPA) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 text-xs">
                  <div>
                    <span className="text-slate-600 block text-[10px] uppercase font-bold">Credits Registered</span>
                    <span className="font-black text-lg text-slate-900">
                      {reportData.metrics.totalCredits}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] uppercase font-bold">Credits Earned</span>
                    <span className="font-black text-lg text-emerald-800">
                      {reportData.metrics.earnedCredits}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] uppercase font-bold">
                      Semester GPA (SGPA)
                    </span>
                    <span className="font-black text-2xl text-[#701111]">
                      {reportData.metrics.sgpa.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600 block text-[10px] uppercase font-bold">Academic Status</span>
                    <span
                      className={`inline-block mt-0.5 px-2.5 py-1 rounded-md text-[11px] font-black uppercase ${
                        reportData.metrics.arrearsCount === 0
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {reportData.metrics.overallResult}
                    </span>
                  </div>
                </div>

                {/* Signatures & Controller of Examinations Block */}
                <div className="pt-16 grid grid-cols-3 gap-6 text-xs text-center border-t border-slate-200 mt-8">
                  <div>
                    <div className="h-10 border-b border-slate-400 max-w-[160px] mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5">Class Faculty Advisor</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-400 max-w-[160px] mx-auto" />
                    <span className="font-bold text-slate-800 block mt-1.5">Head of Department</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-400 max-w-[160px] mx-auto" />
                    <span className="font-bold text-slate-900 block mt-1.5">
                      Controller of Examinations
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 3: EXAM SESSIONS MASTER */}
      {activeTab === 'sessions' && (
        <Card className="p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#701111]" />
                Institutional Exam Sessions Master
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage university semester exams, model exams, and internal assessment tests (IAT-1, IAT-2).
              </p>
            </div>
            <Button
              onClick={() => setIsExamModalOpen(true)}
              className="bg-[#701111] hover:bg-[#500c0c] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              New Exam Session
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((ex) => (
              <div
                key={ex.id}
                className="p-5 rounded-xl border border-slate-200 bg-white hover:border-[#701111] transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                    {ex.examType}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{ex.academicYear}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{ex.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Semester {ex.semester} Examinations</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Evaluated Candidates:</span>
                  <span className="font-black text-[#701111]">{ex._count?.results || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL: CREATE EXAM SESSION */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#701111] p-5 text-white flex items-center justify-between">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                Schedule New Examination Session
              </h2>
              <button
                onClick={() => setIsExamModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Exam Type *</label>
                  <select
                    value={newExamType}
                    onChange={(e) => setNewExamType(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                  >
                    <option value="SEMESTER">End Semester University Exam</option>
                    <option value="INTERNAL_IAT1">Internal Assessment - I (IAT-1)</option>
                    <option value="INTERNAL_IAT2">Internal Assessment - II (IAT-2)</option>
                    <option value="MODEL_EXAM">Model Examination</option>
                    <option value="PRACTICAL">Laboratory Practical Viva</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semester *</label>
                  <select
                    value={newExamSem}
                    onChange={(e) => setNewExamSem(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={newExamYear}
                  onChange={(e) => setNewExamYear(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingExam}
                  className="bg-[#701111] hover:bg-[#500c0c] text-white px-5 py-2 font-bold shadow-md"
                >
                  {submittingExam ? 'Saving...' : 'Create Exam Session'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

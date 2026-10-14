'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Users,
  Plus,
  Calendar,
  Save,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  X,
  Check,
} from 'lucide-react';

export default function DecoupledAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assignmentId } = use(params);

  const [assignment, setAssignment] = useState<any>(null);
  const [detentionData, setDetentionData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Session Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionHour, setSessionHour] = useState(1);
  const [sessionTopic, setSessionTopic] = useState('');
  const [sessionRecords, setSessionRecords] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'MEDICAL_LEAVE'>>({});
  const [submittingSession, setSubmittingSession] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [assignmentId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Assignment details
      const asgRes = await fetch(`/api/obe/assignments/${assignmentId}`);
      const asgData = await asgRes.json();
      if (asgData.assignment) {
        setAssignment(asgData.assignment);

        // Pre-fill all students as PRESENT for modal
        const defaults: any = {};
        for (const r of asgData.assignment.roster) {
          defaults[r.student.id] = 'PRESENT';
        }
        setSessionRecords(defaults);
      }

      // 2. Detention report
      const detRes = await fetch(`/api/obe/attendance/detention?assignmentId=${assignmentId}`);
      const detData = await detRes.json();
      setDetentionData(detData);

      // 3. Sessions list
      const sessRes = await fetch(`/api/obe/attendance/sessions?assignmentId=${assignmentId}`);
      const sessData = await sessRes.json();
      setSessions(sessData.sessions || []);
    } catch (e) {
      console.error('Error loading attendance data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAll = (status: 'PRESENT' | 'ABSENT') => {
    if (!assignment) return;
    const updated: any = {};
    for (const r of assignment.roster) {
      updated[r.student.id] = status;
    }
    setSessionRecords(updated);
  };

  const handleRecordSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSession(true);
    try {
      const records = Object.entries(sessionRecords).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const res = await fetch('/api/obe/attendance/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          date: sessionDate,
          hour: Number(sessionHour),
          sessionTopic,
          records,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsRecordModalOpen(false);
        setSessionTopic('');
        loadAllData();
      } else {
        alert(data.error || 'Failed to record attendance');
      }
    } catch (err: any) {
      alert(err.message || 'Error recording attendance');
    } finally {
      setSubmittingSession(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!assignment) {
    return <div className="p-8 text-center text-gray-500">Assignment not found.</div>;
  }

  const stats = detentionData?.stats || { totalStudents: 0, eligibleCount: 0, condonationCount: 0, detainedCount: 0 };
  const students = detentionData?.students || [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/obe" className="hover:text-indigo-600">
          Faculty OBE Portal
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/obe/courses/${assignment.id}`} className="hover:text-indigo-600">
          {assignment.subject.code}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-800">Decoupled Attendance & Detention Monitor</span>
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded">
              {assignment.subject.code}
            </span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              Hour-Wise Tracking
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
              AU 75% Rule Enforced
            </span>
          </div>

          <h1 className="text-xl font-black text-gray-900 mt-1">
            {assignment.subject.name} — Semester Attendance
          </h1>
          <p className="text-xs text-gray-500">
            {assignment.subject.department.name} • Section {assignment.section} • Total Hours Conducted: {detentionData?.assignmentInfo?.totalConductedHours || sessions.length} Hours
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Mark Hour Attendance</span>
          </button>
        </div>
      </div>

      {/* University Compliance Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 font-medium">Total Enrolled</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{stats.totalStudents}</div>
          </div>
          <Users className="w-8 h-8 text-indigo-500/30" />
        </div>

        <div className="bg-emerald-50/50 rounded-xl border border-emerald-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-700 font-semibold">Eligible (≥ 75%)</div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{stats.eligibleCount}</div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
        </div>

        <div className="bg-amber-50/50 rounded-xl border border-amber-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-amber-700 font-semibold">Condonation (65% - 74.9%)</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{stats.condonationCount}</div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500/30" />
        </div>

        <div className="bg-red-50/50 rounded-xl border border-red-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs text-red-700 font-semibold">Detained (&lt; 65%)</div>
            <div className="text-2xl font-black text-red-900 mt-1">{stats.detainedCount}</div>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500/30" />
        </div>
      </div>

      {/* Attendance & University Detention Roster Table */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden space-y-4 p-6">
        <div>
          <h2 className="text-base font-bold text-gray-900">Anna University Attendance Eligibility Roster</h2>
          <p className="text-xs text-gray-500">
            Per Anna University regulations, students with attendance &lt;75% require medical condonation; students &lt;65% are strictly detained.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Roll Number</th>
                <th className="py-2.5 px-3">Student Full Name</th>
                <th className="py-2.5 px-3 text-center">Conducted</th>
                <th className="py-2.5 px-3 text-center">Attended</th>
                <th className="py-2.5 px-3 text-center">On-Duty</th>
                <th className="py-2.5 px-3 text-center">Medical</th>
                <th className="py-2.5 px-3 text-center">Absent</th>
                <th className="py-2.5 px-3 text-center font-bold">Percentage</th>
                <th className="py-2.5 px-3 text-center">AU Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s: any) => (
                <tr key={s.studentId} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-mono font-medium text-gray-800">{s.rollNumber}</td>
                  <td className="py-2.5 px-3 font-bold text-gray-900">{s.name}</td>
                  <td className="py-2.5 px-3 text-center font-semibold">{s.totalHours} Hrs</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{s.attendedHours}</td>
                  <td className="py-2.5 px-3 text-center text-blue-600">{s.onDutyHours}</td>
                  <td className="py-2.5 px-3 text-center text-amber-600">{s.medicalHours}</td>
                  <td className="py-2.5 px-3 text-center text-red-600">{s.absentHours}</td>
                  <td className="py-2.5 px-3 text-center font-black text-sm">
                    {s.percentage}%
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'ELIGIBLE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.status === 'CONDONATION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Attendance Modal */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 my-8 space-y-4 border border-gray-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Record Daily / Hour Attendance</h3>
                  <p className="text-xs text-gray-500">
                    Log period-wise student attendance for {assignment.subject.code} (Section {assignment.section}).
                  </p>
                </div>
                <button onClick={() => setIsRecordModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordSession} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Session Date</label>
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Period / Hour (1 - 8)</label>
                    <select
                      value={sessionHour}
                      onChange={(e) => setSessionHour(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                        <option key={h} value={h}>
                          Hour {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Session Topic / Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. Unit 2 Syntax Analysis"
                      value={sessionTopic}
                      onChange={(e) => setSessionTopic(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-gray-700">Student Attendance Status</span>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleMarkAll('PRESENT')}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold rounded"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('ABSENT')}
                      className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 font-semibold rounded"
                    >
                      All Absent
                    </button>
                  </div>
                </div>

                {/* Student Attendance List */}
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 text-xs max-h-60 overflow-y-auto">
                  {assignment.roster.map((r: any) => {
                    const status = sessionRecords[r.student.id] || 'PRESENT';
                    return (
                      <div key={r.id} className="p-2.5 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <span className="font-mono font-semibold text-gray-700 mr-2">{r.student.rollNumber}</span>
                          <span className="font-bold text-gray-900">{r.student.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {(['PRESENT', 'ABSENT', 'ON_DUTY', 'MEDICAL_LEAVE'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setSessionRecords({ ...sessionRecords, [r.student.id]: st })}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                status === st
                                  ? st === 'PRESENT'
                                    ? 'bg-emerald-600 text-white'
                                    : st === 'ABSENT'
                                    ? 'bg-red-600 text-white'
                                    : st === 'ON_DUTY'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-amber-600 text-white'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {st === 'MEDICAL_LEAVE' ? 'MED' : st.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSession}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    {submittingSession ? 'Saving Session...' : 'Save Session Attendance'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

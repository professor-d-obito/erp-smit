'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Save,
  Lock,
  Unlock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Users,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function AssessmentMarkEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assessmentId } = use(params);

  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [marksState, setMarksState] = useState<Record<string, Record<string, { value: string; isAbsent: boolean; isMalpractice: boolean }>>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<any[]>([]);

  useEffect(() => {
    fetchAssessment();
  }, [assessmentId]);

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/obe/assessments/${assessmentId}`);
      const data = await res.json();
      if (data.assessment) {
        setAssessment(data.assessment);
        initializeMarksMatrix(data.assessment);
      }
    } catch (e) {
      console.error('Error fetching assessment:', e);
    } finally {
      setLoading(false);
    }
  };

  const initializeMarksMatrix = (asg: any) => {
    const matrix: Record<string, Record<string, { value: string; isAbsent: boolean; isMalpractice: boolean }>> = {};

    for (const r of asg.assignment.roster) {
      matrix[r.id] = {};
      for (const q of asg.questions) {
        const existing = q.marks?.find((m: any) => m.rosterId === r.id);
        if (existing) {
          matrix[r.id][q.id] = {
            value: existing.marksObtained !== null ? String(existing.marksObtained) : '',
            isAbsent: Boolean(existing.isAbsent),
            isMalpractice: Boolean(existing.isMalpractice),
          };
        } else {
          matrix[r.id][q.id] = { value: '', isAbsent: false, isMalpractice: false };
        }
      }
    }
    setMarksState(matrix);
  };

  const handleCellChange = (rosterId: string, questionId: string, val: string) => {
    setMarksState((prev) => ({
      ...prev,
      [rosterId]: {
        ...prev[rosterId],
        [questionId]: {
          ...prev[rosterId]?.[questionId],
          value: val,
          isAbsent: false,
          isMalpractice: false,
        },
      },
    }));
  };

  const handleToggleAbsent = (rosterId: string, questionId: string) => {
    setMarksState((prev) => {
      const current = prev[rosterId]?.[questionId];
      const newAbsent = !current?.isAbsent;
      return {
        ...prev,
        [rosterId]: {
          ...prev[rosterId],
          [questionId]: {
            value: newAbsent ? '' : '',
            isAbsent: newAbsent,
            isMalpractice: false,
          },
        },
      };
    });
  };

  const handleToggleMalpractice = (rosterId: string, questionId: string) => {
    setMarksState((prev) => {
      const current = prev[rosterId]?.[questionId];
      const newMal = !current?.isMalpractice;
      return {
        ...prev,
        [rosterId]: {
          ...prev[rosterId],
          [questionId]: {
            value: newMal ? '' : '',
            isAbsent: false,
            isMalpractice: newMal,
          },
        },
      };
    });
  };

  const calculateStudentTotal = (rosterId: string) => {
    if (!assessment || !marksState[rosterId]) return { total: 0, isAllAbsent: false };
    let sum = 0;
    let allAbsent = true;

    for (const q of assessment.questions) {
      const cell = marksState[rosterId][q.id];
      if (cell) {
        if (!cell.isAbsent) allAbsent = false;
        if (!cell.isAbsent && !cell.isMalpractice && cell.value !== '') {
          sum += Number(cell.value) || 0;
        }
      }
    }
    return { total: Number(sum.toFixed(1)), isAllAbsent: allAbsent };
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    setSaveSuccess(false);

    const payload: any[] = [];
    for (const [rosterId, qMap] of Object.entries(marksState)) {
      for (const [questionId, cell] of Object.entries(qMap)) {
        payload.push({
          rosterId,
          questionId,
          marksObtained: cell.isAbsent || cell.isMalpractice || cell.value === '' ? null : Number(cell.value),
          isAbsent: cell.isAbsent,
          isMalpractice: cell.isMalpractice,
        });
      }
    }

    try {
      const res = await fetch(`/api/obe/assessments/${assessmentId}/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: payload }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error || 'Failed to save marks');
      }
    } catch (e: any) {
      alert(e.message || 'Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setUploadErrors([]);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch(`/api/obe/assessments/${assessmentId}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        fetchAssessment(); // Reload updated marks
      } else {
        setUploadErrors(data.errors || [{ error: data.error || 'Upload error' }]);
      }
    } catch (e: any) {
      setUploadErrors([{ error: e.message || 'Network error during upload' }]);
    } finally {
      setUploading(false);
    }
  };

  const handleToggleLock = async () => {
    if (!assessment) return;
    const newLock = !assessment.isLocked;
    const confirmMsg = newLock
      ? 'Are you sure you want to lock this assessment? Marks cannot be modified once locked.'
      : 'Unlock this assessment for mark modifications?';

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/obe/assessments/${assessmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: newLock }),
      });
      const data = await res.json();
      if (data.success) {
        setAssessment({ ...assessment, isLocked: newLock });
      }
    } catch (e) {
      console.error('Error toggling lock:', e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!assessment) {
    return <div className="p-8 text-center text-gray-500">Assessment not found.</div>;
  }

  const { assignment, questions } = assessment;

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
        <span className="font-semibold text-gray-800">{assessment.title}</span>
      </div>

      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-mono text-xs font-bold rounded">
              {assignment.subject.code}
            </span>
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-medium rounded">
              {assessment.category.replace(/_/g, ' ')}
            </span>
            {assessment.isLocked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200">
                <Lock className="w-3 h-3" /> Locked
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                Active Entry
              </span>
            )}
          </div>

          <h1 className="text-xl font-black text-gray-900 mt-1">{assessment.title}</h1>
          <p className="text-xs text-gray-500">
            {assignment.subject.name} • Section {assignment.section} • Total Weight: {assessment.weightage}% • Max Marks: {assessment.maxTotalMarks}M
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/obe/assessments/${assessmentId}/template`}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Excel</span>
          </a>

          {!assessment.isLocked && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-gray-500" />
              <span>Bulk Excel Sync</span>
            </button>
          )}

          <button
            onClick={handleToggleLock}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
            title={assessment.isLocked ? 'Unlock assessment' : 'Lock assessment'}
          >
            {assessment.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>

          {!assessment.isLocked && (
            <button
              onClick={handleSaveMarks}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Assessment marks matrix saved successfully and synchronized with OBE Attainment engine.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Tabular Mark Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Students: {assignment.roster.length}</span>
            <span className="text-gray-300">|</span>
            <span>Questions: {questions.length}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-amber-200 rounded-sm inline-block" /> ABS = Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-red-200 rounded-sm inline-block" /> MAL = Malpractice
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-gray-100/80 text-gray-700 border-b border-gray-200">
                <th className="py-3 px-3 font-bold sticky left-0 bg-gray-100 z-10 w-32">Register No</th>
                <th className="py-3 px-3 font-bold sticky left-32 bg-gray-100 z-10 w-44">Student Name</th>
                {questions.map((q: any) => (
                  <th key={q.id} className="py-3 px-3 text-center min-w-[100px] border-l border-gray-200/60">
                    <div className="font-bold text-gray-900">{q.questionNumber}</div>
                    <div className="text-[10px] text-indigo-600 font-mono font-semibold">
                      {q.co?.code} • {q.maxMarks}M
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center font-bold bg-indigo-50/80 text-indigo-900 min-w-[90px] border-l border-gray-200">
                  Total ({assessment.maxTotalMarks}M)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignment.roster.map((r: any) => {
                const studentTotal = calculateStudentTotal(r.id);
                return (
                  <tr key={r.id} className="hover:bg-indigo-50/20 transition-colors">
                    {/* Register Number */}
                    <td className="py-2 px-3 font-mono font-semibold text-gray-800 sticky left-0 bg-white z-10 border-r border-gray-100">
                      {r.student.rollNumber}
                    </td>

                    {/* Student Name */}
                    <td className="py-2 px-3 font-bold text-gray-900 sticky left-32 bg-white z-10 border-r border-gray-100 truncate max-w-[170px]">
                      {r.student.name}
                    </td>

                    {/* Question Marks Columns */}
                    {questions.map((q: any) => {
                      const cell = marksState[r.id]?.[q.id] || { value: '', isAbsent: false, isMalpractice: false };
                      const numVal = Number(cell.value);
                      const isOverMax = !cell.isAbsent && !cell.isMalpractice && cell.value !== '' && numVal > q.maxMarks;

                      return (
                        <td
                          key={q.id}
                          className={`py-2 px-2 text-center border-l border-gray-100 relative ${
                            cell.isAbsent ? 'bg-amber-50/60' : cell.isMalpractice ? 'bg-red-50/60' : ''
                          }`}
                        >
                          <div className="flex items-center justify-center gap-1">
                            {cell.isAbsent ? (
                              <span className="font-bold text-[11px] text-amber-700 bg-amber-100 px-2 py-1 rounded">
                                ABS
                              </span>
                            ) : cell.isMalpractice ? (
                              <span className="font-bold text-[11px] text-red-700 bg-red-100 px-2 py-1 rounded">
                                MAL
                              </span>
                            ) : (
                              <input
                                type="text"
                                disabled={assessment.isLocked}
                                value={cell.value}
                                onChange={(e) => handleCellChange(r.id, q.id, e.target.value)}
                                placeholder="-"
                                className={`w-14 text-center py-1 px-1 border rounded font-mono font-semibold text-xs focus:outline-none focus:ring-1 ${
                                  isOverMax
                                    ? 'border-red-500 bg-red-50 text-red-700 focus:ring-red-500'
                                    : 'border-gray-200 bg-white focus:ring-indigo-500'
                                }`}
                              />
                            )}

                            {/* Quick ABS / MAL Dropdown Toggles */}
                            {!assessment.isLocked && (
                              <div className="flex flex-col gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAbsent(r.id, q.id)}
                                  className={`text-[9px] px-1 rounded font-bold transition-colors ${
                                    cell.isAbsent
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-gray-100 text-gray-500 hover:bg-amber-100'
                                  }`}
                                  title="Toggle Absent"
                                >
                                  A
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleMalpractice(r.id, q.id)}
                                  className={`text-[9px] px-1 rounded font-bold transition-colors ${
                                    cell.isMalpractice
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-100 text-gray-500 hover:bg-red-100'
                                  }`}
                                  title="Toggle Malpractice"
                                >
                                  M
                                </button>
                              </div>
                            )}
                          </div>

                          {isOverMax && (
                            <div className="text-[9px] text-red-600 font-bold mt-0.5">
                              Exceeds {q.maxMarks}M
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Total Scored Column */}
                    <td className="py-2 px-3 text-center font-black text-sm bg-indigo-50/50 text-indigo-950 border-l border-gray-200">
                      {studentTotal.isAllAbsent ? (
                        <span className="text-amber-700 font-bold text-xs">ABSENT</span>
                      ) : (
                        `${studentTotal.total} / ${assessment.maxTotalMarks}`
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Excel Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200"
            >
              <h3 className="text-base font-bold text-gray-900">Bulk Upload Assessment Marks</h3>
              <p className="text-xs text-gray-500">
                Upload the completed Excel evaluation sheet (.xlsx / .csv). Marks, absences, and question values will be validated and synced automatically.
              </p>

              <form onSubmit={handleUploadExcel} className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center space-y-2 hover:border-indigo-500 transition-colors bg-gray-50">
                  <FileSpreadsheet className="w-8 h-8 text-gray-400 mx-auto" />
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    required
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  {uploadFile && (
                    <div className="text-xs font-semibold text-emerald-700">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </div>
                  )}
                </div>

                {uploadErrors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl space-y-1 max-h-40 overflow-y-auto">
                    <div className="font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Validation Errors:
                    </div>
                    {uploadErrors.map((err, idx) => (
                      <div key={idx}>
                        • Row {err.rowNumber || '?'}: {err.error}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadModalOpen(false);
                      setUploadErrors([]);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                  >
                    {uploading ? 'Processing File...' : 'Upload & Synchronize'}
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

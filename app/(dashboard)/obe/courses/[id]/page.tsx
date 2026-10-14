'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  TrendingUp,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Layers,
  ChevronRight,
  Edit2,
  Trash2,
  Lock,
  Download,
  Upload,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface QuestionDef {
  questionNumber: string;
  partSection: string;
  maxMarks: number;
  coId: string;
  bloomsLevel: string;
}

export default function CourseOBEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assignmentId } = use(params);

  const [assignment, setAssignment] = useState<any>(null);
  const [programOutcomes, setProgramOutcomes] = useState<any[]>([]);
  const [attainmentData, setAttainmentData] = useState<any>(null);
  const [internalMarks, setInternalMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cos' | 'assessments' | 'attainment' | 'roster'>('assessments');

  // New Assessment Modal State
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    category: 'IAT_1',
    maxTotalMarks: 50,
    weightage: 20,
    conductedDate: new Date().toISOString().split('T')[0],
  });

  const [questions, setQuestions] = useState<QuestionDef[]>([
    { questionNumber: 'Q1', partSection: 'PART_A', maxMarks: 2, coId: '', bloomsLevel: 'K1_REMEMBER' },
    { questionNumber: 'Q2', partSection: 'PART_A', maxMarks: 2, coId: '', bloomsLevel: 'K2_UNDERSTAND' },
    { questionNumber: 'Q3', partSection: 'PART_A', maxMarks: 2, coId: '', bloomsLevel: 'K2_UNDERSTAND' },
    { questionNumber: 'Q4', partSection: 'PART_A', maxMarks: 2, coId: '', bloomsLevel: 'K3_APPLY' },
    { questionNumber: 'Q5', partSection: 'PART_A', maxMarks: 2, coId: '', bloomsLevel: 'K2_UNDERSTAND' },
    { questionNumber: 'Q11a', partSection: 'PART_B', maxMarks: 13, coId: '', bloomsLevel: 'K3_APPLY' },
    { questionNumber: 'Q12a', partSection: 'PART_B', maxMarks: 13, coId: '', bloomsLevel: 'K4_ANALYZE' },
    { questionNumber: 'Q13a', partSection: 'PART_B', maxMarks: 14, coId: '', bloomsLevel: 'K4_ANALYZE' },
  ]);

  const [submittingAssessment, setSubmittingAssessment] = useState(false);

  useEffect(() => {
    fetchAssignmentDetails();
  }, [assignmentId]);

  const fetchAssignmentDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/obe/assignments/${assignmentId}`);
      const data = await res.json();
      if (data.assignment) {
        setAssignment(data.assignment);
        setProgramOutcomes(data.programOutcomes || []);

        // Pre-fill default coId for questions from first available CO
        const cos = data.assignment.subject.courseOutcomes;
        if (cos && cos.length > 0) {
          setQuestions((prev) =>
            prev.map((q, idx) => ({
              ...q,
              coId: cos[idx % cos.length].id,
            }))
          );
        }

        // Fetch attainment
        fetchAttainment();
      }
    } catch (e) {
      console.error('Error fetching assignment details:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttainment = async () => {
    try {
      const res = await fetch(`/api/obe/assignments/${assignmentId}/attainment`);
      const data = await res.json();
      if (data.success) {
        setAttainmentData(data.attainment);
        setInternalMarks(data.internalMarks || []);
      }
    } catch (e) {
      console.error('Error loading attainment data:', e);
    }
  };

  const handleAddQuestion = (section: 'PART_A' | 'PART_B' | 'PART_C', defaultMarks: number) => {
    const qCount = questions.length + 1;
    const defaultCoId = assignment?.subject?.courseOutcomes?.[0]?.id || '';
    setQuestions([
      ...questions,
      {
        questionNumber: `Q${qCount}`,
        partSection: section,
        maxMarks: defaultMarks,
        coId: defaultCoId,
        bloomsLevel: 'K2_UNDERSTAND',
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAssessment(true);
    try {
      const res = await fetch('/api/obe/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          ...assessmentForm,
          questions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsAssessmentModalOpen(false);
        fetchAssignmentDetails();
      } else {
        alert(data.error || 'Failed to create assessment');
      }
    } catch (err: any) {
      alert(err.message || 'Error creating assessment');
    } finally {
      setSubmittingAssessment(false);
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
    return (
      <div className="p-8 text-center text-gray-500">
        Course assignment not found.{' '}
        <Link href="/obe" className="text-indigo-600 underline">
          Back to OBE Portal
        </Link>
      </div>
    );
  }

  const { subject, roster, assessments } = assignment;
  const courseOutcomes = subject.courseOutcomes || [];

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/obe" className="hover:text-indigo-600 transition-colors">
          Faculty OBE Portal
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="font-semibold text-gray-800">{subject.code}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-mono text-sm font-bold rounded-lg border border-indigo-100">
              {subject.code}
            </span>
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              {assignment.courseType.replace(/_/g, ' ')}
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
              Regulation 2021
            </span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            {subject.name}
          </h1>

          <p className="text-xs text-gray-500">
            {subject.department.name} • Semester {assignment.semester} (Section {assignment.section}) • Faculty: {assignment.faculty.name} ({assignment.faculty.employeeId})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/obe/attendance/${assignment.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
          >
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Attendance & Detention</span>
          </Link>

          <button
            onClick={() => setIsAssessmentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assessment</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'assessments'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Assessments & Mark Entry ({assessments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attainment')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'attainment'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>CO/PO Attainment & AU Internals</span>
        </button>

        <button
          onClick={() => setActiveTab('cos')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'cos'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Course Outcomes & PO Matrix ({courseOutcomes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Enrolled Students ({roster.length})</span>
        </button>
      </div>

      {/* Tab 1: Assessments List */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Configured Assessments</h2>
              <p className="text-xs text-gray-500">
                Click an assessment to access the interactive evaluation matrix or bulk upload marks.
              </p>
            </div>
          </div>

          {assessments.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 max-w-md mx-auto space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto" />
              <h3 className="text-sm font-bold text-gray-800">No Assessments Created Yet</h3>
              <p className="text-xs text-gray-500">
                Click &quot;Create Assessment&quot; to configure question paper breakdown and begin mark entry.
              </p>
              <button
                onClick={() => setIsAssessmentModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Configure Assessment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessments.map((asg: any) => (
                <div
                  key={asg.id}
                  className="bg-white rounded-xl border border-gray-200/90 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-md">
                        {asg.category.replace(/_/g, ' ')}
                      </span>
                      {asg.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Open for Entry
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">{asg.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                        <span>Max Marks: <strong className="text-gray-800">{asg.maxTotalMarks}M</strong></span>
                        <span>Weightage: <strong className="text-gray-800">{asg.weightage}%</strong></span>
                        <span>Questions: <strong className="text-gray-800">{asg.questions.length}</strong></span>
                      </div>
                    </div>

                    {/* Question badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {asg.questions.map((q: any) => (
                        <span
                          key={q.id}
                          className="text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200"
                        >
                          {q.questionNumber} ({q.maxMarks}M • {q.co?.code})
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a
                        href={`/api/obe/assessments/${asg.id}/template`}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Excel Template
                      </a>
                    </div>

                    <Link
                      href={`/obe/assessments/${asg.id}`}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <span>Mark Entry Matrix</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: CO/PO Attainment & Anna University Internals */}
      {activeTab === 'attainment' && (
        <div className="space-y-6">
          {/* CO Attainment Cards */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Direct Course Outcome (CO) Attainment</h2>
              <p className="text-xs text-gray-500">
                Calculated dynamically from student question-wise scores against a 50% pass threshold. Level 3 (≥70%), Level 2 (≥60%), Level 1 (≥50%).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {attainmentData?.courseOutcomes?.map((co: any) => (
                <div
                  key={co.coId}
                  className="bg-gray-50/80 rounded-xl p-4 border border-gray-200 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                        {co.coCode}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          co.attainmentLevel === 3
                            ? 'bg-emerald-100 text-emerald-800'
                            : co.attainmentLevel === 2
                            ? 'bg-blue-100 text-blue-800'
                            : co.attainmentLevel === 1
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Level {co.attainmentLevel}
                      </span>
                    </div>

                    <div className="text-lg font-black text-gray-900 pt-2">
                      {co.percentageAttained}%
                    </div>
                    <div className="text-[11px] text-gray-500 line-clamp-2">
                      {co.description}
                    </div>
                  </div>

                  <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(co.percentageAttained, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PO Attainment Matrix */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Program Outcomes (PO) Weighted Attainment</h2>
              <p className="text-xs text-gray-500">
                NBA Criterion 3 Attainment = ∑(CO Attainment Level × Correlation Weight) / ∑(Weights)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Outcome</th>
                    <th className="py-2.5 px-3">Graduate Attribute Title</th>
                    <th className="py-2.5 px-3">Direct Attainment (Scale 0-3)</th>
                    <th className="py-2.5 px-3">Attainment %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attainmentData?.programOutcomes &&
                    Object.entries(attainmentData.programOutcomes).map(([poCode, poInfo]: any) => (
                      <tr key={poCode} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{poCode}</td>
                        <td className="py-2.5 px-3 text-gray-800 font-medium">{poInfo.title}</td>
                        <td className="py-2.5 px-3 font-bold text-gray-900">{poInfo.score} / 3.0</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-indigo-600">
                            {((poInfo.score / 3.0) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Anna University Internal Marks Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Anna University Continuous Assessment Internal Marks (Out of 40)
                </h2>
                <p className="text-xs text-gray-500">
                  Regulation 2021 Formula: Theory CA = 40% (IAT 1) + 40% (IAT 2) + 20% (Assignments) scaled to 40 Marks.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Register No</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">IAT 1 (100%)</th>
                    <th className="py-2.5 px-3">IAT 2 (100%)</th>
                    <th className="py-2.5 px-3">Assignments</th>
                    <th className="py-2.5 px-3 font-bold text-indigo-900">Final Internals (40M)</th>
                    <th className="py-2.5 px-3">Attendance %</th>
                    <th className="py-2.5 px-3">AU Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {internalMarks.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-700">{s.registerNumber}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{s.studentName}</td>
                      <td className="py-2.5 px-3">{s.iat1Marks}%</td>
                      <td className="py-2.5 px-3">{s.iat2Marks}%</td>
                      <td className="py-2.5 px-3">{s.assignmentMarks}%</td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700 text-sm">
                        {s.finalInternalMarks} / {s.maxInternalWeight}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">{s.attendancePercentage}%</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.attendanceStatus === 'ELIGIBLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : s.attendanceStatus === 'CONDONATION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {s.attendanceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Course Outcomes & PO Correlation Matrix */}
      {activeTab === 'cos' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Course Outcomes (CO) Definition</h2>
              <p className="text-xs text-gray-500">
                Defined Course Outcomes mapped to Bloom&apos;s Revised Taxonomy (K1: Remember to K6: Create).
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {courseOutcomes.map((co: any) => (
                <div key={co.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-mono font-bold text-xs rounded-md">
                      {co.code}
                    </span>
                    <span className="text-xs text-gray-800 font-medium">{co.description}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[11px] rounded border border-gray-200">
                      {co.bloomsLevel}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded">
                      Threshold: {co.targetThresholdPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Enrolled Students Roster */}
      {activeTab === 'roster' && (
        <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Registered Course Students</h2>
              <p className="text-xs text-gray-500">
                Official students enrolled in Section {assignment.section} for this course.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Roll / Reg Number</th>
                  <th className="py-2.5 px-3">Student Full Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {roster.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-gray-800">{r.student.rollNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-gray-900">{r.student.name}</td>
                    <td className="py-2.5 px-3 text-gray-500">{r.student.email || 'N/A'}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        {r.student.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      <AnimatePresence>
        {isAssessmentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 my-8 space-y-6 max-h-[90vh] overflow-y-auto border border-gray-200"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure New Assessment</h3>
                  <p className="text-xs text-gray-500">
                    Define question breakdown, maximum marks, and map each question to a Course Outcome (CO).
                  </p>
                </div>
                <button
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAssessment} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Assessment Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Internal Assessment Test 2 (Model Exam)"
                      value={assessmentForm.title}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Assessment Category</label>
                    <select
                      value={assessmentForm.category}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="IAT_1">Internal Assessment Test 1 (IAT-1)</option>
                      <option value="IAT_2">Internal Assessment Test 2 (IAT-2)</option>
                      <option value="ASSIGNMENT">Assignment / Seminar</option>
                      <option value="LAB_CONTINUOUS">Lab Continuous Evaluation</option>
                      <option value="LAB_MODEL_EXAM">Model Practical Exam</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Maximum Total Marks</label>
                    <input
                      type="number"
                      required
                      value={assessmentForm.maxTotalMarks}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, maxTotalMarks: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Conducted Date</label>
                    <input
                      type="date"
                      value={assessmentForm.conductedDate}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, conductedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Question Mapping Breakdown */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                      Question Paper Schema & CO Mapping ({questions.length} Questions)
                    </h4>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('PART_A', 2)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded"
                      >
                        + Part A (2M)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('PART_B', 13)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded"
                      >
                        + Part B (13M)
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 text-xs">
                    {questions.map((q, idx) => (
                      <div key={idx} className="p-2.5 flex items-center gap-3 bg-gray-50/50">
                        <input
                          type="text"
                          value={q.questionNumber}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].questionNumber = e.target.value;
                            setQuestions(updated);
                          }}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-mono font-bold"
                        />

                        <select
                          value={q.partSection}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].partSection = e.target.value;
                            setQuestions(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="PART_A">Part A</option>
                          <option value="PART_B">Part B</option>
                          <option value="PART_C">Part C</option>
                        </select>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={q.maxMarks}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[idx].maxMarks = Number(e.target.value);
                              setQuestions(updated);
                            }}
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-bold"
                          />
                          <span className="text-gray-500 text-[11px]">Marks</span>
                        </div>

                        <select
                          value={q.coId}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].coId = e.target.value;
                            setQuestions(updated);
                          }}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded font-semibold text-indigo-700"
                        >
                          {courseOutcomes.map((co: any) => (
                            <option key={co.id} value={co.id}>
                              {co.code} - {co.description.substring(0, 32)}...
                            </option>
                          ))}
                        </select>

                        <select
                          value={q.bloomsLevel}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[idx].bloomsLevel = e.target.value;
                            setQuestions(updated);
                          }}
                          className="px-2 py-1 border border-gray-300 rounded font-mono text-[11px]"
                        >
                          <option value="K1_REMEMBER">K1 Remember</option>
                          <option value="K2_UNDERSTAND">K2 Understand</option>
                          <option value="K3_APPLY">K3 Apply</option>
                          <option value="K4_ANALYZE">K4 Analyze</option>
                          <option value="K5_EVALUATE">K5 Evaluate</option>
                          <option value="K6_CREATE">K6 Create</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAssessmentModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold text-xs rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submittingAssessment}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm"
                  >
                    {submittingAssessment ? 'Saving Configuration...' : 'Save & Initialize Assessment'}
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

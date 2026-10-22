'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  CreditCard,
  IndianRupee,
  Receipt,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  X,
  Filter,
  ArrowUpRight,
  Sparkles,
  Building2,
  GraduationCap,
} from 'lucide-react';

interface StudentFee {
  id: string;
  title: string;
  category: string;
  academicYear: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  dueDate: string | null;
  student: {
    id: string;
    rollNumber: string;
    name: string;
    semester: number;
    section: string;
    department: { id: string; code: string; name: string };
    course: { id: string; code: string; name: string };
  };
  payments: {
    id: string;
    receiptNumber: string;
    amount: number;
    paymentMode: string;
    transactionRef: string | null;
    paidDate: string;
  }[];
}

interface FeeStructure {
  id: string;
  title: string;
  academicYear: string;
  category: string;
  amount: number;
  dueDate: string | null;
  course?: { id: string; code: string; name: string } | null;
  department?: { id: string; code: string; name: string } | null;
}

interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMode: string;
  transactionRef: string | null;
  paidDate: string;
  studentFee: {
    title: string;
    student: {
      rollNumber: string;
      name: string;
      department: { code: string; name: string };
      course: { code: string; name: string };
    };
  };
  collectedByUser?: { name: string } | null;
}

export default function FeeManagementPage() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'structures' | 'transactions'>('invoices');

  // Data states
  const [fees, setFees] = useState<StudentFee[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([]);
  const [summary, setSummary] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    totalPending: 0,
    overdueCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Modals
  const [paymentModalFee, setPaymentModalFee] = useState<StudentFee | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI_ONLINE');
  const [transactionRef, setTransactionRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Official Receipt Print Modal
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // New Structure Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [structTitle, setStructTitle] = useState('');
  const [structCategory, setStructCategory] = useState('TUITION');
  const [structAmount, setStructAmount] = useState('');
  const [structCourseId, setStructCourseId] = useState('');
  const [structDueDate, setStructDueDate] = useState('');
  const [submittingStruct, setSubmittingStruct] = useState(false);

  // Batch Generate Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchCourseId, setBatchCourseId] = useState('');
  const [batchSemester, setBatchSemester] = useState('5');
  const [batchFeeTitle, setBatchFeeTitle] = useState('Odd Semester Tuition Fee');
  const [batchCategory, setBatchCategory] = useState('TUITION');
  const [batchAmount, setBatchAmount] = useState('75000');
  const [batchDueDate, setBatchDueDate] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  useEffect(() => {
    fetchFees();
    fetchStructures();
    fetchTransactions();
    fetchCourses();
  }, [search, filterStatus, filterCategory]);

  const fetchFees = async () => {
    try {
      setLoading(true);
      let url = `/api/fees/student-fees?search=${encodeURIComponent(search)}`;
      if (filterStatus !== 'ALL') url += `&status=${filterStatus}`;
      if (filterCategory !== 'ALL') url += `&category=${filterCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFees(data.data || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (e) {
      console.error('Error fetching fees:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStructures = async () => {
    try {
      const res = await fetch('/api/fees/structures');
      const data = await res.json();
      if (data.success) setStructures(data.data || []);
    } catch (e) {
      console.error('Error fetching structures:', e);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/fees/payments?limit=40');
      const data = await res.json();
      if (data.success) setTransactions(data.data || []);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/academic/courses');
      const data = await res.json();
      if (data.data) {
        setCourses(data.data);
        if (data.data.length > 0) {
          setStructCourseId(data.data[0].id);
          setBatchCourseId(data.data[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching courses:', e);
    }
  };

  // Open Payment Modal
  const handleOpenPaymentModal = (fee: StudentFee) => {
    setPaymentModalFee(fee);
    setPayAmount(String(fee.balance));
    setTransactionRef('');
    setPayRemarks('');
  };

  // Submit Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalFee || !payAmount) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/fees/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentFeeId: paymentModalFee.id,
          amount: parseFloat(payAmount),
          paymentMode,
          transactionRef,
          remarks: payRemarks,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReceiptData(data.receiptDetails);
        setPaymentModalFee(null);
        fetchFees();
        fetchTransactions();
      } else {
        alert(data.error || 'Payment failed.');
      }
    } catch (err) {
      alert('An error occurred during payment processing.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Create Fee Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structTitle || !structAmount) return;

    setSubmittingStruct(true);
    try {
      const res = await fetch('/api/fees/structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: structTitle,
          category: structCategory,
          amount: parseFloat(structAmount),
          courseId: structCourseId || undefined,
          dueDate: structDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsStructureModalOpen(false);
        setStructTitle('');
        setStructAmount('');
        fetchStructures();
      } else {
        alert(data.error || 'Failed to create fee structure.');
      }
    } catch (err) {
      alert('Error creating fee structure.');
    } finally {
      setSubmittingStruct(false);
    }
  };

  // Batch Generate Invoices
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCourseId || !batchAmount) return;

    setSubmittingBatch(true);
    try {
      const res = await fetch('/api/fees/student-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isBatch: true,
          batchCourseId,
          batchSemester: parseInt(batchSemester, 10),
          title: batchFeeTitle,
          category: batchCategory,
          totalAmount: parseFloat(batchAmount),
          dueDate: batchDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert(data.message || 'Batch fee invoices created successfully!');
        setIsBatchModalOpen(false);
        fetchFees();
      } else {
        alert(data.error || 'Failed to generate batch fees.');
      }
    } catch (err) {
      alert('Error generating batch fees.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#701111] via-[#851616] to-[#9c1c1c] p-6 rounded-2xl text-white shadow-xl">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-400/30 mb-2">
            <CreditCard className="h-3.5 w-3.5" />
            Institution Accounts & Finance Division
          </span>
          <h1 className="text-2xl font-black tracking-tight">Student Fee & Payment Management</h1>
          <p className="text-xs text-amber-100/90 mt-1">
            Track student fee demands, collect online/cash payments, generate official receipts, and audit transactions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            Generate Batch Invoices
          </Button>
          <Button
            onClick={() => setIsStructureModalOpen(true)}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl border border-white/20 flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Fee Structure Master
          </Button>
        </div>
      </div>

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <Card className="p-5 shadow-sm border-l-4 border-l-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-800">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">
              ₹{summary.totalInvoiced.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total student fee demand</p>
        </Card>

        {/* Total Collected */}
        <Card className="p-5 shadow-sm border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Collected</span>
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-800">
              ₹{summary.totalCollected.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Processed payment receipts</p>
        </Card>

        {/* Outstanding Pending Balance */}
        <Card className="p-5 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Balance</span>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-900">
              ₹{summary.totalPending.toLocaleString('en-IN')}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Receivables remaining to collect</p>
        </Card>

        {/* Overdue Count */}
        <Card className="p-5 shadow-sm border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue Invoices</span>
            <div className="p-2 bg-rose-100 rounded-lg text-rose-700">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-rose-800">{summary.overdueCount}</span>
            <span className="text-xs text-slate-500 font-medium">Students</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Past due payment deadline</p>
        </Card>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-[#701111] text-[#701111] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Student Fee Invoices & Collection ({fees.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'transactions'
              ? 'border-[#701111] text-[#701111] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Payment Transactions Ledger ({transactions.length})
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`px-5 py-3 text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'structures'
              ? 'border-[#701111] text-[#701111] bg-white shadow-xs'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Fee Structures Master ({structures.length})
        </button>
      </div>

      {/* TAB 1: STUDENT INVOICES */}
      {activeTab === 'invoices' && (
        <Card className="p-6 space-y-4 shadow-lg">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 font-medium focus:ring-2 focus:ring-[#701111]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="p-2 rounded-lg border border-slate-300 font-medium"
              >
                <option value="ALL">All Fee Categories</option>
                <option value="TUITION">Tuition Fee</option>
                <option value="EXAM">Examination Fee</option>
                <option value="HOSTEL">Hostel & Mess</option>
                <option value="TRANSPORT">Bus / Transport</option>
                <option value="LAB">Lab & Workshop</option>
                <option value="MISC">Miscellaneous</option>
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="p-2 rounded-lg border border-slate-300 font-medium"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PENDING">Pending (Unpaid)</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Fully Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          {/* Fee Invoices Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3">Student</th>
                  <th className="p-3">Fee Title / Category</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Paid Amount</th>
                  <th className="p-3">Balance Due</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-500">
                      Loading fee invoices...
                    </td>
                  </tr>
                ) : fees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-500">
                      <CreditCard className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      No student fee records found. Click "Generate Batch Invoices" to create fee demands for a class!
                    </td>
                  </tr>
                ) : (
                  fees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-slate-50 transition-colors">
                      {/* Student */}
                      <td className="p-3 font-bold text-slate-900">
                        <div>{fee.student.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {fee.student.rollNumber} • {fee.student.department.code} (Sem {fee.student.semester}-
                          {fee.student.section})
                        </div>
                      </td>

                      {/* Fee Title */}
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{fee.title}</div>
                        <span className="inline-block px-2 py-0.5 mt-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {fee.category} • {fee.academicYear}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="p-3 font-bold text-slate-900">
                        ₹{fee.totalAmount.toLocaleString('en-IN')}
                        {fee.discountAmount > 0 && (
                          <div className="text-[10px] text-emerald-600">
                            -₹{fee.discountAmount} Concession
                          </div>
                        )}
                      </td>

                      {/* Paid Amount */}
                      <td className="p-3 font-bold text-emerald-700">
                        ₹{fee.paidAmount.toLocaleString('en-IN')}
                      </td>

                      {/* Balance Due */}
                      <td className="p-3 font-black text-rose-700">
                        ₹{fee.balance.toLocaleString('en-IN')}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        {fee.status === 'PAID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> PAID
                          </span>
                        )}
                        {fee.status === 'PARTIAL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900">
                            <Clock className="h-3 w-3" /> PARTIAL
                          </span>
                        )}
                        {fee.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-200 text-slate-800">
                            PENDING
                          </span>
                        )}
                        {fee.status === 'OVERDUE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-800">
                            <AlertCircle className="h-3 w-3" /> OVERDUE
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="p-3 text-slate-500 font-mono">
                        {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '—'}
                      </td>

                      {/* Action */}
                      <td className="p-3 text-right">
                        {fee.balance > 0 ? (
                          <Button
                            onClick={() => handleOpenPaymentModal(fee)}
                            className="bg-[#701111] hover:bg-[#500c0c] text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-xs inline-flex items-center gap-1"
                          >
                            <IndianRupee className="h-3 w-3" />
                            Collect Fee
                          </Button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                            Fully Settled ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <Card className="p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#701111]" />
                Fee Payment Ledger & Audit Trail
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time collection transactions with auto-generated receipt numbers.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">{transactions.length} Transactions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Student Name & Roll No</th>
                  <th className="p-3">Fee Title</th>
                  <th className="p-3">Amount Paid</th>
                  <th className="p-3">Mode & Ref</th>
                  <th className="p-3">Collected By</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-8 text-slate-500">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-black text-[#701111]">{tx.receiptNumber}</td>
                      <td className="p-3 font-bold text-slate-900">
                        <div>{tx.studentFee?.student?.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {tx.studentFee?.student?.rollNumber} • {tx.studentFee?.student?.department?.code}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{tx.studentFee?.title}</td>
                      <td className="p-3 font-black text-emerald-700">
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                          {tx.paymentMode}
                        </span>
                        {tx.transactionRef && (
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-xs">
                            Ref: {tx.transactionRef}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {tx.collectedByUser?.name || 'Authorized Staff'}
                      </td>
                      <td className="p-3 text-slate-500 font-mono">
                        {new Date(tx.paidDate).toLocaleString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setReceiptData({
                              receiptNumber: tx.receiptNumber,
                              paidDate: tx.paidDate,
                              amount: tx.amount,
                              paymentMode: tx.paymentMode,
                              transactionRef: tx.transactionRef,
                              studentName: tx.studentFee?.student?.name,
                              rollNumber: tx.studentFee?.student?.rollNumber,
                              department: tx.studentFee?.student?.department?.name,
                              course: tx.studentFee?.student?.course?.name,
                              feeTitle: tx.studentFee?.title,
                              remainingBalance: 0,
                              collectedBy: tx.collectedByUser?.name || 'Accounts Officer',
                            });
                          }}
                          className="text-[#701111] hover:text-[#500c0c] font-bold text-xs flex items-center justify-end gap-1 underline"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: STRUCTURES MASTER */}
      {activeTab === 'structures' && (
        <Card className="p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#701111]" />
                Standard Fee Structures Master
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Preset fee amounts for tuition, university exams, hostel, and transport.
              </p>
            </div>
            <Button
              onClick={() => setIsStructureModalOpen(true)}
              className="bg-[#701111] hover:bg-[#500c0c] text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Fee Structure
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#701111] transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                    {st.category}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">{st.academicYear}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-2">{st.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {st.course ? st.course.name : 'All Departments / Institution Wide'}
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-500">Preset Amount:</span>
                  <span className="text-lg font-black text-[#701111]">
                    ₹{st.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL 1: COLLECT FEE PAYMENT */}
      {paymentModalFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#701111] to-[#8a1515] p-5 text-white flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-amber-400" />
                  Collect Student Fee
                </h2>
                <p className="text-xs text-amber-100/90 mt-0.5">
                  {paymentModalFee.student.name} ({paymentModalFee.student.rollNumber})
                </p>
              </div>
              <button
                onClick={() => setPaymentModalFee(null)}
                className="text-white/70 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs">
              {/* Fee Information Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee Title:</span>
                  <span className="font-bold text-slate-900">{paymentModalFee.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Billed:</span>
                  <span className="font-bold text-slate-900">
                    ₹{paymentModalFee.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Paid:</span>
                  <span className="font-bold text-emerald-700">
                    ₹{paymentModalFee.paidAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-black">
                  <span className="text-[#701111]">Pending Balance:</span>
                  <span className="text-[#701111]">
                    ₹{paymentModalFee.balance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Amount to Collect (₹) *</label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(paymentModalFee.balance))}
                    className="text-[11px] font-bold text-[#701111] hover:underline"
                  >
                    Pay Full Balance
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  max={paymentModalFee.balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-sm font-bold focus:ring-2 focus:ring-[#701111]"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method *</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-[#701111]"
                >
                  <option value="UPI_ONLINE">UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash at College Counter</option>
                  <option value="NET_BANKING">Net Banking / NEFT / RTGS</option>
                  <option value="DD_CHEQUE">Demand Draft (DD) / Cheque</option>
                  <option value="CARD">Debit / Credit Card</option>
                </select>
              </div>

              {/* Transaction Ref */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Transaction / UTR / Cheque Ref (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref 329012391092 or DD #109282"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#701111]"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="Optional cashier notes..."
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[#701111]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setPaymentModalFee(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPayment}
                  className="bg-[#701111] hover:bg-[#500c0c] text-white px-5 py-2 font-bold shadow-md"
                >
                  {submittingPayment ? 'Processing...' : 'Confirm Payment & Print Receipt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: OFFICIAL PRINTABLE RECEIPT */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150">
            {/* Top Toolbar */}
            <div className="bg-slate-900 px-5 py-3 text-white flex items-center justify-between print:hidden">
              <span className="text-xs font-bold flex items-center gap-1.5 text-amber-300">
                <Printer className="h-4 w-4" />
                Digital Official Fee Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1 rounded text-xs font-black shadow-xs flex items-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Receipt
                </button>
                <button
                  onClick={() => setReceiptData(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper */}
            <div className="p-8 space-y-5 text-slate-900 bg-white" id="printable-receipt">
              {/* Institution Emblem Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4">
                <img
                  src="/smit-logo.png"
                  alt="SMIT Emblem"
                  className="h-14 mx-auto mb-2 object-contain"
                />
                <h1 className="text-base font-black tracking-tight text-[#701111]">
                  SRI MUTHUKUMARAN INSTITUTE OF TECHNOLOGY
                </h1>
                <p className="text-[10px] text-slate-600 font-medium">
                  Approved by AICTE, Affiliated to Anna University, Chennai
                </p>
                <p className="text-[10px] text-slate-500">Chikkarayapuram, Near Mangadu, Chennai - 600069</p>
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-black uppercase tracking-wider">
                  Official Student Fee Receipt
                </div>
              </div>

              {/* Receipt Details Header */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-dashed border-slate-300 pb-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Receipt Number:</span>
                  <span className="font-black font-mono text-[#701111]">{receiptData.receiptNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Date & Time:</span>
                  <span className="font-medium font-mono">
                    {new Date(receiptData.paidDate).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Student Identification */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-extrabold text-slate-900">{receiptData.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Roll Number:</span>
                  <span className="font-mono font-bold">{receiptData.rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department & Degree:</span>
                  <span className="font-medium">{receiptData.course || receiptData.department}</span>
                </div>
              </div>

              {/* Payment Breakdown */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2 text-left">Description</th>
                    <th className="py-2 text-right">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 font-bold text-slate-800">{receiptData.feeTitle}</td>
                    <td className="py-2.5 font-black text-right">
                      ₹{receiptData.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                  <tr className="bg-slate-50 font-black text-sm">
                    <td className="py-2 text-slate-900">Total Paid:</td>
                    <td className="py-2 text-right text-emerald-700">
                      ₹{receiptData.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Payment Method Details */}
              <div className="text-[11px] text-slate-600 space-y-1 border-t border-slate-200 pt-3">
                <div>
                  <span className="font-bold">Payment Mode:</span> {receiptData.paymentMode}
                </div>
                {receiptData.transactionRef && (
                  <div>
                    <span className="font-bold">Transaction Reference:</span> {receiptData.transactionRef}
                  </div>
                )}
                <div>
                  <span className="font-bold">Remaining Balance Due:</span> ₹
                  {receiptData.remainingBalance.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Authorized Stamp & Signature */}
              <div className="pt-8 flex items-end justify-between text-xs">
                <div>
                  <div className="h-10 w-24 border-2 border-emerald-600 text-emerald-700 font-black flex items-center justify-center rounded text-[10px] uppercase rotate-[-6deg]">
                    Fee Paid ✓
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-t border-slate-400 w-36 pt-1 font-bold text-[11px] text-slate-800">
                    Accounts Officer
                  </div>
                  <div className="text-[10px] text-slate-500">SMIT Finance Counter</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH GENERATE INVOICES */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#701111] p-5 text-white flex items-center justify-between">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Batch Generate Class Invoices
              </h2>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-white/70 hover:text-white">
                ✕
              </button>
            </div>
            <form onSubmit={handleGenerateBatch} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Degree Course *</label>
                <select
                  value={batchCourseId}
                  onChange={(e) => setBatchCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Semester *</label>
                <select
                  value={batchSemester}
                  onChange={(e) => setBatchSemester(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Title *</label>
                <input
                  type="text"
                  required
                  value={batchFeeTitle}
                  onChange={(e) => setBatchFeeTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={batchCategory}
                    onChange={(e) => setBatchCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                  >
                    <option value="TUITION">Tuition</option>
                    <option value="EXAM">Exam Fee</option>
                    <option value="HOSTEL">Hostel</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="LAB">Lab</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount per Student (₹) *</label>
                  <input
                    type="number"
                    required
                    value={batchAmount}
                    onChange={(e) => setBatchAmount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingBatch}
                  className="bg-[#701111] hover:bg-[#500c0c] text-white px-5 py-2 font-bold shadow-md"
                >
                  {submittingBatch ? 'Generating...' : 'Generate Invoices for Enrolled Students'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD STRUCTURE */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-[#701111] p-5 text-white flex items-center justify-between">
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-400" />
                Add Standard Fee Structure Master
              </h2>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateStructure} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Structure Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. B.E. CSE Tuition Fee"
                  value={structTitle}
                  onChange={(e) => setStructTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Category *</label>
                  <select
                    value={structCategory}
                    onChange={(e) => setStructCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                  >
                    <option value="TUITION">Tuition</option>
                    <option value="EXAM">Examination</option>
                    <option value="HOSTEL">Hostel & Mess</option>
                    <option value="TRANSPORT">Transport</option>
                    <option value="LAB">Lab</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fee Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="85000"
                    value={structAmount}
                    onChange={(e) => setStructAmount(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Course (Optional)</label>
                <select
                  value={structCourseId}
                  onChange={(e) => setStructCourseId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-medium"
                >
                  <option value="">-- All Institution Courses --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingStruct}
                  className="bg-[#701111] hover:bg-[#500c0c] text-white px-5 py-2 font-bold shadow-md"
                >
                  {submittingStruct ? 'Saving...' : 'Save Fee Structure'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Plus, FileText, CheckCircle, AlertCircle, Clock, Settings, CreditCard, Percent, XCircle, Download, RotateCcw, Bell, Search } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { feeService, FeeStructure, StudentFee, FeePayment } from '@/services/feeService';
import { settingsService } from '@/services/settingsService';
import { LedgerTable, StudentGroup } from './finance/components/LedgerTable';
import { DefaultersTable } from './finance/components/DefaultersTable';
import { HistoryModal } from './finance/components/HistoryModal';
import { ReversalDialog } from './finance/components/ReversalDialog';
import { RecordPaymentModal } from './finance/components/RecordPaymentModal';
import { FeeConfigurationTab } from './finance/FeeConfigurationTab';
import { downloadFile } from '@/lib/plugins/filesystem';
import { generateFeeReceiptHtml, generateFeeInvoiceHtml, printReceipt } from '@/lib/receiptUtils';
import { auditLog } from '@/lib/audit';

export function AdminFinanceView() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [ledgers, setLedgers] = useState<StudentFee[]>([]);
  const [activeYear, setActiveYear] = useState<string>('2026-2027');
  const [timeFilter, setTimeFilter] = useState<'month' | 'year'>('year');
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'dues' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'highest_due' | 'lowest_due'>('highest_due');

  const [activeTab, setActiveTab] = useState<'overview' | 'defaulters' | 'config'>('overview');

  // Payment Modal State
  const [paymentTarget, setPaymentTarget] = useState<StudentFee | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [payPeriodType, setPayPeriodType] = useState('Unspecified');
  const [payPeriodValue, setPayPeriodValue] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  // History Modal State
  const [historyTarget, setHistoryTarget] = useState<StudentFee | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([]);

  // Reversal State
  const [reversalTarget, setReversalTarget] = useState<FeePayment | null>(null);
  const [reversalNote, setReversalNote] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  // Reminded tracking (session-only, no DB change)
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());


  useEffect(() => {
    loadData();
  }, [activeYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const settings = await settingsService.fetchAllSettings();
      const yearSetting = settings.find(s => s.setting_key === 'academic_year');
      const year = yearSetting ? String(yearSetting.setting_value).replace(/"/g, '') : '2026-2027';
      setActiveYear(year);

      const [strData, ledData] = await Promise.all([
        feeService.fetchFeeStructures(year),
        feeService.fetchStudentFees(year)
      ]);
      setStructures(strData);
      setLedgers(ledData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewHistory = async (ledger: StudentFee) => {
    setHistoryTarget(ledger);
    const history = await feeService.fetchFeePayments(ledger.id!);
    setPaymentHistory(history);
  };

  const handleOpenPayment = (ledger: StudentFee) => {
    const pendingAmount = ledger.total_due - ledger.amount_paid;
    setPayAmount(pendingAmount.toString());
    setPayMode('Cash');
    setPayRef('');
    setPayRemarks('');
    setPaymentTarget(ledger);
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget) return;
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) return showToast('error', 'Valid amount is required');
    if (['UPI', 'Cheque', 'Bank Transfer'].includes(payMode) && !payRef) {
      return showToast('error', `Reference number is required for ${payMode}`);
    }

    setIsPaying(true);
    const receiptNo = `RCPT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const payload: FeePayment = {
      student_fee_id: paymentTarget.id,
      amount,
      payment_mode: payMode,
      reference_number: payRef || undefined,
      receipt_number: receiptNo,
      remarks: payRemarks || undefined
    };

    const result = await feeService.recordPayment(payload);
    if (result.success) {
      showToast('success', `Payment recorded. Receipt: ${result.receipt}`);
      setPaymentTarget(null);
      loadData(); // Refresh ledger
    } else {
      showToast('error', result.message);
    }
    setIsPaying(false);
  };

  
  // Compute true global outstanding per student (ignoring time/category filters)
  const globalOutstandingMap = useMemo(() => {
    const map: Record<string, number> = {};
    ledgers.forEach(l => {
      if (l.status !== 'Waived' && l.status !== 'Cancelled') {
        const sid = l.student_id;
        const pending = (Number(l.total_due) || 0) - (Number(l.amount_paid) || 0);
        map[sid] = (map[sid] || 0) + pending;
      }
    });
    return map;
  }, [ledgers]);

  // 1. First apply time and category filters to raw ledgers
  const baseFilteredLedgers = useMemo((): StudentFee[] => {
    let result = ledgers;
    
    // Time Filter
    if (timeFilter === 'month') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      result = result.filter(l => {
        if (!l.due_date) return l.fee_period !== 'Monthly';
        const d = new Date(l.due_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
    }
    
    // Category Filter
    if (categoryFilter !== 'all') {
      result = result.filter(l => {
        const catName = l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'General Fee';
        return catName === categoryFilter;
      });
    }
    
    return result;
  }, [ledgers, timeFilter, categoryFilter]);

  // 2. Group the filtered ledgers by Student
  const studentGroups = useMemo(() => {
    const groups: Record<string, StudentGroup> = {};
    baseFilteredLedgers.forEach(l => {
      const sid = l.student_id;
      if (!groups[sid]) {
        groups[sid] = { 
          studentId: sid,
          studentName: l.student?.name || 'Unknown Student',
          className: l.student?.class_name || 'Unknown Class',
          ledgers: [], 
          totalDue: 0, 
          totalPaid: 0,
          outstanding: 0,
          globalOutstanding: globalOutstandingMap[sid] || 0
        };
      }
      groups[sid].ledgers.push(l);
      groups[sid].totalDue += Number(l.total_due) || 0;
      groups[sid].totalPaid += Number(l.amount_paid) || 0;
      groups[sid].outstanding = groups[sid].totalDue - groups[sid].totalPaid;
    });
    return Object.values(groups);
  }, [baseFilteredLedgers, globalOutstandingMap]);

  // Unique lists for dropdowns
  const availableClasses = useMemo(() => Array.from(new Set(studentGroups.map(g => g.className))).sort(), [studentGroups]);
  const availableCategories = useMemo(() => Array.from(new Set(ledgers.map(l => l.category?.name || l.structure?.category?.name || l.structure?.fee_category || 'General Fee'))).sort(), [ledgers]);

  // 3. Final Filter & Sort of the Student Groups
  const filteredGroups = useMemo(() => {
    let result = studentGroups.filter(g => {
      if (statusFilter === 'dues' && g.globalOutstanding <= 0) return false;
      if (statusFilter === 'paid' && g.globalOutstanding > 0) return false;
      if (classFilter !== 'all' && g.className !== classFilter) return false;
      if (searchTerm && !g.studentName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'highest_due') return b.outstanding - a.outstanding;
      if (sortBy === 'lowest_due') return a.outstanding - b.outstanding;
      return a.studentName.localeCompare(b.studentName);
    });

    return result;
  }, [studentGroups, statusFilter, classFilter, searchTerm, sortBy]);

  // 4. Compute KPIs exactly from the filtered groups
  const totalExpected = filteredGroups.reduce((acc, curr) => acc + curr.totalDue, 0);
  const totalCollected = filteredGroups.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const totalPending = filteredGroups.reduce((acc, curr) => acc + curr.outstanding, 0);
  // Discounts apply to all base ledgers currently on screen
  const totalDiscounts = baseFilteredLedgers.reduce((acc, curr) => acc + (curr.discount_amount || 0), 0);
  const totalWaivedCount = ledgers.filter(l => l.status === 'Waived').length;

  // Defaulters: overdue ledgers (past due_date, still unpaid/partially paid)
  const defaulters = useMemo((): StudentFee[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ledgers.filter(l => {
      if (l.status === 'Paid' || l.status === 'Waived' || l.status === 'Cancelled') return false;
      if (!l.due_date) return false;
      const due = new Date(l.due_date);
      due.setHours(0, 0, 0, 0);
      return due < today;
    }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [ledgers]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading financial records...</div>;
  }

  const getAgingBucket = (dueDate?: string) => {
    if (!dueDate) return { label: 'Unknown', color: 'text-slate-500', bg: 'bg-slate-100' };
    const daysOverdue = Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 60) return { label: `${daysOverdue}d overdue`, color: 'text-rose-700', bg: 'bg-rose-100' };
    if (daysOverdue > 30) return { label: `${daysOverdue}d overdue`, color: 'text-orange-700', bg: 'bg-orange-100' };
    return { label: `${daysOverdue}d overdue`, color: 'text-amber-700', bg: 'bg-amber-100' };
  };

  const handlePrintInvoice = (target: StudentFee, allPayments: FeePayment[]) => {
    // Collect all ledgers for this student
    const studentLedgers = ledgers.filter(l => l.student_id === target.student_id);
    const studentName = target.student?.name || '';
    const className = target.student?.class_name || '';
    const html = generateFeeInvoiceHtml(studentName, className, studentLedgers, allPayments);
    printReceipt(html);
    auditLog({
      actor_type: 'admin',
      action: 'FEE_INVOICE_PRINTED',
      resource_type: 'student',
      resource_id: target.student_id,
      metadata: { student_name: studentName, academic_year: activeYear },
    });
  };

  const handleReversePayment = async () => {
    if (!reversalTarget || !historyTarget) return;
    if (!reversalNote.trim()) return showToast('error', 'Please provide a reason for reversal.');
    setIsReversing(true);
    const result = await feeService.reversePayment(
      reversalTarget.id!,
      reversalTarget.student_fee_id,
      reversalTarget.amount,
      reversalNote
    );
    if (result.success) {
      showToast('success', result.message);
      setReversalTarget(null);
      setReversalNote('');
      // Refresh history and ledger
      const updated = await feeService.fetchFeePayments(historyTarget.id!);
      setPaymentHistory(updated);
      loadData();
    } else {
      showToast('error', result.message);
    }
    setIsReversing(false);
  };

  const handleMarkReminded = (ledger: StudentFee) => {
    const pending = (ledger.total_due || 0) - (ledger.amount_paid || 0);
    auditLog({
      actor_type: 'admin',
      action: 'FEE_REMINDER_SENT',
      resource_type: 'student',
      resource_id: ledger.student_id,
      metadata: { student_name: ledger.student?.name, amount_pending: pending, academic_year: activeYear },
    });
    setRemindedIds(prev => new Set([...prev, ledger.id!]));
    showToast('success', `Reminder logged for ${ledger.student?.name}`);
  };

  


  const handleExportCSV = async () => {
    const headers = ['Student Name', 'Class', 'Fee Category', 'Original Fee', 'Discount', 'Adjusted Due', 'Amount Paid', 'Pending', 'Status'];
    const csvContent = ledgers.map(l => {
      const original = (l.total_due + (l.discount_amount || 0));
      const pending = l.total_due - l.amount_paid;
      return [
        `"${l.student?.name || ''}"`,
        `"${l.student?.class_name || ''}"`,
        `"${l.structure?.category?.name || l.structure?.fee_category || ''}"`,
        original,
        l.discount_amount || 0,
        l.total_due,
        l.amount_paid,
        l.status === 'Waived' ? 0 : pending,
        `"${l.status}"`
      ].join(',');
    });

    const csvData = [headers.join(','), ...csvContent].join('\n');
    await downloadFile(`fee_ledgers_${activeYear}.csv`, csvData, 'text/csv', false);
  };

  const handleBulkRemind = () => {
    const duesCount = filteredGroups.filter(g => g.outstanding > 0).length;
    if (duesCount === 0) return showToast('error', 'No students with dues in the current view.');
    
    auditLog({
      actor_type: 'staff',
      action: 'SYSTEM_UPDATED' as any,
      resource_type: 'system',
      metadata: { action: 'BULK_REMINDER_SENT', count: duesCount }
    });
    showToast('success', `Reminders sent to ${duesCount} students successfully!`);
  };



  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Fee Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">Manage fee structures and student ledgers for {activeYear}</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'overview'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <DollarSign size={16} /> Ledger Overview
          </button>
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'defaulters'
              ? 'bg-white dark:bg-slate-800 text-rose-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <AlertCircle size={16} /> Defaulters
            {defaulters.length > 0 && (
              <span className="ml-0.5 bg-rose-500 text-white text-xs font-extrabold px-1.5 py-0.5 rounded-full leading-none">
                {defaulters.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'config'
              ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
          >
            <Settings size={16} /> Configurations
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <FeeConfigurationTab activeYear={activeYear} />
      ) : activeTab === 'defaulters' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-rose-800">Defaulters & Aging</h3>
          </div>
          <DefaultersTable
            defaulters={defaulters}
            remindedIds={remindedIds}
            onCollect={handleOpenPayment}
            onRemind={handleMarkReminded}
            getAgingBucket={getAgingBucket}
          />
        </div>
      ) : (
        
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1.5">
                <FileText size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Total Expected</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">₹{totalExpected.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center gap-2 text-emerald-600 mb-1.5">
                <CheckCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Collected</h3>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">₹{totalCollected.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
              <div className="flex items-center gap-2 text-rose-600 mb-1.5">
                <AlertCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Pending Dues</h3>
              </div>
              <p className="text-2xl font-extrabold text-rose-700">₹{totalPending.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 text-amber-600 mb-1.5">
                <Percent size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Discounts</h3>
              </div>
              <p className="text-2xl font-extrabold text-amber-700">₹{totalDiscounts.toLocaleString()}</p>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-600 mb-1.5">
                <XCircle size={16} />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Waived Fees</h3>
              </div>
              <p className="text-2xl font-extrabold text-slate-700">{totalWaivedCount} <span className="text-sm font-normal text-slate-500">students</span></p>
            </div>
          </div>

          {/* TOP CONTROLS */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 hidden md:block">Fee Ledgers</h3>
              <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                <button 
                  onClick={() => setTimeFilter('month')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  This Month
                </button>
                <button 
                  onClick={() => setTimeFilter('year')}
                  className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${timeFilter === 'year' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Full Year
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              <div className="relative w-full md:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search student..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Fee Types</option>
                {availableCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={classFilter} 
                onChange={(e) => setClassFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 hidden lg:block"
              >
                <option value="all">All Classes</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="dues">Has Dues</option>
                <option value="paid">Fully Paid</option>
              </select>

              <button 
                onClick={handleExportCSV}
                className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-100"
              >
                <Download size={16} /> Export
              </button>

              <button 
                onClick={handleBulkRemind}
                className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors border border-rose-100"
              >
                <Bell size={16} /> Remind Dues
              </button>
            </div>
          </div>
          
          <LedgerTable
            groups={filteredGroups}
            activeYear={activeYear}
            onViewHistory={handleViewHistory}
            onCollect={handleOpenPayment}
          />
        </div>

      )}
      {/* Payment History Modal */}
      <HistoryModal
        historyTarget={historyTarget}
        paymentHistory={paymentHistory}
        onClose={() => setHistoryTarget(null)}
        onPrintInvoice={() => handlePrintInvoice(historyTarget!, paymentHistory)}
        onPrintReceipt={(html) => printReceipt(html)}
        onReversePayment={(pay) => { setReversalTarget(pay); setReversalNote(''); }}
        canDelete={can('fees.delete')}
      />

      <ReversalDialog
        reversalTarget={reversalTarget}
        reversalNote={reversalNote}
        setReversalNote={setReversalNote}
        isReversing={isReversing}
        onClose={() => { setReversalTarget(null); setReversalNote(''); }}
        onConfirm={handleReversePayment}
      />

      <RecordPaymentModal
        paymentTarget={paymentTarget}
        payAmount={payAmount}
        setPayAmount={setPayAmount}
        payMode={payMode}
        setPayMode={setPayMode}
        payRef={payRef}
        setPayRef={setPayRef}
        payRemarks={payRemarks}
        setPayRemarks={setPayRemarks}
        payPeriodType={payPeriodType}
        setPayPeriodType={setPayPeriodType}
        payPeriodValue={payPeriodValue}
        setPayPeriodValue={setPayPeriodValue}
        isPaying={isPaying}
        onClose={() => setPaymentTarget(null)}
        onConfirm={handleRecordPayment}
      />
    </div>
  );
}

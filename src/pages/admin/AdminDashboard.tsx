import { useState, useEffect } from 'react';
import { ShieldCheck, Users, BookOpen, Clock, Search, LogOut, ArrowLeft, UserCheck, Activity, Eye, FileText } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Staff, Student, DailyLog, GatePass } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { FullScreenSpinner } from '@/components/Spinner';
import { getMockStaff, getMockStudents, getMockLogs, getMockGatePasses } from '@/lib/mockData';

import { Mail, Lock, ShieldAlert, KeyRound } from 'lucide-react';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';

import { StudentHistoryModal } from '@/pages/staff/StudentHistoryModal';
import { ActivityFormModal } from '@/pages/staff/ActivityFormModal';
import { AddStaffModal } from '@/pages/admin/AddStaffModal';
import { AnalyticsTab } from './AnalyticsTab';

export function AdminDashboard() {
  const { navigate } = useRouter();

  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'analytics' | 'students' | 'staff'>('activity');

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [activityLogs, setActivityLogs] = useState<DailyLog[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewHistoryStudent, setViewHistoryStudent] = useState<Student | null>(null);
  const [logActivityStudent, setLogActivityStudent] = useState<Student | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  useEffect(() => {
    if (adminAuthenticated) {
      loadAllAdminData();
    } else {
      setLoading(false);
    }

    const handleUpdate = () => {
      if (adminAuthenticated) loadAllAdminData();
    };
    window.addEventListener('gate_pass_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('gate_pass_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [adminAuthenticated]);

  const handleAdminAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminPassword.trim()) {
      showToast('error', 'Please enter admin email and password.');
      return;
    }

    setAdminLoginLoading(true);
    try {
      const cleanEmail = adminEmail.trim().toLowerCase();
      let matchedAdmin: Staff | null = null;

      try {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data && (data.role === 'admin' || data.email === 'admin@school.com')) {
          matchedAdmin = {
            id: data.id,
            email: data.email,
            password: data.password || data.password_hash || '',
            name: data.name,
            assigned_class: data.assigned_class,
            role: data.role || 'admin',
          };
        }
      } catch (e) {
        console.warn('[AdminDashboard] Supabase admin login check fallback');
      }

      if (!matchedAdmin) {
        const mockStaff = getMockStaff();
        matchedAdmin = mockStaff.find(
          (s) => s.email.toLowerCase() === cleanEmail && (s.role === 'admin' || s.email === 'admin@school.com')
        ) || null;
      }

      if (!matchedAdmin) {
        showToast('error', 'Access denied. Account is not registered as an Admin.');
        setAdminLoginLoading(false);
        return;
      }

      if (matchedAdmin.password !== adminPassword.trim() && matchedAdmin.password !== btoa(adminPassword.trim())) {
        showToast('error', 'Invalid admin password.');
        setAdminLoginLoading(false);
        return;
      }

      setAdminAuthenticated(true);
      showToast('success', `Admin access granted. Welcome, ${matchedAdmin.name}!`);
    } catch (err) {
      showToast('error', 'Authentication failed.');
    } finally {
      setAdminLoginLoading(false);
    }
  };

  if (!adminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-3xl mx-auto border border-amber-500/30">
            👑
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Admin Restricted Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Only authorized admin users can access system activity logs and audit records.
            </p>
          </div>

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@school.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:border-amber-400 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:border-amber-400 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={adminLoginLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm"
            >
              {adminLoginLoading ? <Spinner size={20} className="text-slate-950" /> : 'Authenticate Admin Access'}
            </Button>
          </form>

          <div className="pt-2 border-t border-slate-700">
            <button
              onClick={() => {
                setAdminEmail('admin@school.com');
                setAdminPassword('admin123');
              }}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Fill Demo Admin Credentials (admin@school.com / admin123)
            </button>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mx-auto"
          >
            <ArrowLeft size={14} /> Back to Main Landing Page
          </button>
        </div>
      </div>
    );
  }

  const loadAllAdminData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch Staff
      const { data: sData } = await supabase.from('staff').select('*');
      if (sData && sData.length > 0) {
        setStaffList(
          sData.map((d: any) => ({
            id: d.id,
            email: d.email,
            password: d.password || d.password_hash || '',
            name: d.name || d.email.split('@')[0],
            assigned_class: d.assigned_class || 'All',
            photo_url: d.photo_url,
            role: d.role || 'staff',
          }))
        );
      } else {
        setStaffList(getMockStaff());
      }

      // 2. Fetch Students
      const { data: stData } = await supabase.from('students').select('*');
      if (stData && stData.length > 0) {
        setStudentList(
          stData.map((d: any) => ({
            id: d.id || String(d.roll_no || d.roll_number),
            roll_no: String(d.roll_no || d.roll_number || '101'),
            pin: String(d.pin || '1234'),
            name: d.name || 'Student',
            class_name: d.class_name || d.class || 'Nursery',
            guardian_name: d.guardian_name,
            parent_phone: d.parent_phone,
            student_photo_url: d.student_photo_url,
            parent_photo_url: d.parent_photo_url,
          }))
        );
      } else {
        setStudentList(getMockStudents());
      }

      // 3. Fetch Activity Logs
      let logsData: DailyLog[] = [];
      const { data: aData } = await supabase.from('daily_logs').select('*').order('created_at', { ascending: false });
      if (aData && aData.length > 0) {
        logsData = aData as DailyLog[];
      } else {
        const { data: fallbackAData } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false });
        if (fallbackAData && fallbackAData.length > 0) {
          logsData = fallbackAData as DailyLog[];
        } else {
          logsData = getMockLogs();
        }
      }
      setActivityLogs(logsData);

      // 4. Fetch Gate Passes
      const { data: gData } = await supabase.from('gate_passes').select('*').order('created_at', { ascending: false });
      if (gData && gData.length > 0) {
        setGatePasses(gData as GatePass[]);
      } else {
        setGatePasses(getMockGatePasses());
      }
    } catch (err) {
      console.warn('[AdminDashboard] Fallback to mock data');
      setStaffList(getMockStaff());
      setStudentList(getMockStudents());
      setActivityLogs(getMockLogs());
      setGatePasses(getMockGatePasses());
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = studentList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.roll_no.includes(searchQuery) ||
      (s.guardian_name && s.guardian_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredStaff = staffList.filter(
    (st) =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <FullScreenSpinner label="Loading Admin Activity Portal..." />;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const completedHandoversToday = gatePasses.filter((g) => g.pass_date === todayStr && g.status === 'COMPLETED').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Admin Top Header */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden sm:inline-block bg-amber-500/20 text-amber-300 text-xs font-bold px-3 py-1 rounded-full border border-amber-500/30">
              👑 Admin Control Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              <ArrowLeft size={16} /> Home
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md">
                Principal Dashboard
              </span>
              <span className="text-xs text-slate-300 font-medium">All Activities & Audit Logs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Preschool Activity Overview</h1>
            <p className="text-slate-300 text-sm mt-1">
              Full visibility over staff-parent interactions, daily activity logs, and gate handover scans.
            </p>
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
              👶
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Total Enrolled</p>
              <p className="text-2xl font-bold text-slate-800">{studentList.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
              👩‍🏫
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Staff Members</p>
              <p className="text-2xl font-bold text-slate-800">{staffList.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
              📝
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Daily Logs</p>
              <p className="text-2xl font-bold text-slate-800">{activityLogs.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
              🎫
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400">Handovers Today</p>
              <p className="text-2xl font-bold text-emerald-600">{completedHandoversToday}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'activity'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity size={16} /> Activity Stream
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'analytics'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText size={16} /> Analytics & Reports
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users size={16} /> Student Directory
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
                activeTab === 'staff'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck size={16} /> Teachers Directory
            </button>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search records..."
              className="w-full sm:w-60 pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Tab 1: Live Staff-Parent Activity Feed Stream */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Live System Activity Logs & Gate Scans
            </h2>

            {/* Combined Stream: Gate Passes + Activity Logs */}
            <div className="space-y-3">
              {gatePasses.map((pass) => (
                <div
                  key={pass.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      🎫
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm">{pass.student_name}</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                          Roll #{pass.roll_no}
                        </span>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                          {pass.class_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        QR Gate Pass Status:{' '}
                        <span className={`font-bold ${pass.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {pass.status === 'COMPLETED' ? 'CHILD HANDOVER COMPLETED' : 'PASS ACTIVE & PENDING'}
                        </span>
                        {pass.approved_by_staff && ` • Approved by ${pass.approved_by_staff}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400 font-medium self-end sm:self-center">
                    Date: {pass.pass_date || todayStr}
                    {pass.pickup_time && (
                      <div className="text-emerald-700 font-bold">
                        {new Date(pass.pickup_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {activityLogs.map((log) => {
                const matchedStud = studentList.find((s) => s.id === log.student_id || s.roll_no === log.student_id);
                return (
                  <div key={log.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                          {log.staff_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {log.staff_name || 'Teacher'} logged activity for{' '}
                            <span className="text-sky-600">{matchedStud?.name || 'Student'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(log.created_at || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {log.teacher_notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        "{log.teacher_notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Analytics & Overall Activity Breakdown */}
        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {/* Tab 3: Students & Verification Photos Directory */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Student Directory & Gate Verification Photos ({filteredStudents.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredStudents.map((stud) => (
                <div key={stud.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{stud.name}</h3>
                      <p className="text-xs text-slate-500">
                        Roll #{stud.roll_no} • <span className="font-semibold text-sky-600">{stud.class_name}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewHistoryStudent(stud)}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold border border-sky-200"
                      >
                        👁️ Feed
                      </button>
                      <button
                        onClick={() => setLogActivityStudent(stud)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200"
                      >
                        📝 Log
                      </button>
                    </div>
                  </div>

                  {/* Side-by-Side Photos */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-600 text-[11px] mb-1">Student Photo</p>
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white mx-auto flex items-center justify-center text-lg font-bold text-slate-400">
                        {stud.student_photo_url ? (
                          <img src={stud.student_photo_url} alt={stud.name} className="w-full h-full object-cover" />
                        ) : (
                          '👶'
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-bold text-slate-600 text-[11px] mb-1">Parent Photo</p>
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white mx-auto flex items-center justify-center text-lg font-bold text-slate-400">
                        {stud.parent_photo_url ? (
                          <img src={stud.parent_photo_url} alt="Parent" className="w-full h-full object-cover" />
                        ) : (
                          '👨‍👩‍👧'
                        )}
                      </div>
                      <p className="text-[10px] font-semibold text-slate-700 mt-1 truncate">
                        {stud.guardian_name || 'Guardian'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Teachers & Staff Directory */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                School Staff & Teachers Directory ({filteredStaff.length})
              </h2>
              <button 
                onClick={() => setShowAddStaffModal(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                + Add Staff
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredStaff.map((st) => (
                <div key={st.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-sky-300 bg-sky-50 flex items-center justify-center text-xl font-bold text-sky-700 flex-shrink-0">
                    {st.photo_url ? (
                      <img src={st.photo_url} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      st.name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 truncate">{st.name}</h3>
                      {st.role === 'admin' && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          ADMIN
                        </span>
                      )}
                      {st.role === 'gate_staff' && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          GUARD
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{st.email}</p>
                    <p className="text-xs font-semibold text-sky-600 mt-1">
                      Assigned: {st.assigned_class || 'All Classes'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Admin Student History & Parent Feed View Modal */}
      {viewHistoryStudent && (
        <StudentHistoryModal
          student={viewHistoryStudent}
          staff={{
            id: 'admin-1',
            email: 'admin@school.com',
            password: '',
            name: 'Principal Sharma',
            assigned_class: 'All',
            role: 'admin',
          }}
          onClose={() => setViewHistoryStudent(null)}
          onLogUpdated={() => loadAllAdminData()}
        />
      )}

      {/* Admin Activity Form Modal */}
      {logActivityStudent && (
        <ActivityFormModal
          student={logActivityStudent}
          staff={{
            id: 'admin-1',
            email: 'admin@school.com',
            password: '',
            name: 'Principal Sharma',
            assigned_class: 'All',
            role: 'admin',
          }}
          onClose={() => setLogActivityStudent(null)}
          onSaved={() => {
            setLogActivityStudent(null);
            loadAllAdminData();
          }}
        />
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <AddStaffModal 
          onClose={() => setShowAddStaffModal(false)}
          onSaved={() => {
            setShowAddStaffModal(false);
            loadAllAdminData();
          }}
        />
      )}
    </div>
  );
}

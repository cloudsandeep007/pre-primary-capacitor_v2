import { useState, useEffect } from 'react';
import { ShieldCheck, Users, BookOpen, Clock, Search, LogOut, ArrowLeft, UserCheck, Activity, Eye, FileText, LayoutDashboard, DollarSign, Megaphone, Calendar, Settings, Menu, X } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Staff, Student, DailyLog, GatePass, Attendance, SchoolEvent } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { FullScreenSpinner } from '@/components/Spinner';
import { getMockLogs, getMockStaff, getMockStudents, getMockGatePasses } from '@/lib/mockData';
import { logger, generateTraceId } from '@/lib/logger';
import { activityService } from '@/services/activityService';
import { staffService } from '@/services/staffService';
import { gatePassService } from '@/services/gatePassService';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { eventService } from '@/services/eventService';
import { APP_VERSION, ENVIRONMENT, SUPABASE_PROJECT_ID } from '@/lib/env';
import { auditLog } from '@/lib/audit';

import { Mail, Lock, ShieldAlert, KeyRound, UserPlus, MessageSquare, FileText as FileIcon } from 'lucide-react';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';

import { StudentHistoryModal } from '@/pages/staff/StudentHistoryModal';
import { ActivityFormModal } from '@/pages/staff/ActivityFormModal';
import { AddStaffModal } from '@/pages/admin/AddStaffModal';
import { AnalyticsTab } from './AnalyticsTab';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminStudentsList } from './AdminStudentsList';
import { AdminStaffList } from './AdminStaffList';
import { AdminCommunicationView, AdminEventsView } from './AdminPlaceholderViews';
import { AdminClassesView } from './AdminClassesView';
import { AdminFinanceView } from './AdminFinanceView';
import { AdminSettingsView } from './AdminSettingsView';
import { AdminAdmissionsView } from './AdminAdmissionsView';
import { AdminComplaintsView } from './AdminComplaintsView';
import { AdminDocumentsView } from './AdminDocumentsView';
import { usePermissions } from '@/contexts/PermissionContext';

export function AdminDashboard() {
  const { navigate } = useRouter();
  const { can, loading: permsLoading } = usePermissions();

  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'activity' | 'analytics' | 'students' | 'staff' | 'classes' | 'finance' | 'communication' | 'events' | 'settings' | 'admissions' | 'complaints' | 'documents'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [studentList, setStudentList] = useState<Student[]>([]);
  const [activityLogs, setActivityLogs] = useState<DailyLog[]>([]);
  const [gatePasses, setGatePasses] = useState<GatePass[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewHistoryStudent, setViewHistoryStudent] = useState<Student | null>(null);
  const [logActivityStudent, setLogActivityStudent] = useState<Student | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  const handleTabSwitch = (tab: any, requiredPermission: string) => {
    if (!can(requiredPermission)) {
      showToast('error', 'You do not have permission to access this module.');
      return;
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

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
    const traceId = generateTraceId();
    
    logger.info('ADMIN_LOGIN_ATTEMPT', { 
      email: adminEmail, 
      password: adminPassword,
      traceId
    });

    try {
      await supabase.auth.signOut();
      
      const cleanEmail = adminEmail.trim().toLowerCase();
      let matchedAdmin: Staff | null = null;
      let isAuthenticated = false;

      // PHASE 3: Attempt Supabase Auth First
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: adminPassword,
      });

      if (!authError && authData.session) {
        isAuthenticated = true;
      }

      // Legacy fallback logic
      try {
        const { data } = await supabase
          .from('staff')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (data) {
          matchedAdmin = {
            id: data.id,
            email: data.email,
            password: data.password || data.password_hash || '',
            name: data.name,
            assigned_class: data.assigned_class,
            role: data.role || 'admin',
            is_active: data.is_active !== false,
          };
        }
      } catch (e) {
        logger.warn('_ADMINDASHBOARD_SUPABASE_ADMIN_LOGIN_CHECK_FALLBACK');
      }

      if (!matchedAdmin) {
        const mockStaff = getMockStaff();
        matchedAdmin = mockStaff.find(
          (s) => s.email.toLowerCase() === cleanEmail
        ) || null;
      }

      if (!matchedAdmin) {
        showToast('error', 'Invalid admin credentials');
        setAdminLoginLoading(false);
        return;
      }

      if (matchedAdmin.is_active === false) {
        showToast('error', 'Your account has been deactivated. Please contact superadmin.');
        await supabase.auth.signOut();
        setAdminLoginLoading(false);
        return;
      }

      // PHASE 3: Fallback verification
      if (!isAuthenticated) {
        if (matchedAdmin.password === adminPassword.trim() || matchedAdmin.password === btoa(adminPassword.trim())) {
          isAuthenticated = true;
          // Silent shadow migration: sync password to Supabase Auth
          try {
            const { error: seedError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: 'Samsidh@123' });
            if (!seedError) await supabase.auth.updateUser({ password: adminPassword });
          } catch(e) { /* ignore */ }
        } else {
          showToast('error', 'Invalid admin password.');
          setAdminLoginLoading(false);
          return;
        }
      }

      setAdminAuthenticated(true);
      logger.info('LOGIN_SUCCESS', { email: adminEmail, traceId });

      auditLog({
        actor_type: 'admin',
        actor_name: matchedAdmin.name,
        actor_id: matchedAdmin.id,
        action: 'ADMIN_LOGIN',
        resource_type: 'system',
        metadata: {
          email: adminEmail,
          traceId,
        },
      });

      showToast('success', `Admin access granted. Welcome, ${matchedAdmin.name}!`);
    } catch (err: any) {
      logger.error('LOGIN_FAILED', { 
        error: err.message || String(err), 
        email: adminEmail,
        traceId
      });
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
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

    try {
      const sData = await staffService.fetchAllStaff();
      setStaffList(sData);

      const stData = await studentService.fetchAllStudents();
      if (stData && stData.length > 0) {
        setStudentList(stData);
      } else {
        setStudentList(getMockStudents());
      }

      const fetchedLogs = await activityService.fetchAllLogs();
      if (fetchedLogs && fetchedLogs.length > 0) {
        setActivityLogs(fetchedLogs);
      } else {
        setActivityLogs(getMockLogs());
      }

      const fetchedGatePasses = await gatePassService.fetchAllPasses();
      if (fetchedGatePasses && fetchedGatePasses.length > 0) {
        setGatePasses(fetchedGatePasses);
      } else {
        setGatePasses(getMockGatePasses());
      }

      const fetchedAttendance = await attendanceService.fetchAttendanceByClassAndDate('All', today);
      setTodayAttendance(fetchedAttendance);

      const fetchedEvents = await eventService.fetchUpcomingEvents();
      if (fetchedEvents && fetchedEvents.length > 0) {
        setUpcomingEvents(fetchedEvents);
      } else {
        setUpcomingEvents(eventService.getMockEvents());
      }

    } catch (err) {
      logger.warn('_ADMINDASHBOARD_FALLBACK_TO_MOCK_DATA');
      setStaffList(getMockStaff());
      setStudentList(getMockStudents());
      setActivityLogs(getMockLogs());
      setGatePasses(getMockGatePasses());
      setUpcomingEvents(eventService.getMockEvents());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FullScreenSpinner label="Loading Admin Activity Portal..." />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden w-full text-slate-800">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed md:relative z-50 h-screen w-64 bg-slate-950 text-slate-300 flex flex-col flex-shrink-0 border-r border-slate-800 transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex items-center justify-between">
          <div>
            <Logo size="sm" theme="dark" />
            <span className="mt-2 inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
              👑 Admin Portal
            </span>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto mt-4">
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
              onClick={() => handleTabSwitch('students', 'students.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Users size={18} /> Students
            </button>
          <button 
              onClick={() => handleTabSwitch('staff', 'staff.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'staff' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <ShieldCheck size={18} /> Teachers & Staff
            </button>
          <button 
              onClick={() => handleTabSwitch('classes', 'classes.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'classes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <BookOpen size={18} /> Classes & Curriculum
            </button>
            <button 
              onClick={() => handleTabSwitch('admissions', 'admissions.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'admissions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <UserPlus size={18} /> Admissions
            </button>
            <button 
              onClick={() => handleTabSwitch('finance', 'finance.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'finance' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <DollarSign size={18} /> Finance
            </button>
            <button 
              onClick={() => handleTabSwitch('complaints', 'complaints.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'complaints' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <MessageSquare size={18} /> Complaints
            </button>
            <button 
              onClick={() => handleTabSwitch('documents', 'documents.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'documents' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <FileIcon size={18} /> Documents
            </button>
          <button 
              onClick={() => handleTabSwitch('communication', 'announcements.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'communication' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Megaphone size={18} /> Communication
            </button>
          <button 
            onClick={() => { setActiveTab('events'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'events' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
          >
            <Calendar size={18} /> Events & Activities
          </button>
          <button 
              onClick={() => handleTabSwitch('settings', 'system.read')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
            >
              <Settings size={18} /> Settings
            </button>
          
          <div className="pt-4 mt-4 border-t border-slate-800">
             <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Legacy Views</p>
             <button 
              onClick={() => { setActiveTab('activity'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${activeTab === 'activity' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
            >
              <Activity size={16} /> Activity Stream
            </button>
             <button 
              onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${activeTab === 'analytics' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-800 hover:text-white'}`}
            >
              <FileText size={16} /> Analytics
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)} 
               className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
             >
               <Menu size={20} />
             </button>
             <div className="md:hidden font-bold flex items-center gap-2">
                <Logo size="sm" />
             </div>
          </div>
          <div className="hidden md:flex relative w-64">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-indigo-500 outline-none bg-slate-50" />
          </div>
          <div className="flex items-center gap-3">
             <button onClick={async () => { await supabase.auth.signOut(); setAdminAuthenticated(false); navigate('/'); }} className="flex items-center gap-2 text-rose-600 text-xs font-bold hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">
               <LogOut size={14} /> Logout
             </button>
          </div>
        </header>

        {/* Scrollable Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 relative">
           {activeTab === 'dashboard' && <AdminDashboardOverview 
             students={studentList} 
             staff={staffList} 
             activityLogs={activityLogs} 
             gatePasses={gatePasses} 
             attendance={todayAttendance}
             events={upcomingEvents}
           />}
           {activeTab === 'students' && <AdminStudentsList students={studentList} />}
           {activeTab === 'staff' && <AdminStaffList staff={staffList} onAddStaff={() => setShowAddStaffModal(true)} />}
           {activeTab === 'classes' && <AdminClassesView />}
           {activeTab === 'finance' && <AdminFinanceView />}
           {activeTab === 'communication' && <AdminCommunicationView />}
             {activeTab === 'events' && <AdminEventsView />}
             {activeTab === 'settings' && <AdminSettingsView />}
             {activeTab === 'admissions' && <AdminAdmissionsView />}
             {activeTab === 'complaints' && <AdminComplaintsView />}
             {activeTab === 'documents' && <AdminDocumentsView />}
           
           {/* Legacy Tabs for compatibility */}
           {activeTab === 'activity' && (
              <div className="space-y-4 max-w-4xl">
                 <h2 className="text-xl font-bold">Activity Stream</h2>
                 {activityLogs.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      <p className="font-bold text-slate-800">{log.staff_name || 'Staff'}</p>
                      <p className="text-sm text-slate-600">{log.teacher_notes || 'Logged activity.'}</p>
                    </div>
                 ))}
              </div>
           )}
           {activeTab === 'analytics' && <AnalyticsTab />}
        </main>
      </div>

      {/* Modals */}
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

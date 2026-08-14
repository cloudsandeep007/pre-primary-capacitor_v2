import { useState, useEffect, useMemo } from 'react';
import { LogOut, Search, Users, Camera, CheckCircle2, Clock, BookOpen, QrCode, Activity, Megaphone, Scan } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Staff, Student, ClassLevel, GatePass, DailyLog } from '@/lib/types';
import { CLASS_LEVELS } from '@/lib/constants';
import { Logo } from '@/components/Logo';
import { FullScreenSpinner } from '@/components/Spinner';
import { ActivityFormModal } from './ActivityFormModal';
import { StaffQRScannerModal } from './StaffQRScannerModal';
import { getMockStudents, DEMO_STAFF, getMockGatePasses, getMockLogs } from '@/lib/mockData';
import { StudentHistoryModal } from './StudentHistoryModal';
import { AnnouncementsPanel } from './AnnouncementsPanel';
import { HomeworkPanel } from './HomeworkPanel';
import { StaffClassworkPanel } from './StaffClassworkPanel';
import { StaffAttendancePanel } from './StaffAttendancePanel';
import { StaffGradebookModal } from './StaffGradebookModal';
import { StaffPerformanceTab } from './StaffPerformanceTab';
import { StaffReportsTab } from './StaffReportsTab';

export function normalizeClassLevel(cls?: string | null): ClassLevel | 'All' {
  if (!cls) return 'All';
  const clean = cls.trim().toLowerCase();
  if (clean === 'nursery' || clean === 'nurnury' || clean === 'nurcery') return 'Nursery';
  if (clean === 'junior kg' || clean === 'lkg' || clean === 'junior_kg') return 'Junior KG';
  if (clean === 'senior kg' || clean === 'ukg' || clean === 'senior_kg') return 'Senior KG';
  if (clean === 'all') return 'All';
  const match = CLASS_LEVELS.find((c) => c.toLowerCase() === clean);
  return match || 'All';
}

interface StaffDashboardProps {
  staff: Staff;
  onLogout: () => void;
}

export function StaffDashboard({ staff, onLogout }: StaffDashboardProps) {
  const { navigate } = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [todayScans, setTodayScans] = useState<GatePass[]>([]);
  const [todayLogs, setTodayLogs] = useState<DailyLog[]>([]);
  const [viewHistoryStudent, setViewHistoryStudent] = useState<Student | null>(null);
  const [activitySection, setActivitySection] = useState<'gate' | 'classroom'>('gate');
  // Main tab: class (students + gate/classroom) | announcements | homework | classwork | attendance | performance | reports
  const [mainTab, setMainTab] = useState<'class' | 'announcements' | 'homework' | 'classwork' | 'attendance' | 'performance' | 'reports'>('class');
  const [showGradebook, setShowGradebook] = useState(false);

  const assignedClass = useMemo<ClassLevel | 'All'>(() => {
    let raw = staff.assigned_class;
    if (!raw && staff.email) {
      const match = DEMO_STAFF.find((s) => s.email.toLowerCase() === staff.email.toLowerCase());
      if (match?.assigned_class) {
        raw = match.assigned_class;
      }
    }
    return normalizeClassLevel(raw);
  }, [staff.assigned_class, staff.email]);

  const [selectedClass, setSelectedClass] = useState<ClassLevel | 'All'>(
    () => (assignedClass !== 'All' ? assignedClass : 'All')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activityModalStudent, setActivityModalStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (assignedClass !== 'All') {
      setSelectedClass(assignedClass);
    }
  }, [assignedClass]);

  useEffect(() => {
    loadStudents();
    loadTodayGatePasses();
    loadTodayLogs();

    const handleUpdate = () => { loadTodayGatePasses(); loadTodayLogs(); };
    window.addEventListener('gate_pass_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('gate_pass_channel');
      bc.onmessage = () => handleUpdate();
    } catch (e) {
      // BroadcastChannel fallback
    }

    const channel = supabase
      .channel('public:gate_passes_staff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_passes' }, () => handleUpdate())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => handleUpdate())
      .subscribe();

    return () => {
      window.removeEventListener('gate_pass_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTodayGatePasses = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const { data } = await supabase
        .from('gate_passes')
        .select('*')
        .eq('pass_date', today)
        .order('created_at', { ascending: false });

      const raw: GatePass[] = (data && data.length > 0)
        ? data as GatePass[]
        : getMockGatePasses().filter((p) => p.pass_date === today);

      // Deduplicate: keep only the LATEST record per student (by roll_no)
      const seen = new Map<string, GatePass>();
      for (const pass of raw) {
        const key = pass.roll_no || pass.student_id;
        if (!seen.has(key)) seen.set(key, pass);
      }
      setTodayScans(Array.from(seen.values()));
    } catch (err) {
      const mockPasses = getMockGatePasses().filter((p) => p.pass_date === today);
      setTodayScans(mockPasses);
    }
  };

  const loadTodayLogs = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      let logsData: DailyLog[] = [];
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('log_date', today)
        .order('created_at', { ascending: false });
      if (data && data.length > 0) {
        logsData = data as DailyLog[];
      } else {
        const { data: d2 } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('log_date', today)
          .order('created_at', { ascending: false });
        if (d2 && d2.length > 0) logsData = d2 as DailyLog[];
        else logsData = getMockLogs().filter((l) => l.log_date === today);
      }
      setTodayLogs(logsData);
    } catch {
      setTodayLogs(getMockLogs().filter((l) => l.log_date === today));
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*');
      if (error || !data || data.length === 0) {
        setStudents(getMockStudents());
      } else {
        const mapped = data.map((d: any) => ({
          id: d.id || String(d.roll_no || d.roll_number),
          roll_no: String(d.roll_no || d.roll_number || '101'),
          pin: String(d.pin || '1234'),
          name: d.name || 'Student',
          class_name: d.class_name || d.class || 'Nursery',
          guardian_name: d.guardian_name,
          parent_phone: d.parent_phone,
          student_photo_url: d.student_photo_url,
          parent_photo_url: d.parent_photo_url,
        }));
        setStudents(mapped as Student[]);
      }
    } catch (err) {
      console.warn('[StaffDashboard] Using mock students list');
      setStudents(getMockStudents());
    } finally {
      setLoading(false);
    }
  };

  const allowedStudents = useMemo(() => {
    if (assignedClass !== 'All') {
      return students.filter((s) => normalizeClassLevel(s.class_name) === assignedClass);
    }
    return students;
  }, [students, assignedClass]);

  const filteredStudents = useMemo(() => {
    return allowedStudents.filter((s) => {
      const matchesClass = selectedClass === 'All' || normalizeClassLevel(s.class_name) === selectedClass;
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_no.includes(searchQuery);
      return matchesClass && matchesSearch;
    });
  }, [allowedStudents, selectedClass, searchQuery]);

  const visibleClassTabs = useMemo<(ClassLevel | 'All')[]>(() => {
    if (assignedClass !== 'All') {
      return [assignedClass];
    }
    return ['All', ...CLASS_LEVELS];
  }, [assignedClass]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allowedStudents.length };
    CLASS_LEVELS.forEach((c) => {
      counts[c] = allowedStudents.filter((s) => normalizeClassLevel(s.class_name) === c).length;
    });
    return counts;
  }, [allowedStudents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FullScreenSpinner label="Loading your class..." />
      </div>
    );
  }

  const isAdmin = staff.role === 'admin' || staff.email === 'admin@school.com';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors text-xs font-bold border border-amber-200"
              >
                👑 Admin Portal
              </button>
            )}
            <button
              onClick={() => setShowGradebook(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-colors shadow-sm"
            >
              <Activity size={16} /> Gradebook
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors text-sm font-semibold border border-sky-200 shadow-sm"
            >
              <span>📷</span> Gate Scanner
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-700">{staff.name}</p>
              <p className="text-xs text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded-md inline-block">
                {assignedClass !== 'All' ? `${assignedClass} Teacher` : 'All Classes Staff'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-sky-200 bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {staff.photo_url ? (
                <img src={staff.photo_url} alt={staff.name} className="w-full h-full object-cover" />
              ) : (
                staff.name.charAt(0)
              )}
            </div>
            <button
              onClick={() => {
                onLogout();
                navigate('/');
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Title */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Teacher Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage your class, post announcements & assign homework</p>
          </div>
        </div>

        {/* Main Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setMainTab('class')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'class'
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300'
            }`}
          >
            <Users size={14} /> Class & Students
          </button>
          <button
            onClick={() => setMainTab('announcements')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'announcements'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
            }`}
          >
            <Megaphone size={14} /> Announcements
          </button>
          <button
            onClick={() => setMainTab('homework')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'homework'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
            }`}
          >
            <BookOpen size={14} /> Homework
          </button>
          <button
            onClick={() => setMainTab('classwork')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'classwork'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            <BookOpen size={14} /> Classwork
          </button>
          <button
            onClick={() => setMainTab('attendance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'attendance'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300'
            }`}
          >
            <Users size={14} /> Attendance
          </button>
          <button
            onClick={() => setMainTab('performance')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'performance'
                ? 'bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            <Activity size={14} /> Performance
          </button>
          <button
            onClick={() => setMainTab('reports')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              mainTab === 'reports'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300'
            }`}
          >
            <BookOpen size={14} /> Reports
          </button>
        </div>

        {/* Announcements Tab */}
        {mainTab === 'announcements' && (
          <AnnouncementsPanel staff={staff} assignedClass={assignedClass} />
        )}

        {/* Homework Tab */}
        {mainTab === 'homework' && (
          <HomeworkPanel staff={staff} assignedClass={assignedClass} />
        )}

        {/* Classwork Tab */}
        {mainTab === 'classwork' && (
          <StaffClassworkPanel staff={staff} assignedClass={assignedClass} />
        )}

        {/* Attendance Tab */}
        {mainTab === 'attendance' && (
          <StaffAttendancePanel staff={staff} assignedClass={assignedClass} onBack={() => setMainTab('class')} />
        )}

        {/* Performance Tab */}
        {mainTab === 'performance' && (
          <StaffPerformanceTab staff={staff} assignedClass={assignedClass} />
        )}

        {/* Reports Tab */}
        {mainTab === 'reports' && (
          <StaffReportsTab staff={staff} assignedClass={assignedClass} />
        )}

        {/* Class Tab */}
        {mainTab === 'class' && (
          <>
            {/* Activity Section Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActivitySection('gate')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activitySection === 'gate'
                    ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300'
                }`}
              >
                <QrCode size={15} /> Gate Pass Status
              </button>
              <button
                onClick={() => setActivitySection('classroom')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                  activitySection === 'classroom'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
                }`}
              >
                <BookOpen size={15} /> Classroom Activity
              </button>
            </div>

            {/* Gate Pass Status — ALL students roster */}
            {activitySection === 'gate' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Today's Class Attendance & Gate Pass Status
                  </h2>
                  <div className="flex items-center gap-3 text-[10px] font-semibold text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" />In Class</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Pass Active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Handed Over</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredStudents.map((student) => {
                    const pass = todayScans.find(
                      (p) => p.roll_no === student.roll_no || p.student_id === student.id
                    );
                    const hasLog = todayLogs.some(
                      (l) => l.student_id === student.id || l.student_id === student.roll_no
                    );
                    const status = pass?.status === 'COMPLETED' ? 'handedover'
                      : pass ? 'active'
                      : 'inclass';
                    return (
                      <div
                        key={student.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          status === 'handedover' ? 'bg-emerald-50/70 border-emerald-200/80'
                          : status === 'active' ? 'bg-amber-50/70 border-amber-200/80'
                          : 'bg-sky-50/50 border-sky-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white overflow-hidden border border-gray-200 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {student.student_photo_url ? (
                              <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-500">{student.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm leading-tight text-gray-800">{student.name}</p>
                            <p className="text-[11px] text-gray-500">Roll #{student.roll_no} • {student.class_name}</p>
                            {hasLog && <p className="text-[10px] text-violet-600 font-semibold mt-0.5">✏️ Activity logged today</p>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {status === 'handedover' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-emerald-700">
                              <CheckCircle2 size={13} /> Handed Over
                            </span>
                          ) : status === 'active' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-700">
                              <Clock size={13} /> Pass Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] text-sky-700">
                              <Users size={13} /> In Class
                            </span>
                          )}
                          {pass?.pickup_time && (
                            <p className="text-[10px] text-gray-400 font-medium">
                              {new Date(pass.pickup_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <div className="col-span-2 text-center text-xs text-gray-400 py-6 bg-slate-50 rounded-xl">
                      No students in this class yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Classroom Activity Block */}
            {activitySection === 'classroom' && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <Activity size={14} className="text-violet-500" />
                    Today's Classroom Activity Log
                  </h2>
                </div>
                {todayLogs.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-6 text-center text-xs text-gray-400">
                    <BookOpen size={28} className="mx-auto mb-2 text-gray-200" />
                    <p className="font-semibold">No classroom activities logged yet today.</p>
                    <p className="mt-1">Log an activity for any student using the Log button in the Student List below.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayLogs.map((log) => {
                      const student = filteredStudents.find(
                        (s) => s.id === log.student_id || s.roll_no === log.student_id
                      );
                      return (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="w-9 h-9 rounded-xl overflow-hidden border border-violet-200 bg-violet-100 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {student?.student_photo_url ? (
                              <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-violet-600">{(student?.name || 'S').charAt(0)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-800">{student?.name || 'Student'}</p>
                              <p className="text-[10px] text-gray-400">
                                {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 mb-1">by {log.staff_name || 'Teacher'}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {log.meal_status && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">🍱 {log.meal_status}</span>
                              )}
                              {log.nap_time && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">😴 {log.nap_time}</span>
                              )}
                              {log.mood && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">😊 {log.mood}</span>
                              )}
                            </div>
                            {log.teacher_notes && (
                              <p className="text-[10px] text-gray-600 mt-1 italic">"{log.teacher_notes}"</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or roll number..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-sm"
              />
            </div>

            {/* Class filter tabs (Admins) vs Class Banner (Assigned Teachers) */}
            {assignedClass === 'All' ? (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
                {visibleClassTabs.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setSelectedClass(cls)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      selectedClass === cls
                        ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cls}
                    <span className={`ml-2 text-xs ${selectedClass === cls ? 'text-white/80' : 'text-gray-400'}`}>
                      {classCounts[cls] || 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mb-6 flex items-center justify-between bg-sky-50/80 border border-sky-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-sky-800">
                    Assigned Class: <span className="font-bold">{assignedClass}</span>
                  </span>
                  <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full">
                    {allowedStudents.length} {allowedStudents.length === 1 ? 'Student' : 'Students'}
                  </span>
                </div>
                <span className="text-xs text-sky-600 font-medium">Class Teacher View</span>
              </div>
            )}

            {/* Student list */}
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                  <Users size={28} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No students found</p>
                <p className="text-gray-400 text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredStudents.map((student) => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onLogActivity={() => setActivityModalStudent(student)}
                    onViewHistory={() => setViewHistoryStudent(student)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Activity form modal */}
      {activityModalStudent && (
        <ActivityFormModal
          student={activityModalStudent}
          staff={staff}
          onClose={() => setActivityModalStudent(null)}
          onSaved={() => {
            setActivityModalStudent(null);
            loadStudents();
            loadTodayGatePasses();
          }}
        />
      )}

      {/* Student History & Parent Feed View Modal for Teachers */}
      {viewHistoryStudent && (
        <StudentHistoryModal
          student={viewHistoryStudent}
          staff={staff}
          onClose={() => setViewHistoryStudent(null)}
          onLogUpdated={() => {
            loadStudents();
            loadTodayGatePasses();
          }}
        />
      )}

      {/* Gate Pass QR Scanner Modal */}
      {showScanner && (
        <StaffQRScannerModal
          staff={staff}
          onClose={() => setShowScanner(false)}
        />
      )}
      {/* Daily Gradebook Modal */}
      {showGradebook && (
        <StaffGradebookModal
          staff={staff}
          assignedClass={assignedClass}
          onClose={() => setShowGradebook(false)}
        />
      )}
    </div>
  );
}

function StudentCard({
  student,
  onLogActivity,
  onViewHistory,
}: {
  student: Student;
  onLogActivity: () => void;
  onViewHistory: () => void;
}) {
  const classColors: Record<ClassLevel, string> = {
    'Nursery': 'bg-amber-100 text-amber-700',
    'Junior KG': 'bg-sky-100 text-sky-700',
    'Senior KG': 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3.5 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-200">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-sky-200 bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white font-bold text-lg">
        {student.student_photo_url ? (
          <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
        ) : (
          student.name.charAt(0)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">{student.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${classColors[student.class_name]}`}>
            {student.class_name}
          </span>
          <span className="text-xs text-gray-400">Roll #{student.roll_no}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button
          onClick={onLogActivity}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <Camera size={14} /> Log
        </button>
        <button
          onClick={onViewHistory}
          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold border border-sky-200 transition-all"
        >
          <span>👁️</span> Feed
        </button>
      </div>
    </div>
  );
}

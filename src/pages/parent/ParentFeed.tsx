import { useState, useEffect } from 'react';
import { LogOut, ChevronLeft, ChevronRight, CheckCircle2, ShieldCheck, UserCheck, Megaphone, BookOpen, Calendar, StickyNote } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Student, Staff, DailyLog, MediaItem, GatePass } from '@/lib/types';
import { getMealLabel, getMealEmoji, getNapLabel, getNapEmoji, getMoodLabel, getMoodEmoji } from '@/lib/constants';
import { Logo } from '@/components/Logo';
import { FullScreenSpinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { getMockLogs, getMockStudents, getMockGatePasses, getMockStaff } from '@/lib/mockData';
import { ParentGatePassModal } from './ParentGatePassModal';
import { MessagesTab } from './MessagesTab';
import { HomeworkTab } from './HomeworkTab';
import { CalendarTab } from './CalendarTab';
import { ParentClassworkTab } from './ParentClassworkTab';
import { PerformanceTab } from './PerformanceTab';
import { ImageViewerModal } from '@/components/ImageViewerModal';

interface ParentFeedProps {
  student: Student;
  onLogout: () => void;
}

export function ParentFeed({ student, onLogout }: ParentFeedProps) {
  const { navigate } = useRouter();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showGatePass, setShowGatePass] = useState(false);
  const [todayGatePass, setTodayGatePass] = useState<GatePass | null>(null);
  // Main tab: diary | messages | homework | calendar | classwork | performance
  const [parentTab, setParentTab] = useState<'diary' | 'messages' | 'homework' | 'calendar' | 'classwork' | 'performance'>('diary');
  const [viewerImage, setViewerImage] = useState<string | null>(null);

  useEffect(() => {
    loadLogs(selectedDate);
    loadGatePassStatus(selectedDate);

    const handleUpdate = () => {
      loadGatePassStatus(selectedDate);
      loadLogs(selectedDate);
    };
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
      .channel(`public:parent_feed_${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_passes' }, () => {
        handleUpdate();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_logs' }, () => {
        handleUpdate();
      })
      .subscribe();

    return () => {
      window.removeEventListener('gate_pass_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [selectedDate, student.id, student.roll_no]);

  const loadGatePassStatus = async (date: string) => {
    try {
      const { data } = await supabase
        .from('gate_passes')
        .select('*')
        .or(`student_id.eq.${student.id},roll_no.eq.${student.roll_no}`)
        .eq('pass_date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setTodayGatePass(data[0] as GatePass);
      } else {
        const mockPass = getMockGatePasses().find(
          (p) => (p.student_id === student.id || p.roll_no === student.roll_no) && p.pass_date === date
        );
        setTodayGatePass(mockPass || null);
      }
    } catch (err) {
      const mockPass = getMockGatePasses().find(
        (p) => (p.student_id === student.id || p.roll_no === student.roll_no) && p.pass_date === date
      );
      setTodayGatePass(mockPass || null);
    }
  };

  const loadLogs = async (date: string) => {
    setLoading(true);
    try {
      let remoteLogs: DailyLog[] = [];
      try {
        let res = await supabase
          .from('daily_logs')
          .select('*')
          .eq('student_id', student.id)
          .eq('log_date', date)
          .order('created_at', { ascending: true });

        if (res.error || !res.data || res.data.length === 0) {
          res = await supabase
            .from('activity_logs')
            .select('*')
            .eq('student_id', student.id)
            .eq('log_date', date)
            .order('created_at', { ascending: true });
        }

        if (!res.error && res.data) {
          remoteLogs = res.data as DailyLog[];
        }
      } catch (err) {
        console.warn('[ParentFeed] Supabase fetch failed, falling back to local logs');
      }

      const isStudentLogMatch = (l: DailyLog) => {
        if (!l.student_id) return false;
        if (l.student_id === student.id) return true;
        if (l.student_id === student.roll_no) return true;
        const demoMatch = getMockStudents().find((s) => s.id === l.student_id || s.roll_no === l.student_id);
        if (demoMatch && (demoMatch.roll_no === student.roll_no || demoMatch.id === student.id)) return true;
        return false;
      };

      const mockLogs = getMockLogs().filter(
        (l) => isStudentLogMatch(l) && l.log_date === date
      );

      const combinedMap = new Map<string, DailyLog>();
      [...remoteLogs, ...mockLogs].forEach((log) => {
        const existing = combinedMap.get(log.id);
        if (!existing) {
          combinedMap.set(log.id, log);
        } else {
          if ((!existing.media_items || existing.media_items.length === 0) && log.media_items && log.media_items.length > 0) {
            combinedMap.set(log.id, log);
          }
        }
      });

      setLogs(Array.from(combinedMap.values()));
    } catch (err) {
      const mockLogs = getMockLogs().filter(
        (l) => l.student_id === student.id || l.student_id === student.roll_no
      );
      setLogs(mockLogs);
    } finally {
      setLoading(false);
    }
  };

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    const today = new Date().toISOString().split('T')[0];
    if (d.toISOString().split('T')[0] > today) return;
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const dateLabel = isToday
    ? 'Today'
    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/50 via-white to-white overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Logo size="sm" />
            <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200/60 px-2.5 py-1 rounded-full">
              👨‍👩‍👧 Parent Portal
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowGatePass(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:from-teal-600 hover:to-emerald-700 transition-all text-xs font-bold shadow-sm active:scale-95 flex-shrink-0"
            >
              <span>🎫</span> Gate Pass
            </button>
            <button
              onClick={() => {
                onLogout();
                navigate('/');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200/80 transition-all text-xs font-bold shadow-sm active:scale-95 flex-shrink-0"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3.5 sm:px-6 py-4 sm:py-6">
        {/* Student card header */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-500 rounded-3xl p-6 text-white shadow-xl shadow-teal-500/25 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm overflow-hidden border-2 border-white/40 flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {student.student_photo_url ? (
                <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{student.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm bg-white/20 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-medium">
                  {student.class_name}
                </span>
                <span className="text-sm text-teal-50">Roll #{student.roll_no}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowGatePass(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white text-teal-700 hover:bg-teal-50 font-bold text-sm shadow-md transition-all active:scale-95 flex-shrink-0"
          >
            <span>🎫</span> Gate Pass
          </button>
        </div>

        {/* Parent Main Tab Nav */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            onClick={() => setParentTab('diary')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'diary'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            📖 Daily Diary
          </button>
          <button
            onClick={() => setParentTab('messages')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'messages'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
            }`}
          >
            <Megaphone size={12} /> Announcements
          </button>
          <button
            onClick={() => setParentTab('homework')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'homework'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-amber-300'
            }`}
          >
            <BookOpen size={12} /> Homework
          </button>
          <button
            onClick={() => setParentTab('calendar')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'calendar'
                ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-sky-300'
            }`}
          >
            <Calendar size={12} /> Calendar
          </button>
          <button
            onClick={() => setParentTab('classwork')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'classwork'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
            }`}
          >
            <BookOpen size={12} /> Classwork
          </button>
          <button
            onClick={() => setParentTab('performance')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              parentTab === 'performance'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            <CheckCircle2 size={12} /> Performance
          </button>
        </div>

        {/* Messages Tab */}
        {parentTab === 'messages' && <MessagesTab student={student} />}

        {/* Homework Tab */}
        {parentTab === 'homework' && <HomeworkTab student={student} />}

        {/* Calendar Tab */}
        {parentTab === 'calendar' && <CalendarTab student={student} />}

        {/* Classwork Tab */}
        {parentTab === 'classwork' && <ParentClassworkTab student={student} />}

        {/* Performance Tab */}
        {parentTab === 'performance' && <PerformanceTab student={student} />}

        {/* Diary Tab */}
        {parentTab === 'diary' && (
          <>

        <div className="mb-6 space-y-3">
          {todayGatePass && todayGatePass.status === 'COMPLETED' ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl p-4 flex items-start justify-between shadow-sm animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Gate Pickup Scan Verified & Handed Over</h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Picked up at{' '}
                    <span className="font-bold">
                      {new Date(todayGatePass.pickup_time || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>{' '}
                    • Approved by <span className="font-semibold">{todayGatePass.approved_by_staff || 'Staff'}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGatePass(true)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700 transition-all flex-shrink-0"
              >
                View Pass
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-500/30 flex-shrink-0">
                  🎫
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Parent Digital Gate Pass</h3>
                  <p className="text-xs text-gray-500">Show QR Code to school gate staff for pickup</p>
                </div>
              </div>
              <button
                onClick={() => setShowGatePass(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 flex-shrink-0"
              >
                Show Pass
              </button>
            </div>
          )}
        </div>

        {/* Date selector */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-teal-500" />
            <span className="font-semibold text-gray-700 text-sm">{dateLabel}</span>
          </div>
          <button
            onClick={() => shiftDate(1)}
            disabled={isToday}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <FullScreenSpinner label="Loading report..." />
        ) : logs.length === 0 ? (
          <EmptyState dateLabel={dateLabel} />
        ) : (
          <div className="space-y-4">
            {/* Activity badges summary */}
            <div className="grid grid-cols-3 gap-3">
              {logs.slice(-1).map((log) => (
                <SummaryBadges key={log.id} log={log} />
              ))}
            </div>

            {/* Timeline of logs */}
            {logs.map((log, i) => (
              <ActivityCard key={log.id} log={log} index={i} onImageClick={setViewerImage} />
            ))}
          </div>
        )}
          </>
        )}
      </main>

      {/* Digital Gate Pass Modal */}
      {showGatePass && (
        <ParentGatePassModal student={student} onClose={() => setShowGatePass(false)} />
      )}

      {/* Image Viewer Modal */}
      {viewerImage && (
        <ImageViewerModal imageUrl={viewerImage} onClose={() => setViewerImage(null)} />
      )}
    </div>
  );
}

function EmptyState({ dateLabel }: { dateLabel: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-3xl bg-teal-50 flex items-center justify-center mb-4">
        <Calendar size={32} className="text-teal-300" />
      </div>
      <h3 className="font-bold text-gray-700 text-lg mb-1">No report for {dateLabel}</h3>
      <p className="text-gray-400 text-sm max-w-xs">
        Activities haven't been logged yet for this day. Check back later!
      </p>
    </div>
  );
}

function SummaryBadges({ log }: { log: DailyLog }) {
  const badges = [
    { label: log.meal_status ? getMealLabel(log.meal_status) : 'No meal', emoji: log.meal_status ? getMealEmoji(log.meal_status) : '—', color: 'from-amber-400 to-orange-400', has: !!log.meal_status },
    { label: log.nap_time ? getNapLabel(log.nap_time) : 'No nap', emoji: log.nap_time ? getNapEmoji(log.nap_time) : '—', color: 'from-indigo-400 to-violet-400', has: !!log.nap_time },
    { label: log.mood ? getMoodLabel(log.mood) : 'No mood', emoji: log.mood ? getMoodEmoji(log.mood) : '—', color: 'from-sky-400 to-teal-400', has: !!log.mood },
  ];

  return (
    <>
      {badges.map((badge, i) => (
        <div
          key={i}
          className={`rounded-2xl p-4 text-center transition-all ${
            badge.has
              ? `bg-gradient-to-br ${badge.color} text-white shadow-md`
              : 'bg-white border border-gray-100 text-gray-300'
          }`}
        >
          <div className="text-2xl mb-1">{badge.emoji}</div>
          <div className="text-xs font-bold leading-tight">{badge.label}</div>
        </div>
      ))}
    </>
  );
}

function ActivityCard({ log, index, onImageClick }: { log: DailyLog; index: number; onImageClick?: (url: string) => void }) {
  const time = new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const staffMatch = getMockStaff().find((s: Staff) => s.name.toLowerCase() === (log.staff_name || '').toLowerCase());

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-[slideUp_0.3s_ease-out]"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'backwards' }}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-teal-200 bg-gradient-to-br from-teal-400 to-emerald-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {staffMatch?.photo_url ? (
              <img src={staffMatch.photo_url} alt={log.staff_name || 'Teacher'} className="w-full h-full object-cover" />
            ) : (
              log.staff_name?.charAt(0) || 'T'
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">{log.staff_name || 'Teacher'}</p>
            <p className="text-xs text-gray-400">{time}</p>
          </div>
        </div>
      </div>

      {/* Activity badges row */}
      {(log.meal_status || log.nap_time || log.mood) && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {log.meal_status && <Badge emoji={getMealEmoji(log.meal_status)} label={getMealLabel(log.meal_status)} color="bg-amber-50 text-amber-700 border-amber-100" />}
          {log.nap_time && <Badge emoji={getNapEmoji(log.nap_time)} label={getNapLabel(log.nap_time)} color="bg-indigo-50 text-indigo-700 border-indigo-100" />}
          {log.mood && <Badge emoji={getMoodEmoji(log.mood)} label={getMoodLabel(log.mood)} color="bg-sky-50 text-sky-700 border-sky-100" />}
        </div>
      )}

      {/* Photos & Videos Media Gallery */}
      {((log.media_items && log.media_items.length > 0) || log.photo_url) && (
        <div className="px-5 pb-3">
          <MediaGallery items={log.media_items} fallbackPhoto={log.photo_url} onImageClick={onImageClick} />
        </div>
      )}

      {/* Note */}
      {log.teacher_notes && (
        <div className="px-5 pb-4">
          <div className="bg-gray-50 rounded-xl p-3 flex gap-2">
            <StickyNote size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600 leading-relaxed">{log.teacher_notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaGallery({ items, fallbackPhoto, onImageClick }: { items?: MediaItem[] | string | null; fallbackPhoto?: string | null; onImageClick?: (url: string) => void }) {
  let parsedItems: MediaItem[] = [];
  if (items) {
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (e) {
        console.warn('Failed to parse media_items JSON string:', e);
      }
    } else if (Array.isArray(items)) {
      parsedItems = items;
    }
  }

  const mediaList: MediaItem[] = parsedItems.length > 0
    ? parsedItems
    : fallbackPhoto
    ? [{ url: fallbackPhoto, type: 'image' }]
    : [];

  if (mediaList.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-2.5">
      {mediaList.map((item, idx) => (
        <div key={idx} className="rounded-xl overflow-hidden bg-slate-900 border border-gray-100 shadow-sm">
          {item.type === 'video' ? (
            <div className="relative bg-black">
              <video
                src={item.url}
                controls
                preload="metadata"
                className="w-full max-h-80 object-contain rounded-xl"
              />
              {item.name && (
                <div className="px-3 py-1.5 bg-slate-900/90 text-white text-xs font-medium flex items-center gap-1.5 border-t border-slate-800">
                  🎥 <span>{item.name}</span>
                </div>
              )}
            </div>
          ) : (
            <img
              src={item.url}
              alt={item.name || 'Activity photo'}
              className="w-full max-h-80 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => onImageClick?.(item.url)}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Badge({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${color}`}>
      <span className="text-sm">{emoji}</span>
      {label}
    </span>
  );
}

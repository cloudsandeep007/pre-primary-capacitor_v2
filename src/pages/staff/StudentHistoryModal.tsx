import { useState, useEffect } from 'react';
import { X, Calendar, ChevronLeft, ChevronRight, StickyNote, Trash2, Edit3, Save, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Student, Staff, DailyLog, MediaItem } from '@/lib/types';
import { getMealLabel, getMealEmoji, getNapLabel, getNapEmoji, getMoodLabel, getMoodEmoji } from '@/lib/constants';
import { Button } from '@/components/Button';
import { showToast } from '@/components/Toast';
import { getMockLogs, deleteMockLog, updateMockLog } from '@/lib/mockData';

interface StudentHistoryModalProps {
  student: Student;
  staff: Staff;
  onClose: () => void;
  onLogUpdated?: () => void;
}

export function StudentHistoryModal({ student, staff, onClose, onLogUpdated }: StudentHistoryModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    loadStudentLogs(selectedDate);
  }, [selectedDate, student.id]);

  const loadStudentLogs = async (date: string) => {
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
      } catch (e) {
        console.warn('[StudentHistoryModal] Supabase fetch failed');
      }

      const mockLogs = getMockLogs().filter(
        (l) => (l.student_id === student.id || l.student_id === student.roll_no) && l.log_date === date
      );

      const combinedMap = new Map<string, DailyLog>();
      [...remoteLogs, ...mockLogs].forEach((l) => combinedMap.set(l.id, l));
      setLogs(Array.from(combinedMap.values()));
    } catch (err) {
      const mockLogs = getMockLogs().filter(
        (l) => (l.student_id === student.id || l.student_id === student.roll_no) && l.log_date === date
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

  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to undo/delete this activity log entry?')) return;

    deleteMockLog(logId);
    try {
      await supabase.from('daily_logs').delete().eq('id', logId);
      await supabase.from('activity_logs').delete().eq('id', logId);
    } catch (e) {
      console.warn('[StudentHistoryModal] Supabase delete fallback');
    }

    setLogs((prev) => prev.filter((l) => l.id !== logId));
    window.dispatchEvent(new Event('storage'));
    showToast('success', 'Activity response undone / deleted.');
    if (onLogUpdated) onLogUpdated();
  };

  const handleSaveEdit = async (logId: string) => {
    updateMockLog(logId, { teacher_notes: editNotes });
    try {
      await supabase.from('daily_logs').update({ teacher_notes: editNotes }).eq('id', logId);
    } catch (e) {
      console.warn('[StudentHistoryModal] Supabase update fallback');
    }

    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, teacher_notes: editNotes } : l))
    );
    setEditingLogId(null);
    window.dispatchEvent(new Event('storage'));
    showToast('success', 'Activity note updated successfully.');
    if (onLogUpdated) onLogUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 overflow-hidden border border-sky-200 flex items-center justify-center font-bold text-sky-700 flex-shrink-0">
              {student.student_photo_url ? (
                <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <span>{student.name}</span>
                <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                  {student.class_name}
                </span>
              </h2>
              <p className="text-xs text-gray-500">Roll #{student.roll_no} • Teacher History & Parent View Sync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Date Selector */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl border border-slate-200/80 p-2">
            <button onClick={() => shiftDate(-1)} className="p-2 rounded-xl hover:bg-white text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-sky-600" />
              <span className="font-bold text-gray-700 text-sm">{dateLabel}</span>
            </div>
            <button
              onClick={() => shiftDate(1)}
              disabled={isToday}
              className="p-2 rounded-xl hover:bg-white text-gray-600 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Body Logs */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <RefreshCw size={24} className="animate-spin mx-auto text-sky-500 mb-2" />
              <p className="text-xs font-semibold">Loading student log history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm font-semibold">No activity logs recorded for {dateLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Activities logged by teachers will show up here and on the Parent Feed.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm relative">
                {/* Log Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center">
                      {log.staff_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{log.staff_name || 'Teacher'}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Teacher Action Controls: Undo / Edit */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingLogId(log.id);
                        setEditNotes(log.teacher_notes || '');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 border border-sky-200"
                    >
                      <Edit3 size={13} /> Edit Note
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold flex items-center gap-1 border border-rose-200"
                    >
                      <Trash2 size={13} /> Undo Entry
                    </button>
                  </div>
                </div>

                {/* Badges */}
                {(log.meal_status || log.nap_time || log.mood) && (
                  <div className="flex flex-wrap gap-2">
                    {log.meal_status && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <span>{getMealEmoji(log.meal_status)}</span> {getMealLabel(log.meal_status)}
                      </span>
                    )}
                    {log.nap_time && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                        <span>{getNapEmoji(log.nap_time)}</span> {getNapLabel(log.nap_time)}
                      </span>
                    )}
                    {log.mood && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1">
                        <span>{getMoodEmoji(log.mood)}</span> {getMoodLabel(log.mood)}
                      </span>
                    )}
                  </div>
                )}

                {/* Media Gallery */}
                {((log.media_items && log.media_items.length > 0) || log.photo_url) && (
                  <div className="grid grid-cols-2 gap-2">
                    {(log.media_items || [{ url: log.photo_url!, type: 'image' }]).map((media: any, i: number) => (
                      <div key={i} className="rounded-xl overflow-hidden bg-slate-900 border border-gray-200 aspect-video relative">
                        {media.type === 'video' ? (
                          <video src={media.url} controls className="w-full h-full object-cover" />
                        ) : (
                          <img src={media.url} alt="Activity" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Teacher Note & Inline Editing */}
                {editingLogId === log.id ? (
                  <div className="space-y-2 bg-sky-50/70 p-3 rounded-xl border border-sky-200">
                    <label className="block text-xs font-bold text-sky-900">Edit Note:</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      className="w-full p-2 rounded-lg border border-sky-300 text-xs outline-none bg-white font-medium"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingLogId(null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(log.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-1"
                      >
                        <Save size={12} /> Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  log.teacher_notes && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex gap-2">
                      <StickyNote size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-700 leading-relaxed font-medium">{log.teacher_notes}</p>
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 rounded-b-3xl">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close History
          </Button>
        </div>
      </div>
    </div>
  );
}

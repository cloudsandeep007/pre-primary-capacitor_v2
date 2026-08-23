import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Student, HomeworkItem, HomeworkReply } from '@/lib/types';
import { BookOpen, Send, Calendar, ChevronDown, ChevronUp, AlertCircle, MessageCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { homeworkService } from '@/services/homeworkService';

interface HomeworkTabProps {
  student: Student;
}

export function HomeworkTab({ student }: HomeworkTabProps) {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [replies, setReplies] = useState<Record<string, HomeworkReply[]>>({});
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomework();
    fetchCompletions();

    const hwSub = supabase
      .channel('public:homework')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework', filter: `class_name=eq.${student.class_name}` }, fetchHomework)
      .subscribe();

    const repliesSub = supabase
      .channel('public:homework_replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_replies' }, fetchRepliesAll)
      .subscribe();

    const intervalId = setInterval(() => {
      fetchHomework();
      fetchRepliesAll();
      fetchCompletions();
    }, 5000);

    return () => {
      supabase.removeChannel(hwSub);
      supabase.removeChannel(repliesSub);
      clearInterval(intervalId);
    };
  }, [student.class_name]);

  const fetchHomework = async () => {
    const data = await homeworkService.fetchHomework(student.class_name);
    setHomeworkList(data);
    if (data.length > 0) {
      fetchReplies(data.map((h: HomeworkItem) => h.id));
    }
    setLoading(false);
  };

  const fetchReplies = async (homeworkIds: string[]) => {
    const repliesMap = await homeworkService.fetchReplies(homeworkIds);
    setReplies(repliesMap);
  };

  const fetchRepliesAll = async () => {
    if (homeworkList.length > 0) {
      fetchReplies(homeworkList.map(h => h.id));
    }
  };

  const fetchCompletions = async () => {
    const completedSet = await homeworkService.fetchCompletions(student.id);
    setCompletedIds(completedSet);
  };

  const toggleCompletion = async (homeworkId: string) => {
    const isCompleted = completedIds.has(homeworkId);
    
    // Optimistic UI update
    const newSet = new Set(completedIds);
    if (isCompleted) {
      newSet.delete(homeworkId);
    } else {
      newSet.add(homeworkId);
    }
    setCompletedIds(newSet);

    await homeworkService.toggleCompletion(homeworkId, student.id, isCompleted);
  };

  const handleSendReply = async (homeworkId: string) => {
    if (!replyText.trim()) return;

    const { error } = await homeworkService.createReply({
      homework_id: homeworkId,
      sender_type: 'parent',
      sender_name: `${student.guardian_name || 'Parent'} (${student.name})`,
      student_id: student.id,
      body: replyText.trim()
    });

    if (error) {
      logger.error('ERROR_SENDING_HOMEWORK_QUESTION', { error: error instanceof Error ? error.message : String(error) });
    } else {
      setReplyText('');
      fetchRepliesAll();
    }
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      Math: 'bg-blue-100 text-blue-700',
      English: 'bg-rose-100 text-rose-700',
      Science: 'bg-emerald-100 text-emerald-700',
      History: 'bg-amber-100 text-amber-700',
      Art: 'bg-fuchsia-100 text-fuchsia-700',
    };
    return colors[subject] || 'bg-slate-100 text-slate-700';
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500 animate-pulse">Loading homework...</div>;
  }

  if (homeworkList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No homework assigned yet</h3>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-sm">
          Check back later for new assignments for {student.class_name}.
        </p>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {homeworkList.map((hw) => {
        const dueDate = new Date(hw.due_date || '');
        dueDate.setHours(0, 0, 0, 0);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        let statusBadge = null;
        if (daysDiff < 0) {
          statusBadge = <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md"><AlertCircle className="w-3 h-3 mr-1" /> Overdue</span>;
        } else if (daysDiff === 0) {
          statusBadge = <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-md">Due Today</span>;
        } else {
           statusBadge = <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-md">Due in {daysDiff} days</span>;
        }

        const isExpanded = expandedId === hw.id;
        const isCompleted = completedIds.has(hw.id);
        const hwReplies = replies[hw.id] || [];

        return (
          <div key={hw.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-300 ${isCompleted ? 'border-green-200' : 'border-amber-100'}`}>
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : hw.id)}>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : getSubjectColor(hw.subject || '')}`}>
                    {hw.subject}
                  </span>
                  {!isCompleted && statusBadge}
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <span className={`text-xs font-semibold ${isCompleted ? 'text-green-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {isCompleted ? 'Completed' : 'Mark Done'}
                    </span>
                    <input 
                      type="checkbox"
                      checked={isCompleted}
                      onChange={() => toggleCompletion(hw.id)}
                      className="w-5 h-5 rounded border-slate-300 text-green-500 focus:ring-green-500 cursor-pointer transition-colors"
                    />
                  </label>
                </div>
              </div>

              <div className="cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : hw.id)}>
                <h3 className={`text-lg font-semibold mb-2 transition-colors ${isCompleted ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-800'}`}>{hw.title}</h3>
                <p className={`text-sm leading-relaxed line-clamp-2 ${isCompleted ? 'text-slate-400' : 'text-slate-600'}`}>
                  {hw.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className={`flex items-center text-sm font-medium ${isCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Q&A ({hwReplies.length})
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="bg-amber-50/30 p-5 border-t border-amber-100">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Full Description:</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{hw.description}</p>
                </div>
                
                <div className="mb-4 space-y-3 border-t border-amber-100/50 pt-4">
                   <h4 className="text-sm font-medium text-slate-700 mb-2">Questions & Clarifications:</h4>
                   {hwReplies.length > 0 ? (
                      hwReplies.map((reply) => (
                        <div key={reply.id} className={`p-3 rounded-xl max-w-[85%] ${reply.sender_type === 'parent' ? 'bg-amber-100 text-amber-900 ml-auto' : 'bg-white border border-slate-200 text-slate-800'}`}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-semibold opacity-75">{reply.sender_name || 'Teacher'}</span>
                            <span className="text-[10px] opacity-60 ml-2">
                            {new Date(reply.created_at ?? '').toLocaleDateString()} {new Date(reply.created_at ?? '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{reply.body}</p>
                        </div>
                      ))
                   ) : (
                     <div className="text-center text-sm text-slate-400 italic py-2">No questions asked yet.</div>
                   )}
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ask a question about this homework..."
                    className="flex-1 border border-slate-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none bg-white"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(hw.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSendReply(hw.id)}
                    disabled={!replyText.trim()}
                    className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white p-2.5 rounded-xl transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

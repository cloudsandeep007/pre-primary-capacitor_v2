import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { Megaphone, Send, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  staff_name: string;
  created_at: string;
  image_url?: string;
  class_name: string;
}

interface AnnouncementReply {
  id: string;
  announcement_id: string;
  sender_type: string;
  sender_name: string;
  student_id: string;
  body: string;
  created_at: string;
}

interface MessagesTabProps {
  student: Student;
}

export function MessagesTab({ student }: MessagesTabProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [replies, setReplies] = useState<Record<string, AnnouncementReply[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();

    const announcementsSub = supabase
      .channel('public:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `class_name=eq.${student.class_name}` }, fetchAnnouncements)
      .subscribe();

    const repliesSub = supabase
      .channel('public:announcement_replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_replies' }, fetchRepliesAll)
      .subscribe();

    const intervalId = setInterval(() => {
      fetchAnnouncements();
      fetchRepliesAll();
    }, 5000);

    return () => {
      supabase.removeChannel(announcementsSub);
      supabase.removeChannel(repliesSub);
      clearInterval(intervalId);
    };
  }, [student.class_name]);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('class_name', student.class_name)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data || []);
      if (data && data.length > 0) {
        fetchReplies(data.map((a: Announcement) => a.id));
      }
    }
    setLoading(false);
  };

  const fetchReplies = async (announcementIds: string[]) => {
    if (announcementIds.length === 0) return;
    const { data, error } = await supabase
      .from('announcement_replies')
      .select('*')
      .in('announcement_id', announcementIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching replies:', error);
    } else {
      const repliesMap: Record<string, AnnouncementReply[]> = {};
      data?.forEach((reply: AnnouncementReply) => {
        if (!repliesMap[reply.announcement_id]) {
          repliesMap[reply.announcement_id] = [];
        }
        repliesMap[reply.announcement_id].push(reply);
      });
      setReplies(repliesMap);
    }
  };

  const fetchRepliesAll = async () => {
     if (announcements.length > 0) {
         fetchReplies(announcements.map(a => a.id));
     }
  }

  const handleSendReply = async (announcementId: string) => {
    if (!replyText.trim()) return;

    const { error } = await supabase.from('announcement_replies').insert([{
      announcement_id: announcementId,
      sender_type: 'parent',
      sender_name: `${student.guardian_name || 'Parent'} (${student.name})`,
      student_id: student.id,
      body: replyText.trim()
    }]);

    if (error) {
      console.error('Error sending reply:', error);
    } else {
      setReplyText('');
      fetchRepliesAll();
    }
  };

  if (loading) {
    return <div className="p-4 text-center text-slate-500 animate-pulse">Loading messages...</div>;
  }

  if (announcements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mb-4">
          <Megaphone className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-slate-800">No announcements yet</h3>
        <p className="text-slate-500 text-sm mt-1 text-center max-w-sm">
          When teachers post updates or announcements for {student.class_name}, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const isExpanded = expandedId === announcement.id;
        const announcementReplies = replies[announcement.id] || [];

        return (
          <div key={announcement.id} className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
            <div className="p-5 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setExpandedId(isExpanded ? null : announcement.id)}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      Announcement
                    </span>
                    <span className="text-slate-400 text-xs">
                      {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">{announcement.title}</h3>
                  <p className="text-sm text-slate-500 mb-2">By {announcement.staff_name || 'Staff'}</p>
                  <p className="text-slate-700 text-sm leading-relaxed line-clamp-3">
                    {announcement.body}
                  </p>
                </div>
                {announcement.image_url && (
                  <div className="ml-4 flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                    <img src={announcement.image_url} alt="Attachment" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center text-violet-600 text-sm font-medium">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {announcementReplies.length} {announcementReplies.length === 1 ? 'Reply' : 'Replies'}
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="bg-slate-50 p-5 border-t border-violet-100">
                <div className="mb-4 space-y-3">
                   {announcementReplies.length > 0 ? (
                      announcementReplies.map((reply) => (
                        <div key={reply.id} className={`p-3 rounded-xl max-w-[85%] ${reply.sender_type === 'parent' ? 'bg-violet-100 text-violet-900 ml-auto' : 'bg-white border border-slate-200 text-slate-800'}`}>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-xs font-semibold opacity-75">{reply.sender_name || 'Teacher'}</span>
                            <span className="text-[10px] opacity-60 ml-2">
                              {new Date(reply.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm">{reply.body}</p>
                        </div>
                      ))
                   ) : (
                     <div className="text-center text-sm text-slate-400 italic py-2">No replies yet. Start the conversation!</div>
                   )}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 border border-slate-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none bg-white"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply(announcement.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSendReply(announcement.id)}
                    disabled={!replyText.trim()}
                    className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 text-white p-2.5 rounded-xl transition-colors shadow-sm"
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

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { Megaphone, Send, ChevronDown, ChevronUp, Plus, MessageCircle } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface Announcement {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
  class_name: string;
  replies?: Reply[];
}

interface Reply {
  id: string;
  announcement_id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  created_at: string;
}

export function AnnouncementsPanel({ staff, assignedClass }: { staff: Staff; assignedClass: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('announcements_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAnnouncements)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_replies' }, fetchAnnouncements)
      .subscribe();

    const intervalId = setInterval(() => {
      fetchAnnouncements();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [assignedClass]);

  const fetchAnnouncements = async () => {
    try {
      const { data: annData, error: annError } = await supabase
        .from('announcements')
        .select('*')
        .eq('class_name', assignedClass)
        .order('created_at', { ascending: false });

      if (annError) throw annError;

      const { data: repliesData, error: repliesError } = await supabase
        .from('announcement_replies')
        .select('*')
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      const formatted = (annData || []).map(ann => ({
        ...ann,
        replies: (repliesData || []).filter((r: Reply) => r.announcement_id === ann.id)
      }));

      setAnnouncements(formatted);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      showToast('error', 'Please fill in title and body');
      return;
    }

    try {
      const newAnn: Announcement = {
        id: `local-${Date.now()}`,
        title,
        body,
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
        class_name: assignedClass,
        replies: []
      };

      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        await Promise.race([
          supabase.from('announcements').insert({
            title,
            body,
            image_url: imageUrl || null,
            class_name: assignedClass,
            staff_id: staff.id,
            staff_name: staff.name
          }),
          timeout
        ]);
      } catch (e) {
        console.warn('Supabase insert failed/timed out. Using local state.', e);
      }

      setAnnouncements([newAnn, ...announcements]);
      showToast('success', 'Announcement posted successfully');
      setTitle('');
      setBody('');
      setImageUrl('');
      setShowNewForm(false);
    } catch (error) {
      console.error('Error posting announcement:', error);
      showToast('error', 'Failed to post announcement');
    }
  };

  const handleReply = async (announcementId: string) => {
    if (!replyText.trim()) return;

    try {
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        await Promise.race([
          supabase.from('announcement_replies').insert({
            announcement_id: announcementId,
            sender_type: 'teacher',
            sender_name: staff.name,
            body: replyText.trim()
          }),
          timeout
        ]);
      } catch (e) {
        console.warn('Supabase insert failed/timed out. Using local state.', e);
      }

      const newReply: Reply = {
        id: `local-reply-${Date.now()}`,
        announcement_id: announcementId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim(),
        created_at: new Date().toISOString(),
      };
      
      setAnnouncements(prev => prev.map(ann => {
        if (ann.id === announcementId) {
          return { ...ann, replies: [...(ann.replies || []), newReply] };
        }
        return ann;
      }));

      setReplyText('');
      showToast('success', 'Reply sent');
    } catch (error) {
      console.error('Error sending reply:', error);
      showToast('error', 'Failed to send reply');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-violet-800">
          <Megaphone className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Announcements</h2>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-md hover:from-violet-600 hover:to-fuchsia-600 transition-all font-medium"
        >
          <Plus className="w-5 h-5 mr-1" />
          New Announcement
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handlePost} className="bg-white p-6 rounded-2xl shadow-sm border border-violet-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
              placeholder="e.g., Annual Sports Day"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none h-24 resize-none"
              placeholder="Write your announcement here..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (Optional)</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-600 text-white rounded-xl shadow-md hover:bg-violet-700 transition-colors font-medium"
            >
              Post Announcement
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No announcements yet</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-800">{ann.title}</h3>
                  <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-600 whitespace-pre-wrap mb-4">{ann.body}</p>
                {ann.image_url && (
                  <img src={ann.image_url} alt="Announcement" className="rounded-xl max-h-64 object-cover mb-4" />
                )}
                
                <button 
                  onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                  className="flex items-center text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {ann.replies?.length || 0} Replies
                  {expandedId === ann.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
              </div>

              {expandedId === ann.id && (
                <div className="bg-violet-50/50 p-5 border-t border-violet-100 space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {ann.replies?.map((reply) => (
                      <div key={reply.id} className={`p-3 rounded-xl max-w-[85%] ${reply.sender_type === 'teacher' ? 'bg-violet-100 text-violet-900 ml-auto' : 'bg-white border border-slate-200 text-slate-800'}`}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-semibold opacity-75">{reply.sender_name || 'Staff'}</span>
                          <span className="text-[10px] opacity-60 ml-2">
                            {new Date(reply.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.body}</p>
                      </div>
                    ))}
                    {(!ann.replies || ann.replies.length === 0) && (
                      <p className="text-sm text-center text-gray-500 py-2">No replies yet</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="flex-1 px-4 py-2 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none text-sm bg-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(ann.id)}
                    />
                    <button
                      onClick={() => handleReply(ann.id)}
                      className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

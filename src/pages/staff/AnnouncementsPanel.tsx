import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff, Announcement, AnnouncementReply } from '@/lib/types';
import { announcementService } from '@/services/announcementService';
import { Megaphone, Send, ChevronDown, ChevronUp, Plus, MessageCircle, Edit2, Trash2 } from 'lucide-react';
import { showToast } from '@/components/Toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { logger, generateTraceId } from '@/lib/logger';

export function AnnouncementsPanel({ staff, assignedClass }: { staff: Staff; assignedClass: string }) {
  const { can } = usePermissions();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
    const data = await announcementService.fetchAnnouncements(assignedClass);
    if (data.length > 0) {
      const repliesMap = await announcementService.fetchReplies(data.map(a => a.id));
      const merged = data.map(ann => ({
        ...ann,
        replies: repliesMap[ann.id] || []
      }));
      setAnnouncements(merged);
    } else {
      setAnnouncements([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    const success = await announcementService.deleteAnnouncement(id);
    if (success) {
      showToast('success', 'Announcement deleted');
      fetchAnnouncements();
    } else {
      showToast('error', 'Failed to delete announcement');
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingId(ann.id);
    setTitle(ann.title);
    setBody(ann.body || '');
    setImageUrl(ann.image_url || '');
    setShowNewForm(true);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) {
      showToast('error', 'Please fill in title and body');
      return;
    }

    const traceId = generateTraceId();

    try {
      if (editingId) {
        logger.info('ANNOUNCEMENT_UPDATE_STARTED', { traceId });
        const success = await announcementService.updateAnnouncement(editingId, { title, body, image_url: imageUrl || null });
        if (!success) throw new Error('Update failed');
        logger.info('ANNOUNCEMENT_UPDATE_SUCCESS', { traceId });
        showToast('success', 'Announcement updated successfully');
      } else {
        logger.info('ANNOUNCEMENT_CREATE_STARTED', { traceId });
        const newAnn: Announcement = {
          id: `local-${Date.now()}`,
          title,
          body,
          image_url: imageUrl || null,
          created_at: new Date().toISOString(),
          class_name: assignedClass,
          replies: [],
          staff_id: staff.id,
          staff_name: staff.name
        };

        const { error: e } = await announcementService.createAnnouncement({
          id: newAnn.id,
          title,
          body,
          image_url: imageUrl || null,
          class_name: assignedClass,
          staff_id: staff.id,
          staff_name: staff.name
        }, traceId);
        
        if (e) throw e;
        logger.info('ANNOUNCEMENT_CREATE_SUCCESS', { traceId });
        showToast('success', 'Announcement posted successfully');
      }

      fetchAnnouncements();
      setTitle('');
      setBody('');
      setImageUrl('');
      setEditingId(null);
      setShowNewForm(false);
    } catch (error) {
      logger.error('ANNOUNCEMENT_CREATE_FAILED', { error: error instanceof Error ? error.message : String(error), traceId });
      showToast('error', 'Failed to post/update announcement');
    }
  };

  const handleReply = async (announcementId: string) => {
    if (!replyText.trim()) return;

    try {
      const { error: e } = await announcementService.createReply({
        announcement_id: announcementId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim()
      });
      if (e) throw e;

      const newReply: AnnouncementReply = {
        id: `local-reply-${Date.now()}`,
        announcement_id: announcementId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim(),
        created_at: new Date().toISOString(),
        student_id: null,
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
      logger.error('ERROR_SENDING_REPLY', { error: error instanceof Error ? error.message : String(error) });
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
        {can('announcements.write') && (<button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-2xl shadow-md hover:from-violet-600 hover:to-fuchsia-600 transition-all font-medium"
        >
          <Plus className="w-5 h-5 mr-1" />
          New Announcement
        </button>)}
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
                onClick={() => { setShowNewForm(false); setEditingId(null); setTitle(''); setBody(''); setImageUrl(''); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl shadow-md hover:from-violet-600 hover:to-fuchsia-600 transition-all font-medium"
              >
                {editingId ? 'Update' : 'Post'} Announcement
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-violet-200">
              <Megaphone className="w-12 h-12 text-violet-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No announcements yet</p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800">{ann.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                        {new Date(ann.created_at).toLocaleDateString()}
                      </span>
                      {can('announcements.write') && (
                        <button onClick={() => handleEdit(ann)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Edit Announcement">
                          <Edit2 size={16} />
                        </button>
                      )}
                      {can('announcements.delete') && (
                        <button onClick={() => handleDelete(ann.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Announcement">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
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

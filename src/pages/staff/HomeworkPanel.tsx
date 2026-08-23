import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/services/storageService';
import { Staff, HomeworkItem, HomeworkReply } from '@/lib/types';
import { homeworkService } from '@/services/homeworkService';
import { BookOpen, Send, Plus, Calendar, ChevronDown, ChevronUp, MessageCircle, ImagePlus, X, Loader2, Edit2, Trash2 } from 'lucide-react';
import { showToast } from '@/components/Toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { logger, generateTraceId } from '@/lib/logger';

const SUBJECTS = [
  'Language (English)',
  'Mathematics',
  'Environmental Science (EVS)',
  'Hindi/Regional Language',
  'Art & Craft',
  'Rhymes & Stories'
];

export function HomeworkPanel({ staff, assignedClass }: { staff: Staff; assignedClass: string }) {
  const { can } = usePermissions();
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchHomework();

    const channel = supabase
      .channel('homework_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchHomework)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_replies' }, fetchHomework)
      .subscribe();

    const intervalId = setInterval(() => {
      fetchHomework();
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalId);
    };
  }, [assignedClass]);

  const fetchHomework = async () => {
    const data = await homeworkService.fetchHomework(assignedClass);
    if (data.length > 0) {
      const repliesMap = await homeworkService.fetchReplies(data.map((h: HomeworkItem) => h.id));
      const merged = data.map((hw: HomeworkItem) => ({
        ...hw,
        replies: repliesMap[hw.id] || []
      }));
      setHomeworkList(merged);
    } else {
      setHomeworkList([]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework?')) return;
    const success = await homeworkService.deleteHomework(id);
    if (success) {
      showToast('success', 'Homework deleted');
      fetchHomework();
    } else {
      showToast('error', 'Failed to delete homework');
    }
  };

  const handleEdit = (hw: HomeworkItem) => {
    setEditingId(hw.id);
    setTitle(hw.title);
    setSubject(hw.subject || '');
    setDescription(hw.description || '');
    setDueDate(hw.due_date || '');
    setPreviewUrl(hw.attachment_url || null);
    setShowNewForm(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    let attachment_url: string | null = previewUrl; // Use existing previewUrl if set
    const traceId = generateTraceId();
    logger.info('HOMEWORK_ASSIGN_STARTED', { traceId });

    try {
      if (selectedFile) {
        const { url, error: uploadError } = await storageService.uploadFile('media', selectedFile, traceId);
        if (uploadError) throw uploadError;
        attachment_url = url;
      }

      if (editingId) {
        const success = await homeworkService.updateHomework(editingId, {
          title,
          subject,
          description,
          due_date: dueDate,
          attachment_url
        });
        if (!success) throw new Error('Update failed');
        logger.info('HOMEWORK_UPDATE_SUCCESS', { traceId });
        showToast('success', 'Homework updated successfully');
      } else {
        const newHomework: HomeworkItem = {
          id: `local-${Date.now()}`,
          title,
          subject,
          description,
          due_date: dueDate,
          created_at: new Date().toISOString(),
          class_name: assignedClass,
          attachment_url,
          replies: [],
          staff_id: staff.id,
          staff_name: staff.name
        };

        const { error: e } = await homeworkService.createHomework({
          id: newHomework.id,
          title,
          subject,
          description,
          due_date: dueDate,
          class_name: assignedClass,
          staff_id: staff.id,
          staff_name: staff.name,
          attachment_url
        }, traceId);
        if (e) throw e;

        logger.info('HOMEWORK_ASSIGN_SUCCESS', { traceId });
        showToast('success', 'Homework assigned successfully');
      }

      fetchHomework();
      setTitle('');
      setSubject(SUBJECTS[0]);
      setDescription('');
      setDueDate('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setEditingId(null);
      setShowNewForm(false);
    } catch (error) {
      logger.error('HOMEWORK_ASSIGN_FAILED', { error: error instanceof Error ? error.message : String(error), traceId });
      showToast('error', 'Failed to save homework');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (homeworkId: string) => {
    if (!replyText.trim()) return;

    try {
      const { error: e } = await homeworkService.createReply({
        homework_id: homeworkId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim()
      });
      if (e) throw e;

      const newReply: HomeworkReply = {
        id: `local-reply-${Date.now()}`,
        homework_id: homeworkId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim(),
        created_at: new Date().toISOString(),
        student_id: null
      };
      
      setHomeworkList(prev => prev.map(hw => {
        if (hw.id === homeworkId) {
          return { ...hw, replies: [...(hw.replies || []), newReply] };
        }
        return hw;
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
        <div className="flex items-center space-x-3 text-amber-600">
          <BookOpen className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Homework</h2>
        </div>
        {can('homework.write') && (<button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-md hover:from-amber-600 hover:to-orange-600 transition-all font-medium"
        >
          <Plus className="w-5 h-5 mr-1" />
          Assign Homework
        </button>)}
      </div>

      {showNewForm && (
        <form onSubmit={handleAssign} className="bg-white p-6 rounded-2xl shadow-sm border border-amber-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                placeholder="e.g., Chapter 4 Exercises"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
              >
                {SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none h-24 resize-none"
              placeholder="Describe the homework assignment..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="Preview" className="h-32 w-auto rounded-lg object-cover border border-gray-200" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Click to upload an image</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => { setShowNewForm(false); setEditingId(null); setTitle(''); setSubject(SUBJECTS[0]); setDescription(''); setDueDate(''); setPreviewUrl(null); setSelectedFile(null); }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-xl shadow-md hover:bg-amber-700 transition-colors font-medium flex items-center disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Update Homework' : 'Post Homework'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {homeworkList.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No homework assigned yet</p>
          </div>
        ) : (
          homeworkList.map((hw) => (
            <div key={hw.id} className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
              <div className="p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded border border-amber-200">
                        {hw.subject}
                      </span>
                      <h3 className="text-xl font-bold text-gray-800">{hw.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Due: {new Date(hw.due_date || '').toLocaleDateString()}
                    </div>
                    {can('homework.write') && (
                      <button onClick={() => handleEdit(hw)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Edit Homework">
                        <Edit2 size={16} />
                      </button>
                    )}
                    {can('homework.delete') && (
                      <button onClick={() => handleDelete(hw.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete Homework">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 whitespace-pre-wrap mb-4">{hw.description}</p>
                
                {hw.attachment_url && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-gray-100 inline-block">
                    <img src={hw.attachment_url} alt="Homework attachment" className="w-full max-w-sm h-auto object-cover hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                
                <button 
                  onClick={() => setExpandedId(expandedId === hw.id ? null : hw.id)}
                  className="flex items-center text-amber-600 hover:text-amber-800 font-medium text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  {hw.replies?.length || 0} Questions
                  {expandedId === hw.id ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
              </div>

              {expandedId === hw.id && (
                <div className="bg-amber-50/50 p-5 border-t border-amber-100 space-y-4">
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {hw.replies?.map((reply) => (
                      <div key={reply.id} className={`p-3 rounded-xl max-w-[85%] ${reply.sender_type === 'teacher' ? 'bg-amber-100 text-amber-900 ml-auto' : 'bg-white border border-slate-200 text-slate-800'}`}>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-xs font-semibold opacity-75">{reply.sender_name || 'Staff'}</span>
                          <span className="text-[10px] opacity-60 ml-2">
                            {new Date(reply.created_at ?? '').toLocaleDateString()} {new Date(reply.created_at ?? '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm">{reply.body}</p>
                      </div>
                    ))}
                    {(!hw.replies || hw.replies.length === 0) && (
                      <p className="text-sm text-center text-gray-500 py-2">No questions yet</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Answer parent questions..."
                      className="flex-1 px-4 py-2 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(hw.id)}
                    />
                    <button
                      onClick={() => handleReply(hw.id)}
                      className="p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
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

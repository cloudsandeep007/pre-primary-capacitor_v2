import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { BookOpen, Send, Plus, Calendar, ChevronDown, ChevronUp, MessageCircle, ImagePlus, X, Loader2 } from 'lucide-react';
import { showToast } from '@/components/Toast';

interface Homework {
  id: string;
  title: string;
  subject: string;
  description: string;
  due_date: string;
  created_at: string;
  class_name: string;
  attachment_url?: string;
  replies?: HomeworkReply[];
}

interface HomeworkReply {
  id: string;
  homework_id: string;
  sender_type: string;
  sender_name: string;
  body: string;
  created_at: string;
}

const SUBJECTS = ['Math', 'English', 'Hindi', 'EVS', 'Art', 'General'];

export function HomeworkPanel({ staff, assignedClass }: { staff: Staff; assignedClass: string }) {
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    try {
      const { data: hwData, error: hwError } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', assignedClass)
        .order('created_at', { ascending: false });

      if (hwError) throw hwError;

      const { data: repliesData, error: repliesError } = await supabase
        .from('homework_replies')
        .select('*')
        .order('created_at', { ascending: true });

      if (repliesError) throw repliesError;

      const formatted = (hwData || []).map(hw => ({
        ...hw,
        replies: (repliesData || []).filter((r: HomeworkReply) => r.homework_id === hw.id)
      }));

      setHomeworkList(formatted);
    } catch (error) {
      console.error('Error fetching homework:', error);
      setHomeworkList([]);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !dueDate) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    let attachment_url = undefined;

    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, selectedFile);
          
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        attachment_url = data.publicUrl;
      }

      const newHomework: Homework = {
        id: `local-${Date.now()}`,
        title,
        subject,
        description,
        due_date: dueDate,
        created_at: new Date().toISOString(),
        class_name: assignedClass,
        attachment_url,
        replies: []
      };

      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        await Promise.race([
          supabase.from('homework').insert({
            title,
            subject,
            description,
            due_date: dueDate,
            class_name: assignedClass,
            staff_id: staff.id,
            staff_name: staff.name,
            attachment_url
          }),
          timeout
        ]);
      } catch (e) {
        console.warn('Supabase insert failed/timed out. Using local state.', e);
      }

      setHomeworkList([newHomework, ...homeworkList]);
      showToast('success', 'Homework assigned successfully');
      setTitle('');
      setSubject(SUBJECTS[0]);
      setDescription('');
      setDueDate('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowNewForm(false);
    } catch (error) {
      console.error('Error assigning homework:', error);
      showToast('error', 'Failed to assign homework');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (homeworkId: string) => {
    if (!replyText.trim()) return;

    try {
      try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
        await Promise.race([
          supabase.from('homework_replies').insert({
            homework_id: homeworkId,
            sender_type: 'teacher',
            sender_name: staff.name,
            body: replyText.trim()
          }),
          timeout
        ]);
      } catch (e) {
        console.warn('Supabase insert failed/timed out. Using local state.', e);
      }

      const newReply: HomeworkReply = {
        id: `local-reply-${Date.now()}`,
        homework_id: homeworkId,
        sender_type: 'teacher',
        sender_name: staff.name,
        body: replyText.trim(),
        created_at: new Date().toISOString(),
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
      console.error('Error sending reply:', error);
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
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-md hover:from-amber-600 hover:to-orange-600 transition-all font-medium"
        >
          <Plus className="w-5 h-5 mr-1" />
          Assign Homework
        </button>
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
              onClick={() => setShowNewForm(false)}
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
              Post Homework
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
                  <div className="flex items-center text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    Due: {new Date(hw.due_date).toLocaleDateString()}
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
                            {new Date(reply.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
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

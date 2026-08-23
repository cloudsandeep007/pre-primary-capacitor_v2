import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, ClipboardList, CheckCircle2, Loader2, ImagePlus, X, Edit2, Trash2 } from 'lucide-react';
import { classworkService } from '@/services/classworkService';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/services/storageService';
import { logger, generateTraceId } from '@/lib/logger';
import { usePermissions } from '@/contexts/PermissionContext';

import { Staff, Classwork } from '../../lib/types';

interface StaffClassworkPanelProps {
  staff: Staff;
  assignedClass: string;
}

export function StaffClassworkPanel({ staff, assignedClass }: StaffClassworkPanelProps) {
  const { can } = usePermissions();
  const [classwork, setClasswork] = useState<Classwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: 'English',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const subjects = ['English', 'Math', 'Science', 'Art', 'Music', 'Phonics', 'General Awareness'];

  const fetchClasswork = async () => {
    try {
      const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const data = await classworkService.fetchClasswork(assignedClass, today);
      setClasswork(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasswork();

    const subscription = supabase
      .channel('classwork_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classwork', filter: `class_name=eq.${assignedClass}` }, () => {
        fetchClasswork();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [assignedClass]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this classwork?')) return;
    const success = await classworkService.deleteClasswork(id);
    if (success) {
      setClasswork(classwork.filter(c => c.id !== id));
    } else {
      alert('Failed to delete classwork');
    }
  };

  const handleEdit = (cw: Classwork) => {
    setEditingId(cw.id);
    setFormData({
      title: cw.title,
      subject: cw.subject,
      description: cw.description || ''
    });
    setPreviewUrl(cw.image_url || null);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    setIsSubmitting(true);
    let image_url = previewUrl; // Keep existing image if not replacing
    const traceId = generateTraceId();
    logger.info('CLASSWORK_ASSIGN_STARTED', { traceId });
    
    try {
      if (selectedFile) {
        const { url, error: uploadError } = await storageService.uploadFile('media', selectedFile, traceId);
        if (uploadError) throw uploadError;
        image_url = url;
      }

      if (editingId) {
        const success = await classworkService.updateClasswork(editingId, {
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          image_url
        });
        if (!success) throw new Error('Update failed');
        logger.info('CLASSWORK_UPDATE_SUCCESS', { traceId });
      } else {
        const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const { error } = await classworkService.createClasswork({
          title: formData.title,
          description: formData.description,
          subject: formData.subject,
          class_name: assignedClass,
          date: today,
          image_url
        }, traceId);

        if (error) throw error;
        logger.info('CLASSWORK_ASSIGN_SUCCESS', { traceId });
      }
      
      const updatedClasswork = await classworkService.fetchClasswork(assignedClass);
      setClasswork(updatedClasswork);
      
      setFormData({ title: '', subject: 'English', description: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      setEditingId(null);
      setShowAddForm(false);
    } catch (error) {
      logger.error('CLASSWORK_ASSIGN_FAILED', { error: error instanceof Error ? error.message : String(error), traceId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <BookOpen className="text-teal-500 h-7 w-7" />
          Today's Classwork
        </h2>
        {can('classwork.write') && (<button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-xl hover:shadow-md transition-all font-medium"
        >
          {showAddForm ? <ClipboardList size={18} /> : <Plus size={18} />}
          {showAddForm ? 'View List' : 'Add Classwork'}
        </button>)}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 bg-gray-50 p-2.5 border"
              >
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 bg-gray-50 p-2.5 border"
                placeholder="e.g., Learning the Letter A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 bg-gray-50 p-2.5 border"
                placeholder="Describe what was covered in class..."
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setEditingId(null); setFormData({ title: '', subject: 'English', description: '' }); setSelectedFile(null); setPreviewUrl(null); }}
                className="w-1/3 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-2/3 flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-xl hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                {editingId ? 'Update Classwork' : 'Save Classwork'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-teal-500 h-8 w-8" />
        </div>
      ) : classwork.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No classwork recorded for today yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {classwork.map((work) => (
            <div key={work.id} className="bg-white p-5 rounded-2xl shadow-sm border border-teal-50 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-400 to-emerald-400"></div>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg mb-2">
                    {work.subject}
                  </span>
                  <h3 className="font-bold text-gray-800 text-lg">{work.title}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {can('classwork.write') && (
                    <button onClick={() => handleEdit(work)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                      <Edit2 size={16} />
                    </button>
                  )}
                  {can('classwork.delete') && (
                    <button onClick={() => handleDelete(work.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-2 whitespace-pre-wrap">{work.description}</p>
              {work.image_url && (
                <div className="mt-4 rounded-xl overflow-hidden border border-gray-100">
                  <img src={work.image_url} alt="Classwork attachment" className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

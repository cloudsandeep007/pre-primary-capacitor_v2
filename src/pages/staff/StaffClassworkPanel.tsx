import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, ClipboardList, CheckCircle2, Loader2, ImagePlus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Staff {
  id: string;
  name: string;
  role: string;
}

interface Classwork {
  id: string;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  date: string;
  image_url?: string;
}

interface StaffClassworkPanelProps {
  staff: Staff;
  assignedClass: string;
}

export function StaffClassworkPanel({ staff, assignedClass }: StaffClassworkPanelProps) {
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

  const subjects = ['English', 'Math', 'Science', 'Art', 'Music', 'Phonics', 'General Awareness'];

  const fetchClasswork = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('classwork')
        .select('*')
        .eq('class_name', assignedClass)
        .eq('date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasswork(data || []);
    } catch (error) {
      console.error('Error fetching classwork:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasswork();

    const subscription = supabase
      .channel('classwork_changes')
      .on('postgres', { event: '*', schema: 'public', table: 'classwork', filter: `class_name=eq.${assignedClass}` }, () => {
        fetchClasswork();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [assignedClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    setIsSubmitting(true);
    let image_url = null;
    
    try {
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, selectedFile);
          
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('media').getPublicUrl(fileName);
        image_url = data.publicUrl;
      }

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('classwork').insert([{
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        class_name: assignedClass,
        date: today,
        image_url
      }]);

      if (error) throw error;
      
      setFormData({ title: '', subject: 'English', description: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding classwork:', error);
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
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-4 py-2 rounded-xl hover:shadow-md transition-all font-medium"
        >
          {showAddForm ? <ClipboardList size={18} /> : <Plus size={18} />}
          {showAddForm ? 'View List' : 'Add Classwork'}
        </button>
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-2.5 rounded-xl hover:bg-teal-700 transition-colors font-medium disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Save Classwork
            </button>
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

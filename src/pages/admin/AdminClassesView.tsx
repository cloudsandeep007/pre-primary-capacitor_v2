import React, { useState, useEffect } from 'react';
import { BookOpen, Users, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { academicService, SchoolClass } from '@/services/academicService';

export function AdminClassesView() {
  const { can } = usePermissions();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    const data = await academicService.fetchAllClasses();
    setClasses(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this class? This may affect assigned students.')) return;
    
    const success = await academicService.deleteClass(id);
    if (success) {
      setClasses(classes.filter(c => c.id !== id));
      showToast('success', 'Class deleted successfully');
    } else {
      showToast('error', 'Failed to delete class');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading academic structures...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Classes & Curriculum</h1>
          <p className="text-sm text-slate-500 mt-1">Manage academic structures and capacity</p>
        </div>
        {can('academics.write') && (
          <button onClick={() => showToast('info', 'Add Class form coming soon')} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
            + Add Class
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {can('academics.write') && (
                <button onClick={() => showToast('info', 'Edit coming soon')} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors">
                  <Edit2 size={16} />
                </button>
              )}
              {can('academics.delete') && (
                <button onClick={() => handleDelete(cls.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 mb-4">
              <BookOpen size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">{cls.name}</h3>
            <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200 mb-4">
              Section {cls.section}
            </span>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Users size={16} />
                <span>Capacity: {cls.capacity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

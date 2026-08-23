import React, { useState } from 'react';
import { Student } from '@/lib/types';
import { X, Search, ShieldAlert, FileText, CheckCircle2, Download, Trash2, Edit2, User, DollarSign } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { studentService } from '@/services/studentService';
import { AdminStudentFeesTab } from './finance/AdminStudentFeesTab';

interface StudentDetailsDrawerProps {
  student: Student;
  onClose: () => void;
  onDelete: (id: string) => void;
}

function StudentDetailsDrawer({ student, onClose, onDelete }: StudentDetailsDrawerProps) {
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<'profile' | 'fees'>('profile');

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div 
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto flex flex-col animate-slide-in-right" 
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Student Profile</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex px-6 gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              } flex items-center gap-2`}
            >
              <User size={16} /> Overview
            </button>
            <button
              onClick={() => setActiveTab('fees')}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === 'fees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              } flex items-center gap-2`}
            >
              <DollarSign size={16} /> Fees & Ledger
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden flex-shrink-0 text-3xl font-bold text-indigo-300">
              {student.student_photo_url ? (
                <img src={student.student_photo_url} alt={student.name} className="w-full h-full object-cover" />
              ) : student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{student.name}</h1>
              <p className="text-sm text-indigo-600 font-semibold">{student.class_name}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                Roll #{student.roll_no}
              </span>
            </div>
          </div>

          {activeTab === 'profile' ? (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Guardian Information</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {student.parent_photo_url ? (
                      <img src={student.parent_photo_url} alt="Parent" className="w-full h-full object-cover" />
                    ) : <span className="text-xl">👨‍👩‍👧</span>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{student.guardian_name || 'Not provided'}</p>
                    <p className="text-xs text-slate-500">Authorized Guardian</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 font-medium">Status</span>
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14}/> Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 font-medium">Added On</span>
                    <span className="text-sm font-semibold text-slate-800">{new Date(student.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500 font-medium">PIN Set</span>
                    <span className="text-sm font-semibold text-slate-800">{student.pin ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <AdminStudentFeesTab student={student} />
          )}

        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50 mt-auto flex gap-3">
          {can('students.write') && (
            <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 font-bold shadow-sm transition-colors" onClick={() => showToast('info', 'Edit coming soon')}>
              <Edit2 size={18} /> Edit Profile
            </button>
          )}
          {can('students.delete') && (
            <button className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 py-2.5 rounded-xl font-bold transition-colors" onClick={() => onDelete(student.id)}>
              <Trash2 size={18} /> Delete Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AdminStudentsListProps {
  students: Student[];
}

export function AdminStudentsList({ students: initialStudents }: AdminStudentsListProps) {
  const { can } = usePermissions();
  const [students, setStudents] = useState(initialStudents);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this student record? This action cannot be undone.')) return;
    const success = await studentService.deleteStudent(id);
    if (success) {
      setStudents(students.filter(s => s.id !== id));
      setSelectedStudent(null);
      showToast('success', 'Student record deleted successfully.');
    } else {
      showToast('error', 'Failed to delete student record.');
    }
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.roll_no.includes(search)
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and view all {students.length} enrolled students</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
            + Add New Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by name or roll number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                <th className="p-4">Student</th>
                <th className="p-4">Class</th>
                <th className="p-4">Guardian</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(stud => (
                <tr key={stud.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedStudent(stud)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm overflow-hidden">
                        {stud.student_photo_url ? <img src={stud.student_photo_url} className="w-full h-full object-cover" /> : stud.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{stud.name}</p>
                        <p className="text-xs text-slate-500">Roll #{stud.roll_no}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                      {stud.class_name}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-semibold text-slate-700">
                    {stud.guardian_name || <span className="text-slate-400 font-normal">Not set</span>}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedStudent(stud); }}
                      className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailsDrawer student={selectedStudent} onClose={() => setSelectedStudent(null)} onDelete={handleDelete} />
      )}
    </div>
  );
}

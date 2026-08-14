import React, { useState, useEffect } from 'react';
import { X, Star, Save, AlertCircle, CheckCircle2, UserCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Staff, Student } from '../../lib/types';

interface StaffGradebookModalProps {
  staff: Staff;
  assignedClass: string;
  onClose: () => void;
}

interface DailyGrade {
  id?: string;
  student_id: string;
  class_name: string;
  date: string;
  cw_stars: number;
  hw_stars: number;
  activity_stars: number;
  teacher_notes: string;
}

export function StaffGradebookModal({ staff, assignedClass, onClose }: StaffGradebookModalProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Record<string, DailyGrade>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [assignedClass, selectedDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_name', assignedClass)
        .order('name');
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch grades for the selected date
      const { data: gradesData, error: gradesError } = await supabase
        .from('daily_grades')
        .select('*')
        .eq('class_name', assignedClass)
        .eq('date', selectedDate);
      
      if (gradesError) throw gradesError;

      const gradesMap: Record<string, DailyGrade> = {};
      if (gradesData) {
        gradesData.forEach(grade => {
          gradesMap[grade.student_id] = grade;
        });
      }
      setGrades(gradesMap);

      if (studentsData && studentsData.length > 0) {
        setSelectedStudent(studentsData[0]);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (field: keyof DailyGrade, value: string | number) => {
    if (!selectedStudent) return;

    setGrades(prev => {
      const current = prev[selectedStudent.id] || {
        student_id: selectedStudent.id,
        class_name: assignedClass,
        date: selectedDate,
        cw_stars: 0,
        hw_stars: 0,
        activity_stars: 0,
        teacher_notes: ''
      };

      return {
        ...prev,
        [selectedStudent.id]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      
      const grade = grades[selectedStudent.id];
      
      const payload = {
        student_id: selectedStudent.id,
        class_name: assignedClass,
        date: selectedDate,
        cw_stars: grade?.cw_stars || 0,
        hw_stars: grade?.hw_stars || 0,
        activity_stars: grade?.activity_stars || 0,
        teacher_notes: grade?.teacher_notes || ''
      };

      if (grade?.id) {
        const { error: updateError } = await supabase
          .from('daily_grades')
          .update(payload)
          .eq('id', grade.id);
        if (updateError) throw updateError;
      } else {
        const { data: insertData, error: insertError } = await supabase
          .from('daily_grades')
          .insert([payload])
          .select();
        if (insertError) throw insertError;
        
        if (insertData && insertData[0]) {
          setGrades(prev => ({
            ...prev,
            [selectedStudent.id]: {
              ...prev[selectedStudent.id],
              id: insertData[0].id
            }
          }));
        }
      }
      
      setSuccessMsg('Grades saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const renderStars = (field: 'cw_stars' | 'hw_stars' | 'activity_stars', label: string) => {
    const currentVal = selectedStudent ? grades[selectedStudent.id]?.[field] || 0 : 0;
    
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">{label}</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => handleGradeChange(field, star)}
              className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
            >
              <Star 
                className={`w-9 h-9 transition-colors ${
                  star <= currentVal 
                    ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                    : 'text-slate-300'
                }`} 
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm">
      <div className="bg-slate-50 w-full max-w-5xl h-[90vh] sm:h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-teal-400 p-6 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white">Daily Gradebook</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
              <p className="text-sky-50 font-medium">{assignedClass}</p>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2 py-1 rounded-md text-sm text-slate-800 border-0 focus:ring-2 focus:ring-sky-300"
              />
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Student List */}
          <div className="w-1/3 max-w-xs border-r border-slate-200 bg-white overflow-y-auto hidden sm:block">
            {loading ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-4"></div>
                Loading students...
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {students.map(student => (
                  <li key={student.id}>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-4 hover:bg-sky-50/50 transition-colors flex items-center gap-3 ${
                        selectedStudent?.id === student.id ? 'bg-sky-50 border-l-4 border-sky-500' : 'border-l-4 border-transparent'
                      }`}
                    >
                      {student.student_photo_url ? (
                        <img src={student.student_photo_url} alt={student.name} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                      ) : (
                        <UserCircle2 className="w-10 h-10 text-slate-400" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-800">{student.name}</p>
                        <p className="text-xs text-slate-500">Roll No: {student.roll_no}</p>
                      </div>
                    </button>
                  </li>
                ))}
                {students.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    No students found in {assignedClass}.
                  </div>
                )}
              </ul>
            )}
          </div>
          
          {/* Main Area - Grading Form */}
          <div className="flex-1 bg-slate-50 p-6 sm:p-8 overflow-y-auto">
            {/* Mobile Student Selector */}
            <div className="sm:hidden mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Student</label>
              <select 
                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 bg-white"
                value={selectedStudent?.id || ''}
                onChange={(e) => {
                  const st = students.find(s => s.id === e.target.value);
                  if (st) setSelectedStudent(st);
                }}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.roll_no})</option>
                ))}
              </select>
            </div>

            {!selectedStudent && !loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-lg">
                Select a student to start grading
              </div>
            ) : selectedStudent ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                  {selectedStudent.student_photo_url ? (
                    <img src={selectedStudent.student_photo_url} alt={selectedStudent.name} className="w-16 h-16 rounded-full object-cover shadow-md" />
                  ) : (
                    <UserCircle2 className="w-16 h-16 text-slate-300" />
                  )}
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800">{selectedStudent.name}</h3>
                    <p className="text-slate-500 font-medium">Roll No: {selectedStudent.roll_no}</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-3 border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}
                
                {successMsg && (
                  <div className="mb-6 p-4 bg-teal-50 text-teal-700 rounded-xl flex items-start gap-3 border border-teal-100">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-teal-600" />
                    <p className="text-sm font-medium">{successMsg}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                  {renderStars('cw_stars', 'Classwork')}
                  {renderStars('hw_stars', 'Homework')}
                  {renderStars('activity_stars', 'Activities')}
                </div>

                <div className="mb-8">
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Teacher's Notes (Optional)</label>
                  <textarea
                    value={grades[selectedStudent.id]?.teacher_notes || ''}
                    onChange={(e) => handleGradeChange('teacher_notes', e.target.value)}
                    placeholder="Add observations, behavior notes, or specific achievements..."
                    className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none h-32 text-slate-700 bg-slate-50"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-teal-400 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-sky-600 hover:to-teal-500 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Grades'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { UserCheck, Check, X, Clock, Loader2, Users, Save, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { Student, Attendance, Staff } from '../../lib/types';
import { logger, generateTraceId } from '@/lib/logger';

interface StaffAttendancePanelProps {
  staff: Staff;
  assignedClass: string;
  onBack?: () => void;
}

export function StaffAttendancePanel({ staff, assignedClass, onBack }: StaffAttendancePanelProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Attendance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(() => new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch students in this class via service
      const studentsData = await studentService.fetchAllStudents(assignedClass);

      setStudents(studentsData.sort((a, b) => a.name.localeCompare(b.name)));

      // Fetch attendance via service
      const attendanceData = await attendanceService.fetchAttendanceByClassAndDate(assignedClass, selectedDate);

      const recordsMap: Record<string, Attendance> = {};
      attendanceData.forEach(record => {
        recordsMap[record.student_id] = record;
      });
      setAttendanceRecords(recordsMap);
    } catch (error) {
      logger.error('ERROR_FETCHING_ATTENDANCE_DATA', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const subscription = supabase
      .channel('attendance_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance', filter: `class_name=eq.${assignedClass}` }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [assignedClass, selectedDate]);

  const markAttendance = (studentId: string, status: 'present' | 'absent' | 'late') => {
    const existingRecord = attendanceRecords[studentId];
    
    // Update local state optimistically
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        id: existingRecord?.id || 'temp-id',
        student_id: studentId,
        class_name: assignedClass,
        date: selectedDate,
        status
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    const traceId = generateTraceId();
    logger.info('ATTENDANCE_SAVE_STARTED', { count: Object.keys(attendanceRecords).length, traceId });

    try {
      for (const r of Object.values(attendanceRecords)) {
        const { data } = await attendanceService.saveAttendanceRecord(r, traceId);
        if (r.id === 'temp-id' && data && data[0]) {
          r.id = data[0].id;
        }
      }
      logger.info('ATTENDANCE_SAVE_SUCCESS', { traceId });
      setSuccessMsg('Saved successfully');
      setTimeout(() => {
        setSuccessMsg(null);
        onBack?.();
      }, 1500);
    } catch (error) {
      logger.error('ATTENDANCE_SAVE_FAILED', { error: error instanceof Error ? error.message : String(error), traceId });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: 'present' | 'absent' | 'late') => {
    switch (status) {
      case 'present': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'late': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-500 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-teal-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <UserCheck className="text-teal-500 h-7 w-7" />
            Daily Attendance
          </h2>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <Users size={16} /> {students.length} Students
          </p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl shadow-sm focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-teal-50 text-teal-700 rounded-xl flex items-start gap-3 border border-teal-100">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-teal-600" />
          <p className="font-medium">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-teal-500 h-8 w-8" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {students.map((student) => {
              const currentStatus = attendanceRecords[student.id]?.status;
              return (
                <li key={student.id} className="p-4 sm:p-5 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-teal-700 font-bold">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{student.name}</h3>
                      {currentStatus && (
                        <span className={`inline-block px-2 py-0.5 mt-1 text-[10px] font-bold uppercase rounded-full border ${getStatusColor(currentStatus)}`}>
                          {currentStatus}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => markAttendance(student.id, 'present')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        currentStatus === 'present' 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200' 
                          : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      <Check size={16} /> Present
                    </button>
                    <button
                      onClick={() => markAttendance(student.id, 'absent')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        currentStatus === 'absent' 
                          ? 'bg-red-500 text-white shadow-md shadow-red-200' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100'
                      }`}
                    >
                      <X size={16} /> Absent
                    </button>
                    <button
                      onClick={() => markAttendance(student.id, 'late')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        currentStatus === 'late' 
                          ? 'bg-orange-500 text-white shadow-md shadow-orange-200' 
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      }`}
                    >
                      <Clock size={16} /> Late
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {students.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No students found in this class.
            </div>
          )}
        </div>
      )}

      {students.length > 0 && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg w-full sm:w-auto justify-center"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      )}
    </div>
  );
}

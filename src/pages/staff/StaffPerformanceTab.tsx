import React, { useState, useEffect } from 'react';
import { Staff, Student, Attendance, DailyGrade, ClassLevel } from '../../lib/types';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { gradeService } from '@/services/gradeService';
import { DateFilterType, DATE_FILTERS, getDateFromFilter } from '../../lib/dateUtils';
import { Filter, Users, TrendingUp, Award, Calendar, Loader2, AlertCircle, Medal, Star } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface StaffPerformanceTabProps {
  staff: Staff;
  assignedClass: ClassLevel | 'All';
}

export function StaffPerformanceTab({ staff, assignedClass }: StaffPerformanceTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dateFilter, setDateFilter] = useState<DateFilterType>('30 Days');
  
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [grades, setGrades] = useState<DailyGrade[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const isDaily = dateFilter === 'Daily';

  useEffect(() => {
    async function fetchPerformance() {
      try {
        setLoading(true);
        setError(null);
        
        const filterDateStr = getDateFromFilter(dateFilter);

        // Fetch students in assigned class via service
        const studentsData = await studentService.fetchAllStudents(assignedClass);
        
        const studentMap: Record<string, Student> = {};
        studentsData.forEach(s => {
          studentMap[s.id] = s;
        });
        setStudents(studentMap);
        
        const studentIds = Object.keys(studentMap);
        
        if (studentIds.length === 0) {
          setAttendance([]);
          setGrades([]);
          setLoading(false);
          return;
        }

        // Fetch attendance via service
        let attendanceData: Attendance[] = [];
        if (isDaily) {
          attendanceData = await attendanceService.fetchAttendanceByClassAndDate(assignedClass, filterDateStr);
        } else {
          attendanceData = await attendanceService.fetchAttendanceByDateRange(filterDateStr, undefined, assignedClass);
        }
        
        // Filter attendance to just these students (in case of class transfers)
        const filteredAttendance = attendanceData.filter(a => studentIds.includes(a.student_id));
        setAttendance(filteredAttendance);

        // Fetch grades
        const allGrades = await gradeService.fetchGradesByFilter(filterDateStr, isDaily, assignedClass);
        const filteredGrades = allGrades.filter(g => studentIds.includes(g.student_id));
        setGrades(filteredGrades);

      } catch (err: any) {
        logger.error('ERROR_FETCHING_STAFF_PERFORMANCE', { error: err instanceof Error ? err.message : String(err) });
        setError(err.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    }

    fetchPerformance();
  }, [dateFilter, assignedClass]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 mb-6">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  // Calculate Attendance Stats
  const totalStudents = Object.keys(students).length;
  // If it's daily, present = those who are present today. 
  // If it's a range, it's (total present days / (total students * days in range)) 
  // But days in range might not be exact. We can just use (total present records / total records)
  
  let attendanceRate = 0;
  if (attendance.length > 0) {
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const lateCount = attendance.filter(a => a.status === 'late').length;
    attendanceRate = Math.round(((presentCount + lateCount) / attendance.length) * 100);
  } else if (isDaily && totalStudents > 0) {
     attendanceRate = 0;
  }

  // Calculate Top Performers
  const studentPerformance = Object.values(students).map(student => {
    const studentGrades = grades.filter(g => g.student_id === student.id);
    if (studentGrades.length === 0) return { student_id: student.id, avgStars: 0, totalStars: 0, count: 0 };
    
    let totalCW = 0;
    let totalHW = 0;
    let totalAct = 0;
    
    studentGrades.forEach(g => {
      totalCW += g.cw_stars;
      totalHW += g.hw_stars;
      totalAct += g.activity_stars;
    });
    
    const totalStars = totalCW + totalHW + totalAct;
    const avgStars = Math.round((totalStars / (studentGrades.length * 3)) * 10) / 10;
    
    return {
      student_id: student.id,
      avgStars,
      totalStars,
      count: studentGrades.length
    };
  }).filter(s => s.count > 0);

  studentPerformance.sort((a, b) => b.avgStars - a.avgStars);
  const topPerformers = studentPerformance; // Show all students sorted

  return (
    <div className="space-y-6">
      
      {/* Filters Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Class Performance</h2>
          <p className="text-slate-500 mt-1 flex items-center gap-1 text-sm">
            <Users className="w-4 h-4" />
            {assignedClass === 'All' ? 'All Classes' : `${assignedClass}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
             <Filter className="w-4 h-4 text-teal-600" />
             <select
               value={dateFilter}
               onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
               className="bg-transparent text-slate-700 text-sm focus:outline-none font-medium cursor-pointer"
             >
               {DATE_FILTERS.map(filter => (
                 <option key={filter} value={filter}>{filter}</option>
               ))}
             </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Widget */}
        <div className="bg-gradient-to-br from-sky-50 to-white p-6 rounded-3xl shadow-sm border border-sky-100 relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-24 h-24 text-sky-600" />
          </div>
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-sky-900 mb-2 relative z-10">Avg. Attendance</h3>
          
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-5xl font-bold text-sky-600">{attendanceRate}%</span>
            <span className="text-sky-600/70 font-medium mb-1">present</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 relative z-10">{dateFilter} average</p>
        </div>

        {/* Overall Rating Widget */}
        <div className="bg-gradient-to-br from-teal-50 to-white p-6 rounded-3xl shadow-sm border border-teal-100 relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-24 h-24 text-teal-600" />
          </div>
          
          <h3 className="text-sm font-bold uppercase tracking-wider text-teal-900 mb-2 relative z-10">Class Average</h3>
          
          <div className="flex items-end gap-2 relative z-10">
            <span className="text-5xl font-bold text-teal-600">
              {studentPerformance.length > 0 
                ? (Math.round(studentPerformance.reduce((acc, p) => acc + p.avgStars, 0) / studentPerformance.length * 10) / 10).toFixed(1)
                : '0.0'}
            </span>
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400 mb-1" />
          </div>
          <p className="text-xs text-slate-500 mt-2 relative z-10">{dateFilter} average</p>
        </div>
      </div>

      {/* Student List Widget */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-slate-800">Student Ranking</h3>
        </div>

        {topPerformers.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Medal className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No grades recorded for this period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((performer, index) => {
              const student = students[performer.student_id];
              if (!student) return null;
              
              return (
                <div key={performer.student_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700 border border-yellow-300' : 
                        index === 1 ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border border-slate-300' : 
                        index === 2 ? 'bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 border border-amber-300' : 'bg-white text-slate-600 border border-slate-200'}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700">{student.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Roll: {student.roll_no} {assignedClass === 'All' ? `• ${student.class_name}` : ''}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-white shadow-sm border border-teal-100 px-3 py-1.5 rounded-full">
                    <span className="font-bold text-teal-700">{performer.avgStars.toFixed(1)}</span>
                    <Star className="w-3.5 h-3.5 fill-teal-500 text-teal-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

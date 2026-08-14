import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, Attendance, DailyGrade } from '../../lib/types';
import { Users, TrendingUp, Award, Calendar, Loader2, AlertCircle, Medal, Star } from 'lucide-react';
import { format } from 'date-fns';
import { DateFilterType, DATE_FILTERS, getDateFromFilter } from '../../lib/dateUtils';
import { Filter } from 'lucide-react';

export function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);
  const [todayGrades, setTodayGrades] = useState<DailyGrade[]>([]);
  const [students, setStudents] = useState<Record<string, Student>>({});
  const [dateFilter, setDateFilter] = useState<DateFilterType>('Daily');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        
        const filterDateStr = getDateFromFilter(dateFilter);
        const isDaily = dateFilter === 'Daily';

        // Fetch all students to map IDs to names
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('*');

        if (studentsError) throw studentsError;
        
        const studentMap: Record<string, Student> = {};
        studentsData?.forEach(s => {
          studentMap[s.id] = s;
        });
        setStudents(studentMap);

        // Fetch attendance
        let attendanceQuery = supabase
          .from('attendance')
          .select('*');
          
        if (isDaily) {
          attendanceQuery = attendanceQuery.eq('date', filterDateStr);
        } else {
          attendanceQuery = attendanceQuery.gte('date', filterDateStr);
        }

        const { data: attendanceData, error: attendanceError } = await attendanceQuery;

        if (attendanceError) throw attendanceError;
        setTodayAttendance(attendanceData || []);

        // Fetch grades
        let gradesQuery = supabase
          .from('daily_grades')
          .select('*');
          
        if (isDaily) {
          gradesQuery = gradesQuery.eq('date', filterDateStr);
        } else {
          gradesQuery = gradesQuery.gte('date', filterDateStr);
        }

        const { data: gradesData, error: gradesError } = await gradesQuery;

        if (gradesError) throw gradesError;
        setTodayGrades(gradesData || []);

      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [dateFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 m-4">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  // Calculate Attendance Stats
  const totalStudents = Object.keys(students).length;
  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;
  const absentCount = todayAttendance.filter(a => a.status === 'absent').length;
  
  // Calculate attendance rate based on total students if not all have attendance marked
  const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;

  // Calculate Top Performers
  const studentPerformance = Object.values(students).map(student => {
    const studentGrades = todayGrades.filter(g => g.student_id === student.id);
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
  const topPerformers = studentPerformance.slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Analytics Overview</h2>
          <p className="text-slate-500 mt-1 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {dateFilter === 'Daily' ? format(new Date(), 'EEEE, MMMM d, yyyy') : `${dateFilter} Overview`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            {DATE_FILTERS.map(filter => (
              <option key={filter} value={filter}>{filter}</option>
            ))}
          </select>
          <div className="h-12 w-12 bg-sky-100 rounded-full flex items-center justify-center">
            <TrendingUp className="text-sky-600 w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Widget */}
        <div className="bg-gradient-to-br from-sky-50 to-white p-6 rounded-3xl shadow-sm border border-sky-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Users className="w-24 h-24 text-sky-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-sky-900 mb-4 relative z-10">School Attendance</h3>
          
          <div className="flex items-end gap-2 mb-6 relative z-10">
            <span className="text-5xl font-bold text-sky-600">{attendanceRate}%</span>
            <span className="text-sky-600/70 font-medium mb-1">Avg Present</span>
          </div>

          <div className="grid grid-cols-3 gap-3 relative z-10">
            <div className="bg-white/60 p-3 rounded-2xl border border-sky-50 text-center">
              <div className="text-2xl font-bold text-emerald-600">{presentCount}</div>
              <div className="text-xs text-slate-500 font-medium">Present</div>
            </div>
            <div className="bg-white/60 p-3 rounded-2xl border border-sky-50 text-center">
              <div className="text-2xl font-bold text-amber-500">{lateCount}</div>
              <div className="text-xs text-slate-500 font-medium">Late</div>
            </div>
            <div className="bg-white/60 p-3 rounded-2xl border border-sky-50 text-center">
              <div className="text-2xl font-bold text-rose-500">{absentCount}</div>
              <div className="text-xs text-slate-500 font-medium">Absent</div>
            </div>
          </div>
        </div>

        {/* Top Performers Widget */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Top Performers ({dateFilter})</h3>
            <div className="p-2 bg-yellow-50 rounded-xl">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
          </div>

          {topPerformers.length === 0 ? (
            <div className="text-center py-8">
              <Medal className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500">No grades recorded for this period yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topPerformers.map((performer, index) => {
                const student = students[performer.student_id];
                if (!student) return null;
                
                return (
                  <div key={performer.student_id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                          index === 1 ? 'bg-slate-100 text-slate-700' : 
                          index === 2 ? 'bg-amber-100 text-amber-800' : 'bg-sky-50 text-sky-600'}
                      `}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.class_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-teal-50 px-3 py-1.5 rounded-full">
                      <span className="font-semibold text-teal-700">{performer.avgStars}</span>
                      <Star className="w-4 h-4 fill-teal-500 text-teal-500" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

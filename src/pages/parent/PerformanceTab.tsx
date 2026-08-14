import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Student, Attendance, DailyGrade } from '../../lib/types';
import { Award, CalendarCheck, Star, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { DateFilterType, DATE_FILTERS, getDateFromFilter } from '../../lib/dateUtils';
import { Filter } from 'lucide-react';

interface PerformanceTabProps {
  student: Student;
}

export function PerformanceTab({ student }: PerformanceTabProps) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [grades, setGrades] = useState<DailyGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('30 Days');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const filterDateStr = getDateFromFilter(dateFilter);
        const isDaily = dateFilter === 'Daily';

        // Fetch attendance
        let attendanceQuery = supabase
          .from('attendance')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });

        if (isDaily) {
          attendanceQuery = attendanceQuery.eq('date', filterDateStr);
        } else {
          attendanceQuery = attendanceQuery.gte('date', filterDateStr);
        }

        const { data: attendanceData, error: attendanceError } = await attendanceQuery;

        if (attendanceError) throw attendanceError;
        setAttendance(attendanceData || []);

        // Fetch daily grades
        let gradesQuery = supabase
          .from('daily_grades')
          .select('*')
          .eq('student_id', student.id)
          .order('date', { ascending: false });
          
        if (isDaily) {
          gradesQuery = gradesQuery.eq('date', filterDateStr);
        } else {
          gradesQuery = gradesQuery.gte('date', filterDateStr);
        }

        const { data: gradesData, error: gradesError } = await gradesQuery;

        if (gradesError) throw gradesError;
        setGrades(gradesData || []);

      } catch (err: any) {
        console.error('Error fetching performance data:', err);
        setError(err.message || 'Failed to load performance data');
      } finally {
        setLoading(false);
      }
    }

    if (student?.id) {
      fetchData();
    }
  }, [student?.id, dateFilter]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  // Calculate stats
  const totalDays = attendance.length;
  const presentDays = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const totalGrades = grades.length;
  let avgStars = 0;
  if (totalGrades > 0) {
    const sumStars = grades.reduce((acc, curr) => acc + curr.cw_stars + curr.hw_stars + curr.activity_stars, 0);
    avgStars = Math.round((sumStars / (totalGrades * 3)) * 10) / 10; // Max 5 stars per category, assuming 5 is max
  }

  const getPerformanceSummary = (avg: number) => {
    if (avg >= 4.5) return 'Excellent';
    if (avg >= 3.5) return 'Very Good';
    if (avg >= 2.5) return 'Good';
    if (avg >= 1.5) return 'Needs Improvement';
    return 'Not enough data';
  };

  const getPerformanceColor = (avg: number) => {
    if (avg >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (avg >= 3.5) return 'text-teal-600 bg-teal-50 border-teal-200';
    if (avg >= 2.5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-rose-600 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Filter className="w-5 h-5 text-teal-600" />
          Performance Summary
        </h2>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
          className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
        >
          {DATE_FILTERS.map(filter => (
            <option key={filter} value={filter}>{filter}</option>
          ))}
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Attendance Card */}
        <div className="bg-gradient-to-br from-sky-50 to-white p-5 rounded-3xl border border-sky-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <CalendarCheck className="w-16 h-16 text-sky-600" />
          </div>
          <div className="relative z-10 text-center">
            <h3 className="text-sm font-medium text-sky-800 mb-2">Attendance</h3>
            <div className="flex items-end justify-center gap-1">
              <span className="text-4xl font-bold text-sky-600">{attendanceRate}</span>
              <span className="text-xl font-medium text-sky-400 mb-1">%</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {presentDays} of {totalDays} days
            </p>
          </div>
        </div>

        {/* Performance Card */}
        <div className="bg-gradient-to-br from-teal-50 to-white p-5 rounded-3xl border border-teal-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Award className="w-16 h-16 text-teal-600" />
          </div>
          <div className="relative z-10 text-center">
            <h3 className="text-sm font-medium text-teal-800 mb-2">Avg Rating</h3>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-bold text-teal-600">{avgStars}</span>
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 mb-1" />
            </div>
            {totalGrades > 0 && (
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium border ${getPerformanceColor(avgStars)} inline-block`}>
                {getPerformanceSummary(avgStars)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Grades */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-slate-800">Recent Performance</h3>
        </div>

        {grades.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No grades recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {grades.slice(0, 10).map((grade) => {
              const dayAvg = Math.round(((grade.cw_stars + grade.hw_stars + grade.activity_stars) / 3) * 10) / 10;
              return (
                <div key={grade.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-slate-700">
                      {format(parseISO(grade.date), 'MMMM d, yyyy')}
                    </span>
                    <div className="flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-full text-teal-700 text-sm font-medium">
                      <span>{dayAvg}</span>
                      <Star className="w-3.5 h-3.5 fill-teal-500 text-teal-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-slate-50 rounded-xl">
                      <div className="text-xs text-slate-500 mb-1">Classwork</div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-slate-700">{grade.cw_stars}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-xl">
                      <div className="text-xs text-slate-500 mb-1">Homework</div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-slate-700">{grade.hw_stars}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-xl">
                      <div className="text-xs text-slate-500 mb-1">Activity</div>
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-slate-700">{grade.activity_stars}</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      </div>
                    </div>
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

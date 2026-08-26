import React, { useMemo, useState, useEffect } from 'react';
import { Staff, Student, DailyLog, GatePass, Attendance, SchoolEvent } from '@/lib/types';
import { Users, UserCheck, CreditCard, Calendar, Activity, GraduationCap, DollarSign, Megaphone, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { feeService, StudentFee } from '@/services/feeService';

interface Props {
  students: Student[];
  staff: Staff[];
  activityLogs: DailyLog[];
  gatePasses: GatePass[];
  attendance: Attendance[];
  events: SchoolEvent[];
}

export function AdminDashboardOverview({ students, staff, activityLogs, gatePasses, attendance, events }: Props) {
  const [ledgers, setLedgers] = useState<StudentFee[]>([]);
  const [financeTimeFilter, setFinanceTimeFilter] = useState<'month' | 'year'>('month');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    // Fetch live fee data for the current active year
    feeService.fetchStudentFees('2026-2027').then(data => setLedgers(data)).catch(console.error);
  }, []);
  // --- Student Metrics ---
  const currentMonth = new Date().getMonth();
  const newAdmissionsMock = students.filter(s => {
    // Basic heuristic: assume high ID or missing pin means new if we don't have created_at
    return false; // we'll fallback to mock for now since 'created_at' isn't reliably on Student type
  }).length || Math.floor(students.length * 0.15) || 12;

  const dropouts = students.filter(s => s.status === 'dropout').length;

  // --- Staff Metrics ---
  const activeStaff = staff.length; // Assume all active until HR leave module
  const staffOnLeaveMock = 0; // Mocked

  // --- Finance Metrics (LIVE) ---
  const currentYear = new Date().getFullYear();

  const filteredLedgers = useMemo(() => {
    if (financeTimeFilter === 'year') return ledgers;
    return ledgers.filter(l => {
      if (!l.due_date) return l.fee_period !== 'Monthly';
      const d = new Date(l.due_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
  }, [ledgers, financeTimeFilter]);

  const feeExpected = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + (curr.total_due || 0), 0);
  const feePaidLive = filteredLedgers.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0);
  const feePendingLive = filteredLedgers.filter(l => l.status !== 'Waived').reduce((acc, curr) => acc + ((curr.total_due || 0) - (curr.amount_paid || 0)), 0);

  const feeTotalMock = feeExpected > 0 ? feeExpected : 1; // Prevent div/0
  const feePaidPercent = Math.round((feePaidLive / feeTotalMock) * 100);
  const feePendingPercent = Math.round((feePendingLive / feeTotalMock) * 100);

  // --- Attendance Metrics (LIVE) ---
  const { totalAttendancePercent, heatmapData } = useMemo(() => {
    if (!attendance || attendance.length === 0) {
      return { totalAttendancePercent: 0, heatmapData: [] };
    }

    let presentCount = 0;
    const classStats: Record<string, { total: number, present: number }> = {};

    attendance.forEach(record => {
      const isPresent = record.status === 'present' || record.status === 'late';
      if (isPresent) presentCount++;

      const cls = record.class_name || 'Unknown';
      if (!classStats[cls]) classStats[cls] = { total: 0, present: 0 };
      classStats[cls].total++;
      if (isPresent) classStats[cls].present++;
    });

    const totalPercent = Math.round((presentCount / attendance.length) * 100) || 0;

    const heatmap = Object.entries(classStats).map(([cls, stats]) => {
      const pct = Math.round((stats.present / stats.total) * 100);
      let color = 'bg-emerald-500';
      let hexColor = '#10b981'; // emerald-500
      if (pct < 75) { color = 'bg-rose-400'; hexColor = '#fb7185'; } // rose-400
      else if (pct < 90) { color = 'bg-amber-400'; hexColor = '#fbbf24'; } // amber-400

      return {
        cls,
        val: `${pct}%`,
        color,
        rawPct: pct,
        hexColor
      };
    });

    return { totalAttendancePercent: totalPercent, heatmapData: heatmap };
  }, [attendance]);

  const displayHeatmap = heatmapData.length > 0 ? heatmapData : [
    { cls: 'Pre-K', val: '0%', color: 'bg-slate-200', rawPct: 0, hexColor: '#e2e8f0' },
    { cls: 'KG', val: '0%', color: 'bg-slate-200', rawPct: 0, hexColor: '#e2e8f0' },
  ];

  const admissionsTrend = [
    { name: 'Jan', new: 10, dropouts: 2 },
    { name: 'Feb', new: 15, dropouts: 1 },
    { name: 'Mar', new: 30, dropouts: 0 },
    { name: 'Apr', new: 25, dropouts: 3 },
    { name: 'May', new: 40, dropouts: 1 },
    { name: 'Jun', new: 55, dropouts: 2 },
  ];

  const feePieData = [
    { name: 'Collected', value: feePaidLive || 0, color: '#10b981' },
    { name: 'Pending', value: feePendingLive || 0, color: '#f43f5e' }
  ];

  // Class-wise fee calculation
  const classFeeMap: Record<string, { cls: string; paid: number; pending: number }> = {};
  filteredLedgers.forEach(l => {
    if (l.status === 'Waived') return;
    const cls = l.student?.class_name || 'Unknown';
    if (!classFeeMap[cls]) classFeeMap[cls] = { cls, paid: 0, pending: 0 };
    classFeeMap[cls].paid += (l.amount_paid || 0);
    classFeeMap[cls].pending += ((l.total_due || 0) - (l.amount_paid || 0));
  });
  const classWiseFeeData = Object.values(classFeeMap).sort((a, b) => a.cls.localeCompare(b.cls));

  // --- Helpers for Events ---
  const getEventColor = (type: string) => {
    switch (type) {
      case 'exam': return { wrapper: 'bg-rose-50/50 border-rose-100', iconBg: 'bg-rose-100 text-rose-700 border-rose-200 group-hover:bg-rose-500', text: 'text-rose-900', subtext: 'text-rose-700/80' };
      case 'holiday': return { wrapper: 'bg-emerald-50/50 border-emerald-100', iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200 group-hover:bg-emerald-500', text: 'text-emerald-900', subtext: 'text-emerald-700/80' };
      default: return { wrapper: 'bg-sky-50/50 border-sky-100', iconBg: 'bg-sky-100 text-sky-700 border-sky-200 group-hover:bg-sky-500', text: 'text-sky-900', subtext: 'text-sky-700/80' };
    }
  };

  const formatEventDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return {
        month: d.toLocaleString('default', { month: 'short' }),
        day: d.getDate().toString().padStart(2, '0')
      };
    } catch {
      return { month: '???', day: '??' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <div className="text-sm text-slate-500 font-medium mt-1">Key metrics and system activity</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <GraduationCap size={16} /> Add Student
          </button>
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <Calendar size={16} /> Schedule Exam
          </button>
          <button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <Megaphone size={16} /> Send Notice
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Student Count Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-200 transition-colors">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <Users size={16} className="text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Student Count</h3>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-800">{students.length}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-emerald-600">₹{newAdmissionsMock} New</span>
              <span className="text-xs font-semibold text-rose-500">{dropouts} Dropouts</span>
            </div>
          </div>
        </div>

        {/* Teacher Availability Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <UserCheck size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-700">Teacher Availability</h3>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-800">{staff.length}</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-emerald-600">{activeStaff} Active</span>
              <span className="text-xs font-semibold text-slate-400">{staffOnLeaveMock} On Leave</span>
            </div>
          </div>
        </div>

        {/* Fee Collection Status Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between mb-3 text-slate-500">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-700">Fee Collection</h3>
            </div>
            <select
              value={financeTimeFilter}
              onChange={(e) => setFinanceTimeFilter(e.target.value as 'month' | 'year')}
              className="text-xs bg-slate-100 rounded-lg px-2 py-1 text-slate-600 font-medium outline-none border-none cursor-pointer"
            >
              <option value="month">Monthly</option>
              <option value="year">Annual</option>
            </select>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-800">{feePaidPercent}%</p>
            <div className="w-full h-2 bg-rose-100 rounded-full mt-2 overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${feePaidPercent}%` }}></div>
              <div className="h-full bg-rose-500" style={{ width: `${feePendingPercent}%` }}></div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2">
              <span className="text-xs font-semibold text-emerald-600">Paid: ₹{feePaidLive.toLocaleString()}</span>
              <span className="text-xs font-semibold text-rose-500">Pending: ₹{feePendingLive.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Attendance Snapshot Widget (LIVE) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-sky-200 transition-colors">
          <div className="flex items-center gap-2 mb-3 text-slate-500">
            <Activity size={16} className="text-sky-500" />
            <h3 className="text-sm font-semibold text-slate-700">Attendance Today</h3>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-slate-800">{totalAttendancePercent}%</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-sky-600">School Avg</span>
              <span className="text-xs font-semibold text-slate-400">View Heatmap →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Attendance & Fees */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Attendance Heatmap / Bar Chart (LIVE) */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-slate-700">Attendance by Class</h3>
            <button className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
              <FileText size={14} /> Download Report
            </button>
          </div>

          <div className="flex-1 px-2 pb-2 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayHeatmap} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="cls" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="rawPct" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {displayHeatmap.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.hexColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fee Collection Pie Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-slate-700">Fee Collection</h3>
          </div>

          <div className="flex-1 min-h-[250px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={feePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {feePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => `₹${Number(value).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label inside Pie */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800">{feePaidPercent}%</span>
              <span className="text-xs font-semibold text-slate-400">Collected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Class-wise Insight Row */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-700">Class-wise Fee Collection ({financeTimeFilter === 'month' ? 'Current Month' : 'Full Year'})</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click a bar to see individual student breakdown</p>
          </div>
        </div>
        <div className="w-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={classWiseFeeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={(data: any) => { if (data?.activePayload?.[0]) setSelectedClass((data.activePayload[0].payload as any).cls); }}
              style={{ cursor: 'pointer' }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="cls" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="paid" stackId="a" fill="#10b981" name="Collected (₹)" radius={[0, 0, 4, 4]} maxBarSize={50} />
              <Bar dataKey="pending" stackId="a" fill="#f43f5e" name="Pending (₹)" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Class Drill-down Slide-in Panel */}
      {selectedClass && (() => {
        const classLedgers = filteredLedgers.filter(l => l.student?.class_name === selectedClass);
        return (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedClass(null)}>
            <div
              className="bg-white w-full max-w-md shadow-2xl border-l border-slate-200 flex flex-col h-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{selectedClass} — Fee Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{classLedgers.length} ledger entries · {financeTimeFilter === 'month' ? 'Current Month' : 'Full Year'}</p>
                </div>
                <button onClick={() => setSelectedClass(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {classLedgers.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-sm">No fee records for this class in the selected period.</div>
                ) : (
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider sticky top-0">
                        <th className="p-3 font-semibold">Student</th>
                        <th className="p-3 font-semibold text-right">Paid</th>
                        <th className="p-3 font-semibold text-right">Pending</th>
                        <th className="p-3 font-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classLedgers.map(l => {
                        const pending = (l.total_due || 0) - (l.amount_paid || 0);
                        return (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="p-3">
                              <p className="font-semibold text-slate-800">{l.student?.name}</p>
                              <p className="text-[11px] text-slate-400">{l.category?.name || l.structure?.category?.name || l.structure?.fee_category}</p>
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">₹{(l.amount_paid || 0).toLocaleString()}</td>
                            <td className="p-3 text-right font-bold text-rose-500">₹{pending.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : l.status === 'Waived' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'}`}>
                                {l.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bottom Row: Admissions Trend & Upcoming Events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Admissions Trend Line Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-bold text-slate-700">Admissions Trend (Last 6 Months)</h3>
          </div>

          <div className="flex-1 px-2 pb-2 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={admissionsTrend} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="new" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="New Admissions" />
                <Line type="monotone" dataKey="dropouts" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }} name="Dropouts" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Events List (LIVE) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={18} className="text-sky-500" /> Upcoming Events
            </h3>
            <button className="text-xs font-bold text-slate-400 hover:text-slate-700">View All</button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-2" style={{ maxHeight: '250px' }}>
            {events.length === 0 ? (
              <div className="text-sm text-slate-400 text-center mt-10">No upcoming events scheduled.</div>
            ) : (
              events.map((evt) => {
                const colors = getEventColor(evt.event_type);
                const dateParts = formatEventDate(evt.event_date);
                return (
                  <div key={evt.id} className={`${colors.wrapper} border p-4 rounded-xl flex items-start gap-4 hover:opacity-90 transition-opacity cursor-pointer group`}>
                    <div className={`${colors.iconBg} w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border group-hover:text-white transition-colors`}>
                      <span className="text-[10px] font-bold uppercase leading-none">{dateParts.month}</span>
                      <span className="text-lg font-extrabold leading-tight">{dateParts.day}</span>
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${colors.text} mb-0.5`}>{evt.title}</h4>
                      <p className={`text-xs ${colors.subtext}`}>{evt.description || evt.class_name}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

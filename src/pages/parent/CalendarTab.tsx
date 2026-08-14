import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { ChevronLeft, ChevronRight, Calendar, BookOpen, Star, AlertCircle } from 'lucide-react';

interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  type: 'holiday' | 'event';
  description?: string;
}

interface Homework {
  id: string;
  title: string;
  due_date: string;
  subject: string;
}

interface CalendarTabProps {
  student: Student;
}

export function CalendarTab({ student }: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate.getMonth(), currentDate.getFullYear(), student.class_name]);

  const fetchCalendarData = async () => {
    setLoading(true);
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startStr = startOfMonth.toISOString().split('T')[0];
    const endStr = endOfMonth.toISOString().split('T')[0];

    const [eventsRes, hwRes] = await Promise.all([
      supabase
        .from('school_events')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr),
      supabase
        .from('homework')
        .select('*')
        .eq('class_name', student.class_name)
        .gte('due_date', startStr)
        .lte('due_date', endStr)
    ]);

    if (!eventsRes.error) setEvents(eventsRes.data || []);
    if (!hwRes.error) setHomeworks(hwRes.data || []);
    
    setLoading(false);
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // 0 is Monday, 6 is Sunday
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const selDateStr = selectedDate.toISOString().split('T')[0];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 w-full"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayEvents = events.filter(e => e.date === dateStr);
      const dayHomeworks = homeworks.filter(h => h.due_date === dateStr);
      
      const hasHoliday = dayEvents.some(e => e.type === 'holiday');
      const hasEvent = dayEvents.some(e => e.type === 'event');
      const hasHomework = dayHomeworks.length > 0;
      
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selDateStr;

      days.push(
        <div 
          key={d} 
          onClick={() => setSelectedDate(new Date(year, month, d))}
          className={`h-12 w-full flex flex-col items-center justify-start py-1 cursor-pointer rounded-lg transition-colors
            ${isSelected ? 'bg-sky-100 border border-sky-300' : 'hover:bg-slate-50 border border-transparent'}
          `}
        >
          <span className={`text-sm font-medium ${isToday ? 'bg-sky-500 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
            {d}
          </span>
          <div className="flex gap-1 mt-1">
            {hasHoliday && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
            {hasEvent && <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>}
            {hasHomework && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
          </div>
        </div>
      );
    }
    return days;
  };

  const getSelectedDateData = () => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return {
      events: events.filter(e => e.date === dateStr),
      homeworks: homeworks.filter(h => h.due_date === dateStr)
    };
  };

  const selectedData = getSelectedDateData();

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-gradient-to-r from-sky-500 to-teal-400 rounded-2xl p-6 text-white shadow-sm flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="text-center">
          <h2 className="text-2xl font-bold">
            {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h2>
        </div>
        <button onClick={nextMonth} className="p-2 hover:bg-white/20 rounded-full transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {renderCalendarDays()}
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 justify-center text-sm text-slate-600">
          <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 mr-2"></div> Holiday</div>
          <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></div> Homework Due</div>
          <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-violet-500 mr-2"></div> Event</div>
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center border-b border-slate-100 pb-3">
          <Calendar className="w-5 h-5 mr-2 text-sky-500" />
          {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </h3>
        
        <div className="space-y-3">
          {selectedData.events.length === 0 && selectedData.homeworks.length === 0 ? (
            <p className="text-slate-500 italic">No events or homework due on this date.</p>
          ) : (
            <>
              {selectedData.events.map(event => (
                <div key={event.id} className={`flex items-start p-3 rounded-xl border ${event.type === 'holiday' ? 'bg-red-50 border-red-100' : 'bg-violet-50 border-violet-100'}`}>
                  <div className={`mt-0.5 p-1.5 rounded-lg mr-3 ${event.type === 'holiday' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'}`}>
                    {event.type === 'holiday' ? <AlertCircle className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${event.type === 'holiday' ? 'text-red-900' : 'text-violet-900'}`}>{event.title}</h4>
                    {event.description && <p className="text-sm mt-1 opacity-80">{event.description}</p>}
                  </div>
                </div>
              ))}
              
              {selectedData.homeworks.map(hw => (
                <div key={hw.id} className="flex items-start p-3 rounded-xl border bg-amber-50 border-amber-100">
                  <div className="mt-0.5 p-1.5 rounded-lg mr-3 bg-amber-100 text-amber-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-amber-900">{hw.title}</h4>
                    <p className="text-sm mt-1 text-amber-700/80">Subject: {hw.subject}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

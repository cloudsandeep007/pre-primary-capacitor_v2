import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  name: string;
  class_name: string;
}

interface Classwork {
  id: string;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  date: string;
}

interface ParentClassworkTabProps {
  student: Student;
}

export function ParentClassworkTab({ student }: ParentClassworkTabProps) {
  const [classworkList, setClassworkList] = useState<Classwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasswork = async () => {
      try {
        const { data, error } = await supabase
          .from('classwork')
          .select('*')
          .eq('class_name', student.class_name)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setClassworkList(data || []);
      } catch (error) {
        console.error('Error fetching classwork:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasswork();
  }, [student.class_name]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const date = new Date(dateString);
    if (dateString === new Date().toISOString().split('T')[0]) {
      return 'Today, ' + date.toLocaleDateString(undefined, options);
    }
    return date.toLocaleDateString(undefined, options);
  };

  // Group classwork by date
  const groupedClasswork = classworkList.reduce((acc, current) => {
    if (!acc[current.date]) {
      acc[current.date] = [];
    }
    acc[current.date].push(current);
    return acc;
  }, {} as Record<string, Classwork[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-teal-500 h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-teal-100 p-3 rounded-2xl">
          <BookOpen className="text-teal-600 h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Classwork Overview</h2>
          <p className="text-gray-500 text-sm">What {student.name} learned in class</p>
        </div>
      </div>

      {Object.keys(groupedClasswork).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No classwork records found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedClasswork).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                <Calendar className="text-teal-500 h-5 w-5" />
                {formatDate(date)}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {items.map((work) => (
                  <div key={work.id} className="bg-white p-5 rounded-2xl shadow-sm border border-teal-50 hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-400 to-emerald-400"></div>
                    <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-lg mb-2">
                      {work.subject}
                    </span>
                    <h4 className="font-bold text-gray-800 text-lg mb-2">{work.title}</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{work.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

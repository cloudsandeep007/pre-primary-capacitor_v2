import { useState, useEffect, useMemo } from 'react';
import { LogOut, Search, Users, Camera } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Staff, Student, ClassLevel } from '@/lib/types';
import { CLASS_LEVELS } from '@/lib/constants';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner, FullScreenSpinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { ActivityFormModal } from './ActivityFormModal';
import { StaffQRScannerModal } from './StaffQRScannerModal';
import { getMockStudents, DEMO_STAFF } from '@/lib/mockData';

export function normalizeClassLevel(cls?: string | null): ClassLevel | 'All' {
  if (!cls) return 'All';
  const clean = cls.trim().toLowerCase();
  if (clean === 'nursery' || clean === 'nurnury' || clean === 'nurcery') return 'Nursery';
  if (clean === 'junior kg' || clean === 'lkg' || clean === 'junior_kg') return 'Junior KG';
  if (clean === 'senior kg' || clean === 'ukg' || clean === 'senior_kg') return 'Senior KG';
  if (clean === 'all') return 'All';
  const match = CLASS_LEVELS.find((c) => c.toLowerCase() === clean);
  return match || 'All';
}

interface StaffDashboardProps {
  staff: Staff;
  onLogout: () => void;
}

export function StaffDashboard({ staff, onLogout }: StaffDashboardProps) {
  const { navigate } = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);

  const assignedClass = useMemo<ClassLevel | 'All'>(() => {
    let raw = staff.assigned_class;
    if (!raw && staff.email) {
      const match = DEMO_STAFF.find((s) => s.email.toLowerCase() === staff.email.toLowerCase());
      if (match?.assigned_class) {
        raw = match.assigned_class;
      }
    }
    return normalizeClassLevel(raw);
  }, [staff.assigned_class, staff.email]);

  const [selectedClass, setSelectedClass] = useState<ClassLevel | 'All'>(
    () => (assignedClass !== 'All' ? assignedClass : 'All')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activityModalStudent, setActivityModalStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (assignedClass !== 'All') {
      setSelectedClass(assignedClass);
    }
  }, [assignedClass]);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*');
      if (error || !data || data.length === 0) {
        setStudents(getMockStudents());
      } else {
        const mapped = data.map((d: any) => ({
          id: d.id || String(d.roll_no || d.roll_number),
          roll_no: String(d.roll_no || d.roll_number || '101'),
          pin: String(d.pin || '1234'),
          name: d.name || 'Student',
          class_name: d.class_name || d.class || 'Nursery',
        }));
        setStudents(mapped as Student[]);
      }
    } catch (err) {
      console.warn('[StaffDashboard] Using mock students list');
      setStudents(getMockStudents());
    } finally {
      setLoading(false);
    }
  };

  const allowedStudents = useMemo(() => {
    if (assignedClass !== 'All') {
      return students.filter((s) => normalizeClassLevel(s.class_name) === assignedClass);
    }
    return students;
  }, [students, assignedClass]);

  const filteredStudents = useMemo(() => {
    return allowedStudents.filter((s) => {
      const matchesClass = selectedClass === 'All' || normalizeClassLevel(s.class_name) === selectedClass;
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.roll_no.includes(searchQuery);
      return matchesClass && matchesSearch;
    });
  }, [allowedStudents, selectedClass, searchQuery]);

  const visibleClassTabs = useMemo<(ClassLevel | 'All')[]>(() => {
    if (assignedClass !== 'All') {
      return [assignedClass];
    }
    return ['All', ...CLASS_LEVELS];
  }, [assignedClass]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allowedStudents.length };
    CLASS_LEVELS.forEach((c) => {
      counts[c] = allowedStudents.filter((s) => normalizeClassLevel(s.class_name) === c).length;
    });
    return counts;
  }, [allowedStudents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FullScreenSpinner label="Loading your class..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors text-sm font-semibold border border-sky-200 shadow-sm"
            >
              <span>📷</span> Gate Scanner
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-700">{staff.name}</p>
              <p className="text-xs text-sky-600 font-medium bg-sky-50 px-2 py-0.5 rounded-md inline-block">
                {assignedClass !== 'All' ? `${assignedClass} Teacher` : 'All Classes Staff'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white font-bold text-sm">
              {staff.name.charAt(0)}
            </div>
            <button
              onClick={() => {
                onLogout();
                navigate('/');
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Sign out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Student Dashboard</h1>
            <p className="text-gray-500 text-sm">Select a student to log their daily activity or scan gate pass</p>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold text-sm shadow-md shadow-sky-500/20 hover:from-sky-600 hover:to-teal-600 transition-all active:scale-95 flex-shrink-0"
          >
            <span>📷</span> Gate Pass Scanner
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or roll number..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-sm"
          />
        </div>

        {/* Class filter tabs (Admins) vs Class Banner (Assigned Teachers) */}
        {assignedClass === 'All' ? (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
            {visibleClassTabs.map((cls) => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  selectedClass === cls
                    ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}
              >
                {cls}
                <span className={`ml-2 text-xs ${selectedClass === cls ? 'text-white/80' : 'text-gray-400'}`}>
                  {classCounts[cls] || 0}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-6 flex items-center justify-between bg-sky-50/80 border border-sky-100 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-sky-800">
                Assigned Class: <span className="font-bold">{assignedClass}</span>
              </span>
              <span className="text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full">
                {allowedStudents.length} {allowedStudents.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <span className="text-xs text-sky-600 font-medium">Class Teacher View</span>
          </div>
        )}

        {/* Student list */}
        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No students found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onLogActivity={() => setActivityModalStudent(student)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Activity form modal */}
      {activityModalStudent && (
        <ActivityFormModal
          student={activityModalStudent}
          staff={staff}
          onClose={() => setActivityModalStudent(null)}
          onSaved={() => {
            setActivityModalStudent(null);
            loadStudents();
          }}
        />
      )}

      {/* Gate Pass QR Scanner Modal */}
      {showScanner && (
        <StaffQRScannerModal
          staff={staff}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

function StudentCard({ student, onLogActivity }: { student: Student; onLogActivity: () => void }) {
  const classColors: Record<ClassLevel, string> = {
    'Nursery': 'bg-amber-100 text-amber-700',
    'Junior KG': 'bg-sky-100 text-sky-700',
    'Senior KG': 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/50 transition-all duration-200">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-teal-400 flex items-center justify-center text-white font-bold text-lg">
        {student.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-semibold text-gray-800 truncate">{student.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${classColors[student.class_name]}`}>
            {student.class_name}
          </span>
          <span className="text-xs text-gray-400">Roll #{student.roll_no}</span>
        </div>
      </div>
      <button
        onClick={onLogActivity}
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30 transition-all active:scale-95"
      >
        <Camera size={16} />
        <span className="hidden sm:inline">Log Activity</span>
      </button>
    </div>
  );
}

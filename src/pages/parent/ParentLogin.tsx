import { useState } from 'react';
import { ArrowLeft, Hash, Lock, Heart } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { getMockStudents } from '@/lib/mockData';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';

interface ParentLoginProps {
  onLogin: (student: Student) => void;
}

export function ParentLogin({ onLogin }: ParentLoginProps) {
  const { navigate } = useRouter();
  const [rollNumber, setRollNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const roll = rollNumber.trim();
    const pinVal = pin.trim();

    if (!roll || !pinVal) {
      showToast('error', 'Please enter both roll number and PIN.');
      return;
    }

    if (pinVal.length !== 4 || !/^\d{4}$/.test(pinVal)) {
      showToast('error', 'PIN must be exactly 4 digits.');
      return;
    }

    setLoading(true);
    try {
      let studentAccount: Student | null = null;

      try {
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        const query = supabase
          .from('students')
          .select('*')
          .eq('roll_no', roll)
          .maybeSingle();

        const res = await Promise.race([query, timeout]) as Awaited<typeof query>;

        if (!res.error && res.data) {
          const d = res.data;
          studentAccount = {
            id: d.id || String(d.roll_no),
            roll_no: String(d.roll_no || roll),
            pin: String(d.pin || ''),
            name: d.name || 'Student',
            class_name: d.class_name || d.class || 'Nursery',
            guardian_name: d.guardian_name || '',
            parent_phone: d.parent_phone || d.parent_mobile || '',
            student_photo_url: d.student_photo_url || d.photo_url || '',
            parent_photo_url: d.parent_photo_url || '',
          };
        }
      } catch (err) {
        console.warn('[ParentLogin] Supabase unavailable or timed out, using demo data');
      }

      if (!studentAccount) {
        const mockStudents = getMockStudents();
        studentAccount = mockStudents.find((s) => s.roll_no === roll) || null;
      }

      if (!studentAccount) {
        showToast('error', 'No student found with that roll number.');
        return;
      }

      if (studentAccount.pin !== pinVal) {
        showToast('error', 'Incorrect PIN. Please try again.');
        return;
      }

      showToast('success', `Welcome! Viewing ${studentAccount.name}'s report.`);
      onLogin(studentAccount);
    } catch (err) {
      console.error('[ParentLogin] Login failed:', err);
      showToast('error', 'Could not sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setRollNumber('101');
    setPin('1234');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col">
      <div className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <Logo size="sm" />
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/30 mb-4">
              <Heart size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Parent Sign In</h1>
            <p className="text-gray-500 text-sm">Enter your child's roll number and PIN</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Roll Number</label>
              <div className="relative">
                <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 101"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">4-Digit PIN</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm tracking-widest"
                  inputMode="numeric"
                  maxLength={4}
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full !bg-gradient-to-r !from-teal-500 !to-emerald-500 !shadow-teal-500/25" disabled={loading}>
              {loading ? <Spinner size={20} className="text-white" /> : 'View Report'}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              onClick={() => navigate('/onboarding/parent')}
              className="block w-full text-xs font-semibold text-teal-600 hover:text-teal-700 underline"
            >
              👨‍👩‍👧 New Parent? Complete Onboarding & Register Photos
            </button>
            <button
              onClick={fillDemo}
              className="block w-full text-center text-xs text-gray-400 hover:text-teal-600 font-medium transition-colors"
            >
              Use demo credentials (Roll 101 / PIN 1234)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

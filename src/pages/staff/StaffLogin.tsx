import { useState } from 'react';
import { ArrowLeft, Mail, Lock, LogIn } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { getMockStaff } from '@/lib/mockData';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';

interface StaffLoginProps {
  onLogin: (staff: Staff) => void;
}

export function StaffLogin({ onLogin }: StaffLoginProps) {
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('error', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      let staffAccount: Staff | null = null;
      try {
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (!error && data) {
          staffAccount = {
            id: data.id || data.email,
            email: data.email,
            password: data.password || data.password_hash || '',
            name: data.name || data.email.split('@')[0],
            assigned_class: data.assigned_class || data.class_name || data.class || 'All',
          };
        }
      } catch (err) {
        console.warn('[StaffLogin] Supabase unavailable, falling back to local demo data');
      }

      if (!staffAccount) {
        const mockStaff = getMockStaff();
        staffAccount = mockStaff.find((s) => s.email.toLowerCase() === email.trim().toLowerCase()) || null;
      }

      if (!staffAccount) {
        showToast('error', 'No staff account found with that email.');
        return;
      }

      if (staffAccount.password !== password) {
        showToast('error', 'Incorrect password. Please try again.');
        return;
      }

      showToast('success', `Welcome back, ${staffAccount.name}!`);
      onLogin(staffAccount);
    } catch (err) {
      console.error('[StaffLogin] Login failed:', err);
      showToast('error', 'Could not sign in. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('teacher@school.com');
    setPassword('teacher123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col">
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
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 shadow-lg shadow-sky-500/30 mb-4">
              <LogIn size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Staff Sign In</h1>
            <p className="text-gray-500 text-sm">Log in to manage your class activities</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-sm"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-sm"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Spinner size={20} className="text-white" /> : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center bg-sky-50/50 border border-sky-100 rounded-2xl p-4">
            <p className="text-xs font-semibold text-sky-800 mb-2">Try Demo Teacher Accounts:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setEmail('teacher@school.com'); setPassword('teacher123'); }}
                className="p-2 rounded-xl bg-white border border-sky-100 hover:bg-sky-100/50 text-gray-700 text-left font-medium transition-colors"
              >
                👶 <span className="font-semibold text-sky-700">Nursery</span><br/>
                <span className="text-[10px] text-gray-500">teacher@school.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('lkg@school.com'); setPassword('teacher123'); }}
                className="p-2 rounded-xl bg-white border border-sky-100 hover:bg-sky-100/50 text-gray-700 text-left font-medium transition-colors"
              >
                🎨 <span className="font-semibold text-teal-700">Junior KG</span><br/>
                <span className="text-[10px] text-gray-500">lkg@school.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('ukg@school.com'); setPassword('teacher123'); }}
                className="p-2 rounded-xl bg-white border border-sky-100 hover:bg-sky-100/50 text-gray-700 text-left font-medium transition-colors"
              >
                ✏️ <span className="font-semibold text-indigo-700">Senior KG</span><br/>
                <span className="text-[10px] text-gray-500">ukg@school.com</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@school.com'); setPassword('admin123'); }}
                className="p-2 rounded-xl bg-white border border-sky-100 hover:bg-sky-100/50 text-gray-700 text-left font-medium transition-colors"
              >
                ⭐ <span className="font-semibold text-amber-700">All Classes</span><br/>
                <span className="text-[10px] text-gray-500">admin@school.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

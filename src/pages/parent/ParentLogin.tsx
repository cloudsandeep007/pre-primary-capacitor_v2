import { useState, useEffect } from 'react';
import { ArrowLeft, Hash, Lock, Heart } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { Student } from '@/lib/types';
import { getMockStudents } from '@/lib/mockData';
import { studentService } from '@/services/studentService';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { logger, generateTraceId } from '@/lib/logger';

interface ParentLoginProps {
  onLogin: (student: Student) => void;
}

export function ParentLogin({ onLogin }: ParentLoginProps) {
  const { navigate } = useRouter();
  const [rollNumber, setRollNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user.app_metadata.provider === 'google' && session.user.email) {
        setLoading(true);
        try {
          const { parentService } = await import('@/services/parentService');
          const isValid = await parentService.verifyGoogleIdentity(session.user.email);
          if (isValid) {
            const linked = await parentService.getMyStudents();
            if (linked.length > 0 && linked[0].student) {
              onLogin(linked[0].student);
            } else {
              showToast('error', 'No students linked to this account.');
              await supabase.auth.signOut();
            }
          } else {
            showToast('error', 'This Google account is not registered with the school. Please contact the administrator.');
            await supabase.auth.signOut();
          }
        } catch (e: any) {
          showToast('error', e.message);
          await supabase.auth.signOut();
        } finally {
          setLoading(false);
        }
      }
    };
    checkSession();
  }, [onLogin]);

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
    await supabase.auth.signOut();
    const traceId = generateTraceId();
    logger.info('LOGIN_STARTED', { rollNumber: roll, traceId });

    try {
      let studentAccount: Student | null = null;
      let isAuthenticated = false;
      const formattedEmail = `parent_${roll}@samsidh.local`;

      // PHASE 3: Attempt Supabase Auth First
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: pinVal,
      });

      if (!authError && authData.session) {
        isAuthenticated = true;
      }

      // Legacy fallback logic
      try {
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        );
        const query = studentService.findStudentByRollOrId(roll);

        const res = await Promise.race([query, timeout]);

        if (res) {
          studentAccount = res;
        }
      } catch (err) {
        logger.warn('SUPABASE_UNAVAILABLE', { error: err instanceof Error ? err.message : String(err), rollNumber: roll });
      }

      if (!studentAccount) {
        const mockStudents = getMockStudents();
        studentAccount = mockStudents.find((s) => s.roll_no === roll) || null;
      }

      if (!studentAccount) {
        showToast('error', 'No student found with that roll number.');
        return;
      }

      // PHASE 3: Fallback verification
      if (!isAuthenticated) {
        if (studentAccount.pin === pinVal) {
          isAuthenticated = true;
          // Silent shadow migration: sync PIN to Supabase Auth password
          try {
            const { error: seedError } = await supabase.auth.signInWithPassword({ email: formattedEmail, password: 'Samsidh@123' });
            if (!seedError) await supabase.auth.updateUser({ password: pinVal });
          } catch(e) { /* ignore */ }
        } else {
          logger.info('LOGIN_FAILED', { reason: 'Incorrect PIN', rollNumber: roll, traceId });
          showToast('error', 'Incorrect PIN. Please try again.');
          return;
        }
      }

      logger.info('LOGIN_SUCCESS', { rollNumber: roll, traceId });
      showToast('success', `Welcome! Viewing ${studentAccount.name}'s report.`);
      onLogin(studentAccount);
    } catch (err) {
      logger.error('LOGIN_FAILED', { 
        error: err instanceof Error ? err.message : String(err),
        rollNumber: roll,
        traceId
      });
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

            <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner size={16} className="text-white" /> : 'Sign In'}
          </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="secondary" 
            className="w-full flex items-center justify-center gap-2 py-3"
            onClick={async () => {
              setLoading(true);
              try {
                // Dynamically import Capacitor to check platform
                const { Capacitor } = await import('@capacitor/core');
                const redirectUrl = Capacitor.isNativePlatform()
                  ? 'com.samsidh.preprimary://login-callback'
                  : window.location.origin + window.location.pathname + '#/parent';

                const { error } = await supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: {
                    redirectTo: redirectUrl
                  }
                });
                if (error) throw error;
              } catch (e: any) {
                showToast('error', e.message);
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google
          </Button>

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

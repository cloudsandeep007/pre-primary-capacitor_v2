import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Staff } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { showToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { logger, generateTraceId } from '@/lib/logger';

export function GateLogin({ onLogin }: { onLogin: (staff: Staff) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // CLEAR ANY EXISTING STALE SESSION FIRST!
    await supabase.auth.signOut();

    const traceId = generateTraceId();
    logger.info('LOGIN_STARTED', { email, traceId });

    try {
      let isAuthenticated = false;
      const formattedEmail = email.trim().toLowerCase();

      // PHASE 3: Attempt Supabase Auth First
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formattedEmail,
        password: password,
      });

      if (!authError && authData.session) {
        isAuthenticated = true;
      }

      // Legacy fallback
      if (formattedEmail === 'gate@school.com' && password === '12345') {
        const mockStaff: Staff = {
          id: 'gate-1',
          email: 'gate@school.com',
          password: '12345',
          name: 'Security Officer',
          role: 'gate_staff'
        };
        logger.info('LOGIN_SUCCESS', { email, traceId });
        showToast('success', 'Logged in successfully!');
        onLogin(mockStaff);
        return;
      }

      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('email', formattedEmail)
        .eq('password', password)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      if (data.is_active === false) {
        throw new Error('Your account has been deactivated. Please contact the administrator.');
      }

      if (data.role !== 'gate_staff' && data.role !== 'gate') {
        throw new Error('Access denied. Only gate staff can login here.');
      }

      // PHASE 3: Fallback verification
      if (!isAuthenticated) {
        isAuthenticated = true;
        // Silent shadow migration: sync password to Supabase Auth
        try {
          const { error: seedError } = await supabase.auth.signInWithPassword({ email: formattedEmail, password: 'Samsidh@123' });
          if (!seedError) await supabase.auth.updateUser({ password: password });
        } catch(e) { /* ignore */ }
      }

      logger.info('LOGIN_SUCCESS', { email, traceId });
      showToast('success', 'Logged in successfully!');
      onLogin(data as Staff);
    } catch (error: any) {
      logger.error('LOGIN_FAILED', { 
        error: error instanceof Error ? error.message : String(error), 
        email, 
        traceId 
      });
      showToast('error', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl shadow-amber-900/20 border border-slate-700">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-6">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <div className="bg-white/95 p-3 rounded-2xl mb-4 shadow-sm">
               <Logo size="md" />
            </div>
            <h1 className="text-2xl font-bold text-white mt-2">Gate Staff Portal</h1>
            <p className="text-slate-400 text-sm mt-1">Authorized security access only</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="gate@school.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-600 rounded-xl bg-slate-700/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={20} />
                  Authenticating...
                </>
              ) : (
                'Gate Staff Login'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

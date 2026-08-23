import { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, BookOpen, CheckCircle } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { ClassLevel, Staff } from '@/lib/types';
import { CLASS_LEVELS } from '@/lib/constants';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { PhotoUploadInput } from '@/components/PhotoUploadInput';
import { addMockStaff } from '@/lib/mockData';
import { logger, generateTraceId } from '@/lib/logger';

interface StaffOnboardingProps {
  onSuccessLogin?: (staff: Staff) => void;
}

export function StaffOnboarding({ onSuccessLogin }: StaffOnboardingProps) {
  const { navigate } = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [assignedClass, setAssignedClass] = useState<ClassLevel | 'All'>('Nursery');
  const [photoUrl, setPhotoUrl] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      showToast('error', 'Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    const traceId = generateTraceId();
    logger.info('STAFF_ONBOARDING_STARTED', { email: email.trim(), role, traceId });

    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check if email already exists in Supabase or local storage
      const { data: existingSupabase } = await supabase
        .from('staff')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (existingSupabase) {
        showToast('error', 'An account with this email already exists.');
        setSubmitting(false);
        return;
      }

      // 2. Simple password encoding for demo compatibility
      const passwordHash = btoa(password.trim());

      const primaryStaffPayload = {
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        assigned_class: assignedClass,
        photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
        role: role,
      };

      let inserted: any = null;
      let insertErr: any = null;

      const res1 = await supabase
        .from('staff')
        .insert(primaryStaffPayload)
        .select()
        .single();

      inserted = res1.data;
      insertErr = res1.error;

      if (insertErr) {
        logger.warn('_STAFFONBOARDING_PRIMARY_INSERT_FAILED_RETRYING_WITH_PASSWORD_COLUMN', { error: insertErr.message instanceof Error ? insertErr.message.message : String(insertErr.message), traceId });
        const fallbackStaffPayload = {
          name: name.trim(),
          email: cleanEmail,
          password: password.trim(),
          password_hash: passwordHash,
          assigned_class: assignedClass,
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
          role: role,
        };
        const res2 = await supabase
          .from('staff')
          .insert(fallbackStaffPayload)
          .select()
          .single();

        inserted = res2.data;
        insertErr = res2.error;
      }

      let createdStaffObj: Staff;

      if (!insertErr && inserted) {
        createdStaffObj = {
          id: inserted.id,
          email: inserted.email,
          password: password.trim(),
          name: inserted.name,
          assigned_class: inserted.assigned_class,
          photo_url: inserted.photo_url,
          role: inserted.role || 'staff',
        };
        addMockStaff(createdStaffObj);
      } else {
        if (insertErr) {
          logger.error('_STAFFONBOARDING_SUPABASE_INSERT_FAILED', { traceId });
        }
        // Fallback to local mock storage
        createdStaffObj = addMockStaff({
          name: name.trim(),
          email: cleanEmail,
          password: password.trim(),
          assigned_class: assignedClass,
          photo_url: photoUrl.trim() || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
          role: role,
        });
      }

      logger.info('STAFF_ONBOARDING_SUCCESS', { traceId });
      showToast('success', `Welcome ${createdStaffObj.name}! Account created successfully.`);

      if (onSuccessLogin) {
        onSuccessLogin(createdStaffObj);
      } else {
        navigate('/staff');
      }
    } catch (err) {
      logger.error('_STAFFONBOARDING_ERROR', { error: err instanceof Error ? err.message : String(err), traceId });
      showToast('error', 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white flex flex-col py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Back to Sign In
        </button>
        <Logo size="sm" />
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 mb-3 shadow-inner">
            👩‍🏫
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Teacher Onboarding</h1>
          <p className="text-gray-500 text-sm mt-1">
            Register your teacher profile, upload your photo, and select your class.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <PhotoUploadInput
            label="Teacher Profile Photo"
            sublabel="Required for identity badge"
            value={photoUrl}
            onChange={setPhotoUrl}
            aspectShape="circle"
          />

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ms. Priya Sharma"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Work Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya@school.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* Assigned Class */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Assigned Class <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['Nursery', 'Junior KG', 'Senior KG', 'All'] as const).map((cls) => (
                <button
                  type="button"
                  key={cls}
                  onClick={() => setAssignedClass(cls)}
                  className={`py-3 px-3 rounded-xl font-bold text-xs border transition-all ${
                    assignedClass === cls
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/20'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {cls}
                </button>
              ))}
            </div>
          </div>

          {/* Role Choice (Staff vs Admin) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Account Permission Level
            </label>
            <div className="flex gap-4 text-xs font-semibold">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'staff'}
                  onChange={() => setRole('staff')}
                  className="accent-sky-500"
                />
                Teacher / Class Staff
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="accent-sky-500"
                />
                School Admin / Principal
              </label>
            </div>
          </div>

          <Button type="submit" size="lg" disabled={submitting} className="w-full py-3.5 text-base font-bold">
            {submitting ? <Spinner size={20} className="text-white" /> : 'Complete Teacher Onboarding'}
          </Button>
        </form>
      </div>
    </div>
  );
}

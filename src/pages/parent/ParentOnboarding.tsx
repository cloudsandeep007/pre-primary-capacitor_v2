import { useState } from 'react';
import { ArrowLeft, User, Phone, KeyRound, Hash, Heart, ShieldCheck, Activity, Mail } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { supabase } from '@/lib/supabase';
import { studentService } from '@/services/studentService';
import { ClassLevel, Student } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { PhotoUploadInput } from '@/components/PhotoUploadInput';
import { addMockStudent } from '@/lib/mockData';
import { logger, generateTraceId } from '@/lib/logger';

interface ParentOnboardingProps {
  onSuccessLogin?: (student: Student) => void;
}

export function ParentOnboarding({ onSuccessLogin }: ParentOnboardingProps) {
  const { navigate } = useRouter();

  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [className, setClassName] = useState<ClassLevel>('Nursery');
  const [guardianName, setGuardianName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [pin, setPin] = useState('1234');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');

  const [studentPhotoUrl, setStudentPhotoUrl] = useState('');
  const [parentPhotoUrl, setParentPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim() || !rollNo.trim() || !guardianName.trim() || !pin.trim()) {
      showToast('error', 'Please fill in all mandatory student and parent details.');
      return;
    }

    if (!studentPhotoUrl.trim() || !parentPhotoUrl.trim()) {
      showToast('error', 'Both Student Photo and Parent/Guardian Photo are mandatory for gate handover security.');
      return;
    }

    setSubmitting(true);
    const cleanRoll = rollNo.trim();
    const traceId = generateTraceId();
    logger.info('PARENT_ONBOARDING_STARTED', { rollNo: cleanRoll, traceId });

    try {
      // 1. Check if student with roll_no exists
      const existingStudent = await studentService.findStudentByRollOrId(cleanRoll);

      if (existingStudent) {
        showToast('error', `Roll #${cleanRoll} is already registered. Please check the roll number.`);
        setSubmitting(false);
        return;
      }

      // 2. Insert into Supabase via service
      const primaryPayload = {
        name: studentName.trim(),
        roll_no: cleanRoll,
        class_name: className,
        pin: pin.trim(),
        guardian_name: guardianName.trim(),
        parent_phone: parentPhone.trim(),
        student_photo_url: studentPhotoUrl.trim(),
        parent_photo_url: parentPhotoUrl.trim(),
        emergency_contact_number: emergencyContact.trim(),
        blood_group: bloodGroup.trim(),
        parent_email: parentEmail.trim(),
      };

      let createdStudentObj = await studentService.createStudent(primaryPayload as any, traceId);

      if (createdStudentObj) {
        // Keep mock storage synchronized
        addMockStudent(createdStudentObj);
      } else {
        logger.error('_PARENTONBOARDING_SUPABASE_INSERT_FAILED', { traceId });
        // Fallback to mock storage
        createdStudentObj = addMockStudent({
          name: studentName.trim(),
          roll_no: cleanRoll,
          pin: pin.trim(),
          class_name: className,
          guardian_name: guardianName.trim(),
          parent_phone: parentPhone.trim(),
          student_photo_url: studentPhotoUrl.trim(),
          parent_photo_url: parentPhotoUrl.trim(),
        });
      }

      logger.info('PARENT_ONBOARDING_SUCCESS', { traceId });
      showToast('success', `Student & Parent Onboarding complete for ${createdStudentObj.name}!`);

      if (onSuccessLogin) {
        onSuccessLogin(createdStudentObj);
      } else {
        navigate('/parent');
      }
    } catch (err) {
      logger.error('_PARENTONBOARDING_ERROR', { error: err instanceof Error ? err.message : String(err), traceId });
      showToast('error', 'Failed to register student and parent details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white flex flex-col py-6 px-4 sm:px-6">
      {/* Top Header */}
      <div className="max-w-xl mx-auto w-full flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/parent')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Back to Parent Sign In
        </button>
        <Logo size="sm" />
      </div>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mb-3 shadow-inner">
            👨‍👩‍👧
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Parent & Student Onboarding</h1>
          <p className="text-gray-500 text-sm mt-1">
            Fill child & parent details with mandatory photos for gate handover verification.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos Banner Security Warning */}
          <div className="bg-amber-50/80 border border-amber-200 text-amber-900 rounded-2xl p-4 flex items-start gap-3 text-xs">
            <ShieldCheck size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 mb-0.5">Mandatory Visual Verification Photos</p>
              <p className="text-amber-700">
                School gate staff will cross-verify the parent photo and student photo side-by-side when handing over your child.
              </p>
            </div>
          </div>

          {/* Student Photo Upload */}
          <PhotoUploadInput
            label="Student / Child Photo"
            sublabel="Mandatory"
            value={studentPhotoUrl}
            onChange={setStudentPhotoUrl}
            required
            aspectShape="circle"
          />

          {/* Parent Photo Upload */}
          <PhotoUploadInput
            label="Parent / Authorized Pickup Photo"
            sublabel="Mandatory for handover"
            value={parentPhotoUrl}
            onChange={setParentPhotoUrl}
            required
            aspectShape="square"
          />

          {/* Student Details Section */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <Heart size={14} /> Student Details
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Roll Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    placeholder="e.g. 104"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Class Grade <span className="text-rose-500">*</span>
                </label>
                <select
                  value={className}
                  onChange={(e) => setClassName(e.target.value as ClassLevel)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium bg-white"
                >
                  <option value="Nursery">Nursery</option>
                  <option value="Junior KG">Junior KG</option>
                  <option value="Senior KG">Senior KG</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Blood Group
                </label>
                <div className="relative">
                  <Activity size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium bg-white"
                  >
                    <option value="">Select (Optional)</option>
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Emergency Contact Number
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="+91 98765 00000"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Parent Details Section */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
              <User size={14} /> Parent / Guardian Details
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Parent / Guardian Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  4-Digit Parent Portal PIN <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm font-mono font-bold tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 mt-4">
                System Role <span className="text-gray-400 font-normal">(Read-only)</span>
              </label>
              <div className="relative">
                <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value="Parent"
                  disabled
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 outline-none text-sm font-medium cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base shadow-md shadow-teal-500/20"
          >
            {submitting ? <Spinner size={20} className="text-white" /> : 'Complete Parent Onboarding'}
          </Button>
        </form>
      </div>
    </div>
  );
}

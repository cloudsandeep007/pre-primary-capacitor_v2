import { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, Clock, RefreshCw, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Student, GatePass } from '@/lib/types';
import { Button } from '@/components/Button';
import { QRCodeCanvas } from '@/components/QRCodeCanvas';
import { createOrGetMockGatePass, getMockGatePasses } from '@/lib/mockData';

interface ParentGatePassModalProps {
  student: Student;
  onClose: () => void;
}

export function ParentGatePassModal({ student, onClose }: ParentGatePassModalProps) {
  const [pass, setPass] = useState<GatePass | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrCreatePass();

    // Auto-poll every 2 seconds for real-time status updates
    const interval = setInterval(() => {
      fetchOrCreatePass(true);
    }, 2000);

    const handleUpdate = () => fetchOrCreatePass(true);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('gate_pass_updated', handleUpdate);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('gate_pass_channel');
      bc.onmessage = () => fetchOrCreatePass(true);
    } catch (e) {
      // BroadcastChannel fallback
    }

    const channel = supabase
      .channel(`public:gate_pass_modal_${student.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gate_passes' }, () => {
        fetchOrCreatePass(true);
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('gate_pass_updated', handleUpdate);
      if (bc) bc.close();
      supabase.removeChannel(channel);
    };
  }, [student.id, student.roll_no]);

  const fetchOrCreatePass = async (silent = false) => {
    if (!silent) setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      // 1. Fetch latest pass for today from Supabase
      const { data, error } = await supabase
        .from('gate_passes')
        .select('*')
        .or(`student_id.eq.${student.id},roll_no.eq.${student.roll_no}`)
        .eq('pass_date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        setPass(data[0] as GatePass);
      } else {
        // Fallback to local mock pass
        const mockPass = createOrGetMockGatePass(student);
        setPass(mockPass);

        // Try creating in Supabase if completely missing
        if (!data || data.length === 0) {
          const newPassData = {
            student_id: student.id,
            roll_no: student.roll_no,
            student_name: student.name,
            class_name: student.class_name,
            status: 'PENDING',
            pass_date: today,
          };

          const { data: created } = await supabase
            .from('gate_passes')
            .insert(newPassData)
            .select();

          if (created && created.length > 0) {
            setPass(created[0] as GatePass);
          }
        }
      }
    } catch (err) {
      console.warn('[ParentGatePassModal] Fallback to local mock gate pass');
      setPass(createOrGetMockGatePass(student));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const qrPayload = pass
    ? JSON.stringify({
        type: 'PRESCHOOL_GATE_PASS',
        pass_id: pass.id,
        roll_no: student.roll_no,
        student_id: student.id,
        student_name: student.name,
        class_name: student.class_name,
      })
    : '';

  const pickupTimeStr = pass?.pickup_time
    ? new Date(pass.pickup_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              🎫
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Digital Gate Pass</h2>
              <p className="text-xs text-gray-500">Show to school gate attendant for pickup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5 text-center">
          {/* Student Profile Summary Card */}
          <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg shadow-teal-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-wider uppercase bg-white/20 px-2.5 py-0.5 rounded-full">
                Samsidh International School
              </span>
              <span className="text-xs font-semibold bg-emerald-400/30 px-2 py-0.5 rounded-md">
                {student.class_name}
              </span>
            </div>
            <div className="flex items-center gap-3 text-left pt-2">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg text-white border-2 border-white/40">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">{student.name}</h3>
                <p className="text-xs text-emerald-100 font-medium">Roll #{student.roll_no}</p>
              </div>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 flex flex-col items-center">
            {loading ? (
              <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                <RefreshCw size={28} className="animate-spin text-teal-500" />
              </div>
            ) : pass ? (
              <>
                <QRCodeCanvas value={qrPayload} size={210} className="mb-3" />
                <p className="text-xs text-slate-500 font-medium">
                  Scan code at school exit gate
                </p>
              </>
            ) : (
              <p className="text-sm text-rose-500">Could not generate gate pass.</p>
            )}
          </div>

          {/* Status Banner */}
          {pass && (
            <div className="rounded-2xl p-4 text-left border transition-all">
              {pass.status === 'COMPLETED' ? (
                <div className="bg-emerald-50 border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-start gap-3">
                  <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-900">Child Handed Over Successfully</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Picked up at <span className="font-semibold">{pickupTimeStr || 'Today'}</span>
                    </p>
                    {pass.approved_by_staff && (
                      <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                        <UserCheck size={14} /> Verified by Staff: <span className="font-bold">{pass.approved_by_staff}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-3">
                  <Clock size={22} className="text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-900">Gate Pass Active & Pending Pickup</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Show this screen to the gate attendant when receiving your child.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 flex gap-3 rounded-b-3xl">
          <Button variant="secondary" onClick={() => fetchOrCreatePass()} className="w-full">
            <RefreshCw size={16} className="mr-1.5" /> Refresh Status
          </Button>
          <Button onClick={onClose} className="w-full">
            Close Pass
          </Button>
        </div>
      </div>
    </div>
  );
}

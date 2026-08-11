import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, Search, CheckCircle2, UserCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Staff, Student, GatePass } from '@/lib/types';
import { Button } from '@/components/Button';
import { showToast } from '@/components/Toast';
import { completeMockGatePass, getMockStudents } from '@/lib/mockData';

interface StaffQRScannerModalProps {
  staff: Staff;
  onClose: () => void;
}

export function StaffQRScannerModal({ staff, onClose }: StaffQRScannerModalProps) {
  const [manualRoll, setManualRoll] = useState('');
  const [scannedResult, setScannedResult] = useState<GatePass | null>(null);
  const [matchedStudent, setMatchedStudent] = useState<Student | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleScannedQrPayload(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('[StaffQRScannerModal] Camera scanner start failed:', err);
      setCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('[StaffQRScannerModal] Camera stop error:', err);
      }
    }
  };

  const handleScannedQrPayload = async (payloadStr: string) => {
    try {
      let rollNo = payloadStr.trim();
      let passId = '';
      try {
        const parsed = JSON.parse(payloadStr);
        if (parsed.roll_no) rollNo = parsed.roll_no;
        if (parsed.pass_id) passId = parsed.pass_id;
      } catch (e) {
        // payload is plain roll number string
      }

      await lookupStudentAndPass(rollNo, passId);
      stopScanner();
    } catch (err) {
      showToast('error', 'Invalid QR code payload.');
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoll.trim()) {
      showToast('error', 'Please enter a roll number.');
      return;
    }
    lookupStudentAndPass(manualRoll.trim());
    stopScanner();
  };

  const lookupStudentAndPass = async (rollNoStr: string, passId?: string) => {
    setProcessing(true);
    const cleanRoll = rollNoStr.trim();
    const today = new Date().toISOString().split('T')[0];
    try {
      // 1. Fetch student safely by UUID or roll_no / roll_number
      let studentData: any = null;
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanRoll);

      if (isUuid) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('id', cleanRoll)
          .maybeSingle();
        if (data) studentData = data;
      }

      if (!studentData) {
        let res = await supabase
          .from('students')
          .select('*')
          .or(`roll_no.eq.${cleanRoll},roll_number.eq.${cleanRoll}`)
          .maybeSingle();

        if (res.error || !res.data) {
          res = await supabase
            .from('students')
            .select('*')
            .eq('roll_no', cleanRoll)
            .maybeSingle();
        }

        if (res.error || !res.data) {
          res = await supabase
            .from('students')
            .select('*')
            .eq('roll_number', cleanRoll)
            .maybeSingle();
        }

        if (!res.error && res.data) {
          studentData = res.data;
        }
      }

      let targetStudent: Student | null = null;
      if (studentData) {
        targetStudent = {
          id: studentData.id || String(studentData.roll_no || studentData.roll_number),
          roll_no: String(studentData.roll_no || studentData.roll_number || cleanRoll),
          pin: String(studentData.pin || '1234'),
          name: studentData.name || 'Student',
          class_name: studentData.class_name || studentData.class || 'Nursery',
          guardian_name: studentData.guardian_name,
          parent_phone: studentData.parent_phone,
          student_photo_url: studentData.student_photo_url,
          parent_photo_url: studentData.parent_photo_url,
        };
      } else {
        targetStudent = getMockStudents().find((s) => s.roll_no === cleanRoll || s.id === cleanRoll) || null;
      }

      if (!targetStudent) {
        showToast('error', `No student found with Roll #${cleanRoll}`);
        setProcessing(false);
        return;
      }

      setMatchedStudent(targetStudent);

      // 2. Fetch pass from Supabase (latest for today)
      const { data: passesData } = await supabase
        .from('gate_passes')
        .select('*')
        .or(`roll_no.eq.${cleanRoll},student_id.eq.${targetStudent.id}`)
        .eq('pass_date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (passesData && passesData.length > 0) {
        setScannedResult(passesData[0] as GatePass);
      } else {
        // Fallback pass state
        setScannedResult({
          id: passId || `pass-${Date.now()}`,
          student_id: targetStudent.id,
          roll_no: targetStudent.roll_no,
          student_name: targetStudent.name,
          class_name: targetStudent.class_name,
          status: 'PENDING',
          pass_date: today,
          created_at: new Date().toISOString(),
          student_photo_url: targetStudent.student_photo_url,
          parent_photo_url: targetStudent.parent_photo_url,
        });
      }
    } catch (err) {
      console.warn('[StaffQRScannerModal] Search exception fallback');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveHandover = async () => {
    if (!matchedStudent || !scannedResult) return;

    setProcessing(true);
    const nowIso = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Always update local storage (never duplicate)
    completeMockGatePass(scannedResult.id || matchedStudent.roll_no, staff.name);

    // Sync to Supabase — strict UPDATE first, INSERT only if no record exists
    try {
      // Find the real DB id (prefer the scannedResult's id if it's a real UUID)
      let existingId: string | undefined =
        scannedResult.id && !scannedResult.id.startsWith('pass-') ? scannedResult.id : undefined;

      if (!existingId) {
        const { data: existingRows } = await supabase
          .from('gate_passes')
          .select('id')
          .or(`roll_no.eq.${matchedStudent.roll_no},student_id.eq.${matchedStudent.id}`)
          .eq('pass_date', today)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingRows && existingRows.length > 0) {
          existingId = existingRows[0].id;
        }
      }

      const updateFields = {
        status: 'COMPLETED',
        pickup_time: nowIso,
        approved_by_staff: staff.name,
        student_photo_url: matchedStudent.student_photo_url,
        parent_photo_url: matchedStudent.parent_photo_url,
      };

      if (existingId) {
        // Strict UPDATE — no new row created
        const { error } = await supabase
          .from('gate_passes')
          .update(updateFields)
          .eq('id', existingId);
        if (error) console.warn('[StaffQRScannerModal] UPDATE error:', error.message);
      } else {
        // First scan of the day — INSERT a completed record
        const { error } = await supabase.from('gate_passes').insert({
          student_id: matchedStudent.id,
          roll_no: matchedStudent.roll_no,
          student_name: matchedStudent.name,
          class_name: matchedStudent.class_name,
          pass_date: today,
          ...updateFields,
        });
        if (error) console.warn('[StaffQRScannerModal] INSERT error:', error.message);
      }
    } catch (err) {
      console.warn('[StaffQRScannerModal] Supabase sync exception');
    }

    setScannedResult((prev) =>
      prev ? { ...prev, status: 'COMPLETED', pickup_time: nowIso, approved_by_staff: staff.name } : null
    );

    try {
      const bc = new BroadcastChannel('gate_pass_channel');
      bc.postMessage({ type: 'GATE_PASS_UPDATED', student_id: matchedStudent.id, roll_no: matchedStudent.roll_no });
      bc.close();
    } catch (e) { /* fallback */ }

    window.dispatchEvent(new Event('gate_pass_updated'));
    window.dispatchEvent(new Event('storage'));
    showToast('success', `✅ Handover approved for ${matchedStudent.name}!`);
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Mobile handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              📷
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-base">Gate Pass Scanner</h2>
              <p className="text-xs text-gray-500">Scan QR Code or enter Roll # to verify child pickup</p>
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
        <div className="px-5 py-5 space-y-5">
          {!scannedResult ? (
            <>
              {/* Camera Scanner Container */}
              <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-inner border border-slate-800 relative min-h-[260px] flex items-center justify-center">
                <div id="qr-reader-container" className="w-full h-full" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-900/90">
                    <Camera size={36} className="text-sky-400 mb-2" />
                    <p className="text-sm font-semibold text-white">Camera Offline / Restricted</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Please use the Roll # lookup input below to verify the gate pass manually.
                    </p>
                  </div>
                )}
              </div>

              {/* Manual Roll Number Search Form */}
              <form onSubmit={handleManualSearch} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  🔍 Manual Roll Number Search
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualRoll}
                    onChange={(e) => setManualRoll(e.target.value)}
                    placeholder="Enter Roll # (e.g. 101)..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-sky-400 outline-none text-sm font-semibold"
                  />
                  <Button type="submit" disabled={processing} className="flex-shrink-0">
                    <Search size={16} className="mr-1" /> Find Student
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* Scanned Student Result Card */
            <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-gradient-to-br from-sky-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-sky-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase bg-white/20 px-2.5 py-0.5 rounded-full">
                    Student Verified
                  </span>
                  <span className="text-xs font-bold bg-white text-sky-700 px-2.5 py-0.5 rounded-md">
                    {matchedStudent?.class_name}
                  </span>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 overflow-hidden border-2 border-white/40 flex items-center justify-center font-bold text-2xl text-white flex-shrink-0">
                    {matchedStudent?.student_photo_url ? (
                      <img src={matchedStudent.student_photo_url} alt={matchedStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      matchedStudent?.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-xl leading-tight">{matchedStudent?.name}</h3>
                    <p className="text-sm text-sky-100 font-medium">Roll #{matchedStudent?.roll_no}</p>
                    {matchedStudent?.guardian_name && (
                      <p className="text-xs text-sky-100/90 mt-0.5">Parent: {matchedStudent.guardian_name}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Handover Photo Identity Verification */}
              <div className="bg-sky-50/80 border border-sky-100 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-sky-800 mb-3 flex items-center justify-between">
                  <span>📸 Handover Identity Verification</span>
                  <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full">Required</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-sm flex flex-col items-center">
                    <p className="text-[11px] font-bold text-gray-600 mb-1.5">Child Picture</p>
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 mb-1">
                      {matchedStudent?.student_photo_url ? (
                        <img src={matchedStudent.student_photo_url} alt="Child" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">👶</div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 truncate w-full">{matchedStudent?.name}</span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-sm flex flex-col items-center">
                    <p className="text-[11px] font-bold text-gray-600 mb-1.5">Parent / Pickup Picture</p>
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 mb-1">
                      {matchedStudent?.parent_photo_url ? (
                        <img src={matchedStudent.parent_photo_url} alt="Parent" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl">👨‍👩‍👧</div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 truncate w-full">{matchedStudent?.guardian_name || 'Authorized Parent'}</span>
                  </div>
                </div>
              </div>

              {/* Status & Action */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                {scannedResult.status === 'COMPLETED' ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-base text-emerald-900">Child Handover Completed</h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        Already approved by <span className="font-bold">{scannedResult.approved_by_staff || staff.name}</span>
                      </p>
                      {scannedResult.pickup_time && (
                        <p className="text-xs text-emerald-600 mt-0.5 font-medium">
                          Timestamp: {new Date(scannedResult.pickup_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 flex items-start gap-3">
                      <ShieldCheck size={22} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-sm text-amber-900">Gate Pass Active for Pickup</h4>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Verify parent photo matched before clicking handover approval.
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={handleApproveHandover}
                      disabled={processing}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-base shadow-md shadow-emerald-500/20"
                    >
                      <UserCheck size={20} className="mr-2" /> Approve & Hand Over Child
                    </Button>
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={() => {
                  setScannedResult(null);
                  setMatchedStudent(null);
                  startScanner();
                }}
                className="w-full"
              >
                Scan Another Pass
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 flex gap-3 rounded-b-3xl">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Close Scanner
          </Button>
        </div>
      </div>
    </div>
  );
}

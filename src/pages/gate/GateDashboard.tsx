import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '@/lib/supabase';
import { Staff, Student, GatePass } from '@/lib/types';
import { Button } from '@/components/Button';
import { showToast } from '@/components/Toast';
import { completeMockGatePass, getMockStudents } from '@/lib/mockData';
import { Logo } from '@/components/Logo';
import { Camera, Search, CheckCircle2, UserCheck, ShieldCheck, LogOut } from 'lucide-react';

interface GateDashboardProps {
  staff: Staff;
  onLogout: () => void;
}

export function GateDashboard({ staff, onLogout }: GateDashboardProps) {
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
    if (scannedResult) return;
    try {
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScannedQrPayload(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );
      setCameraActive(true);
    } catch (err) {
      console.warn('[GateDashboard] Camera scanner start failed:', err);
      setCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('[GateDashboard] Camera stop error:', err);
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
        startScanner();
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
      console.warn('[GateDashboard] Search exception fallback');
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
        const { error } = await supabase
          .from('gate_passes')
          .update(updateFields)
          .eq('id', existingId);
        if (error) console.warn('[GateDashboard] UPDATE error:', error.message);
      } else {
        const { error } = await supabase.from('gate_passes').insert({
          student_id: matchedStudent.id,
          roll_no: matchedStudent.roll_no,
          student_name: matchedStudent.name,
          class_name: matchedStudent.class_name,
          pass_date: today,
          ...updateFields,
        });
        if (error) console.warn('[GateDashboard] INSERT error:', error.message);
      }
    } catch (err) {
      console.warn('[GateDashboard] Supabase sync exception');
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

  const handleScanNext = () => {
    setScannedResult(null);
    setMatchedStudent(null);
    setManualRoll('');
    setTimeout(startScanner, 100);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="bg-white p-2 rounded-xl shadow-sm">
           <Logo size="sm" />
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-slate-200 font-medium">{staff.name}</p>
            <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">Gate Security</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
          
          {!scannedResult ? (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">Scan Gate Pass</h2>
                <p className="text-slate-400 text-sm">Align the student's QR code within the frame</p>
              </div>

              {/* Scanner */}
              <div className="bg-slate-900 rounded-3xl overflow-hidden border-2 border-slate-700 relative min-h-[300px] flex items-center justify-center">
                <div id="qr-reader-container" className="w-full h-full" />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400 bg-slate-900/90 z-10">
                    <Camera size={48} className="text-amber-500 mb-4" />
                    <p className="text-lg font-semibold text-white">Camera Access Required</p>
                    <p className="text-sm text-slate-400 mt-2">
                      Please allow camera permissions or use manual lookup.
                    </p>
                  </div>
                )}
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-slate-700"></div>
              </div>

              {/* Manual Entry */}
              <form onSubmit={handleManualSearch}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Manual Roll Number Entry
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualRoll}
                    onChange={(e) => setManualRoll(e.target.value)}
                    placeholder="Enter Roll #..."
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-600 bg-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <Button 
                    type="submit" 
                    disabled={processing}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white border-0 shadow-lg shadow-amber-900/20"
                  >
                    <Search size={18} className="mr-2" /> Find
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="p-6">
              {scannedResult.status === 'COMPLETED' ? (
                /* Success State */
                <div className="text-center py-8 space-y-6">
                  <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 size={48} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-emerald-400 mb-2">Handover Complete</h2>
                    <p className="text-slate-300 text-lg font-medium">{matchedStudent?.name}</p>
                    <p className="text-slate-400">Class: {matchedStudent?.class_name}</p>
                    {scannedResult.pickup_time && (
                      <p className="text-slate-500 text-sm mt-4">
                        Approved at: {new Date(scannedResult.pickup_time).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <div className="pt-6">
                    <Button
                      onClick={handleScanNext}
                      className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white text-lg font-semibold border-0"
                    >
                      Scan Next Student
                    </Button>
                  </div>
                </div>
              ) : (
                /* Handover Approval State */
                <div className="space-y-6 animate-[fadeIn_0.2s_ease-out]">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-white mb-2">Verify Handover</h2>
                    <p className="text-slate-400">Check photos before approving</p>
                  </div>

                  <div className="bg-slate-700/50 border border-slate-600 rounded-2xl p-5 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-800 overflow-hidden border border-slate-600 flex-shrink-0">
                        {matchedStudent?.student_photo_url ? (
                          <img src={matchedStudent.student_photo_url} alt="Student" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👶</div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-white">{matchedStudent?.name}</h3>
                        <p className="text-amber-500 font-medium mt-1">{matchedStudent?.class_name} • Roll #{matchedStudent?.roll_no}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-xl text-center shadow-inner">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">Child Photo</p>
                      <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden bg-slate-800 border border-slate-600">
                        {matchedStudent?.student_photo_url ? (
                          <img src={matchedStudent.student_photo_url} alt="Child" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">👶</div>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600 p-4 rounded-xl text-center shadow-inner">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-3">Parent Photo</p>
                      <div className="w-24 h-24 mx-auto rounded-xl overflow-hidden bg-slate-800 border border-slate-600">
                        {matchedStudent?.parent_photo_url ? (
                          <img src={matchedStudent.parent_photo_url} alt="Parent" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">👨‍👩‍👧</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3">
                    <ShieldCheck className="text-amber-500 flex-shrink-0 mt-0.5" size={24} />
                    <p className="text-amber-200/90 text-sm leading-relaxed">
                      Please visually verify the parent matches the authorized photo before handing over the child.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 pt-4 border-t border-slate-700">
                    <Button
                      onClick={handleApproveHandover}
                      disabled={processing}
                      className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-lg shadow-lg shadow-emerald-900/20 border-0"
                    >
                      <UserCheck size={24} className="mr-2" /> Confirm Handover
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleScanNext}
                      className="w-full py-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl"
                    >
                      Cancel & Go Back
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

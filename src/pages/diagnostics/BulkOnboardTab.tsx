import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { studentService } from '@/services/studentService';
import { supabase } from '@/lib/supabase';
import { rbacService } from '@/services/rbacService';
import { logger } from '@/lib/logger';

type UploadType = 'student' | 'staff';

interface LogItem {
  status: 'success' | 'error';
  message: string;
}

export function BulkOnboardTab() {
  const [uploadType, setUploadType] = useState<UploadType>('student');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setLogs([{ status: 'success', message: `Started parsing ${file.name}...` }]);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        throw new Error("File must contain a header row and at least one data row.");
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const roles = uploadType === 'staff' ? await rbacService.fetchRoles() : [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || '';
        });

        if (uploadType === 'student') {
          // Process student
          const payload = {
            name: row.name,
            roll_no: row.roll_no,
            class_name: row.class_name,
            pin: row.pin || '1234',
            guardian_name: row.guardian_name,
            parent_phone: row.parent_phone,
            parent_email: row.parent_email,
            blood_group: row.blood_group,
            emergency_contact_number: row.emergency_contact_number,
          };

          try {
            if (!payload.name || !payload.roll_no) throw new Error("Missing name or roll_no");
            await studentService.createStudent(payload as any);
            setLogs(prev => [...prev, { status: 'success', message: `Row ${i}: Successfully created student ${payload.name}` }]);
          } catch (err: any) {
            setLogs(prev => [...prev, { status: 'error', message: `Row ${i} (${payload.name || 'Unknown'}): ${err.message}` }]);
          }
        } else {
          // Process staff
          const payload = {
            name: row.name,
            email: row.email,
            password: row.password || 'password123',
            employee_id: row.employee_id,
            role_name: row.role_name,
          };

          try {
            if (!payload.name || !payload.email) throw new Error("Missing name or email");
            
            // Basic insert
            const passwordHash = btoa(payload.password);
            const { data, error } = await supabase.from('staff').insert({
              name: payload.name,
              email: payload.email,
              password_hash: passwordHash,
              employee_id: payload.employee_id || null
            }).select().single();

            if (error) throw error;

            if (data && payload.role_name) {
              const matchedRole = roles.find(r => r.name.toLowerCase() === payload.role_name.toLowerCase());
              if (matchedRole) {
                await rbacService.assignUserRole(data.id, matchedRole.id);
              } else {
                setLogs(prev => [...prev, { status: 'error', message: `Row ${i}: Created staff but role '${payload.role_name}' not found.` }]);
              }
            }

            setLogs(prev => [...prev, { status: 'success', message: `Row ${i}: Successfully created staff ${payload.name}` }]);
          } catch (err: any) {
            setLogs(prev => [...prev, { status: 'error', message: `Row ${i} (${payload.name || 'Unknown'}): ${err.message}` }]);
          }
        }
      }
    } catch (err: any) {
      setLogs(prev => [...prev, { status: 'error', message: `Fatal Error: ${err.message}` }]);
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Upload className="text-violet-400" /> Bulk Onboarding
        </h2>
        <p className="text-slate-400 text-sm mt-1">Upload CSV files to onboard multiple students/parents or staff members at once.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2 text-slate-200 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer border border-slate-700">
          <input 
            type="radio" 
            checked={uploadType === 'student'} 
            onChange={() => setUploadType('student')}
            className="accent-violet-500"
          />
          Student & Parent
        </label>
        <label className="flex items-center gap-2 text-slate-200 bg-slate-800 px-4 py-2 rounded-lg cursor-pointer border border-slate-700">
          <input 
            type="radio" 
            checked={uploadType === 'staff'} 
            onChange={() => setUploadType('staff')}
            className="accent-violet-500"
          />
          Staff Member
        </label>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <FileText size={16} className="text-sky-400" /> CSV Format Requirements
        </h3>
        {uploadType === 'student' ? (
          <div className="text-sm text-slate-300 font-mono bg-slate-900 p-3 rounded border border-slate-800 overflow-x-auto">
            name, roll_no, class_name, pin, guardian_name, parent_phone, parent_email, blood_group, emergency_contact_number<br/>
            John Doe, 105, Nursery, 1234, Jane Doe, 9876543210, jane@example.com, O+, 9876543211
          </div>
        ) : (
          <div className="text-sm text-slate-300 font-mono bg-slate-900 p-3 rounded border border-slate-800 overflow-x-auto">
            name, email, password, employee_id, role_name<br/>
            Alice Smith, alice@school.com, pass123, EMP-001, Teacher
          </div>
        )}
      </div>

      <div className="relative">
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isProcessing}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center flex flex-col items-center justify-center bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin text-violet-400 mb-2" size={32} />
              <p className="text-slate-300 font-medium">Processing CSV...</p>
            </>
          ) : (
            <>
              <Upload className="text-slate-400 mb-2" size={32} />
              <p className="text-slate-300 font-medium">Click or drag CSV file here</p>
              <p className="text-slate-500 text-sm mt-1">Make sure headers match exactly</p>
            </>
          )}
        </div>
      </div>

      {logs.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-h-64 overflow-y-auto space-y-2 mt-6">
          <h4 className="font-semibold text-slate-200 mb-3 sticky top-0 bg-slate-900 py-1">Process Logs</h4>
          {logs.map((log, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm ${log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {log.status === 'success' ? <CheckCircle size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
              <span className="break-all">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

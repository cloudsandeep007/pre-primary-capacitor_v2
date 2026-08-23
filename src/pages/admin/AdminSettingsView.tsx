import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldAlert } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { showToast } from '@/components/Toast';
import { settingsService, SchoolSetting } from '@/services/settingsService';

export function AdminSettingsView() {
  const { can } = usePermissions();
  const [settings, setSettings] = useState<SchoolSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [academicYear, setAcademicYear] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [currency, setCurrency] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await settingsService.fetchAllSettings();
    setSettings(data);
    
    // Parse JSONB values
    data.forEach(s => {
      const val = typeof s.setting_value === 'string' ? s.setting_value.replace(/"/g, '') : s.setting_value;
      if (s.setting_key === 'academic_year') setAcademicYear(val);
      if (s.setting_key === 'school_name') setSchoolName(val);
      if (s.setting_key === 'currency') setCurrency(val);
    });
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can('settings.write')) {
      showToast('error', 'You do not have permission to modify settings.');
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        settingsService.updateSetting('academic_year', JSON.stringify(academicYear)),
        settingsService.updateSetting('school_name', JSON.stringify(schoolName)),
        settingsService.updateSetting('currency', JSON.stringify(currency))
      ]);
      showToast('success', 'Settings saved successfully');
    } catch (error) {
      showToast('error', 'Failed to save settings');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage global school configurations and preferences</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-2xl">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <Settings className="text-indigo-600" size={24} />
          <h2 className="text-lg font-bold text-slate-800">Global Configuration</h2>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">School Name</label>
              <input
                type="text"
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                disabled={!can('settings.write')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Official name used in reports and portals.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Active Academic Year</label>
              <select
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                disabled={!can('settings.write')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2027-2028">2027-2028</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">This governs fee generation, attendance, and admissions.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Default Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                disabled={!can('settings.write')}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Currency used across the Fee Tracking module.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {!can('settings.write') ? (
              <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold bg-rose-50 px-3 py-2 rounded-lg">
                <ShieldAlert size={16} /> Write permission required
              </div>
            ) : (
              <div /> // spacer
            )}
            
            <button
              type="submit"
              disabled={saving || !can('settings.write')}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-sm transition-colors"
            >
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

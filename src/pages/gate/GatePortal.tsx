import { useState } from 'react';
import { GateLogin } from './GateLogin';
import { GateDashboard } from './GateDashboard';
import { Staff } from '@/lib/types';

export function GatePortal() {
  const [gateStaff, setGateStaff] = useState<Staff | null>(null);
  
  if (!gateStaff) return <GateLogin onLogin={setGateStaff} />;
  
  return <GateDashboard staff={gateStaff} onLogout={() => setGateStaff(null)} />;
}

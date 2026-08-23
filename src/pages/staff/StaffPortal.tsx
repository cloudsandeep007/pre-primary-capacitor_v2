import { useState } from 'react';
import { Staff } from '@/lib/types';
import { StaffLogin } from './StaffLogin';
import { StaffDashboard } from './StaffDashboard';
import { supabase } from '@/lib/supabase';

export function StaffPortal() {
  const [staff, setStaff] = useState<Staff | null>(null);

  if (!staff) {
    return <StaffLogin onLogin={setStaff} />;
  }

  return (
    <StaffDashboard 
      staff={staff} 
      onLogout={async () => {
        await supabase.auth.signOut();
        setStaff(null);
      }} 
    />
  );
}

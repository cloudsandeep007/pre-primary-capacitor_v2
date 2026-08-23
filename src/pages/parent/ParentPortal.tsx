import { useState, useEffect } from 'react';
import { Student } from '@/lib/types';
import { ParentLogin } from './ParentLogin';
import { ParentFeed } from './ParentFeed';
import { notificationService } from '@/services/notificationService';
import { generateTraceId } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export function ParentPortal() {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (student) {
      const traceId = generateTraceId();
      notificationService.setupPushNotifications(student.id, traceId);
    }
  }, [student]);

  if (!student) {
    return <ParentLogin onLogin={setStudent} />;
  }

  return (
    <ParentFeed 
      student={student} 
      onLogout={async () => {
        await supabase.auth.signOut();
        setStudent(null);
      }} 
    />
  );
}

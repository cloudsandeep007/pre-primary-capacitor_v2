import { useState, useEffect } from 'react';
import { Student } from '@/lib/types';
import { ParentLogin } from './ParentLogin';
import { ParentFeed } from './ParentFeed';
import { setupPushNotifications } from '@/lib/pushNotifications';

export function ParentPortal() {
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (student) {
      setupPushNotifications(student.id);
    }
  }, [student]);

  if (!student) {
    return <ParentLogin onLogin={setStudent} />;
  }

  return <ParentFeed student={student} onLogout={() => setStudent(null)} />;
}

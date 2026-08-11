import { useState } from 'react';
import { Student } from '@/lib/types';
import { ParentLogin } from './ParentLogin';
import { ParentFeed } from './ParentFeed';

export function ParentPortal() {
  const [student, setStudent] = useState<Student | null>(null);

  if (!student) {
    return <ParentLogin onLogin={setStudent} />;
  }

  return <ParentFeed student={student} onLogout={() => setStudent(null)} />;
}

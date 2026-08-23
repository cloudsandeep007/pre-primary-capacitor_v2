import { Staff, Student, DailyLog, GatePass } from './types';

export const DEMO_STAFF: Staff[] = [
  {
    id: 'staff-1',
    email: 'teacher@school.com',
    password: 'teacher123',
    name: 'Ms. Priya',
    assigned_class: 'Nursery',
    photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
    role: 'staff',
  },
  {
    id: 'staff-2',
    email: 'lkg@school.com',
    password: 'teacher123',
    name: 'Mrs. Sunita',
    assigned_class: 'Junior KG',
    photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
    role: 'staff',
  },
  {
    id: 'staff-3',
    email: 'ukg@school.com',
    password: 'teacher123',
    name: 'Mr. Ramesh',
    assigned_class: 'Senior KG',
    photo_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80',
    role: 'staff',
  },
  {
    id: 'staff-4',
    email: 'admin@school.com',
    password: 'admin123',
    name: 'Principal Sharma',
    assigned_class: 'All',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80',
    role: 'admin',
  },
  {
    id: 'staff-5',
    email: 'raj@school.com',
    password: '12345',
    name: 'Raj',
    assigned_class: 'Nursery',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80',
    role: 'staff',
  },
];

export const DEMO_STUDENTS: Student[] = [
  {
    id: 'stud-1',
    roll_no: '101',
    pin: '1234',
    name: 'Aarav Sharma',
    class_name: 'Nursery',
    guardian_name: 'Rahul Sharma',
    parent_phone: '+91 98765 43210',
    student_photo_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80',
    parent_photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
  },
  {
    id: 'stud-2',
    roll_no: '102',
    pin: '1234',
    name: 'Diya Patel',
    class_name: 'Junior KG',
    guardian_name: 'Meera Patel',
    parent_phone: '+91 98765 12345',
    student_photo_url: 'https://images.unsplash.com/photo-1595454038955-498d87741763?w=400&q=80',
    parent_photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  },
  {
    id: 'stud-3',
    roll_no: '103',
    pin: '1234',
    name: 'Kabir Singh',
    class_name: 'Senior KG',
    guardian_name: 'Anita Singh',
    parent_phone: '+91 98765 67890',
    student_photo_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80',
    parent_photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80',
  },
  {
    id: 'stud-4',
    roll_no: '105',
    pin: '1234',
    name: 'Avyaan',
    class_name: 'Nursery',
    guardian_name: 'Suresh Kumar',
    parent_phone: '+91 98765 99999',
    student_photo_url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=400&q=80',
    parent_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  },
];

const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

export const DEMO_LOGS: DailyLog[] = [
  {
    id: 'log-1',
    student_id: 'stud-1',
    staff_name: 'Ms. Priya',
    meal_status: 'finished',
    nap_time: '30min',
    mood: 'happy',
    teacher_notes: 'Had a wonderful day! Enjoyed finger painting and shared toys with friends.',
    photo_url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80',
    media_items: [
      {
        url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&q=80',
        type: 'image',
        name: 'Finger painting activity',
      },
      {
        url: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80',
        type: 'image',
        name: 'Building blocks time',
      },
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        type: 'video',
        name: 'Storytime Video Clip',
      },
    ],
    log_date: today,
    created_at: new Date().toISOString(),
  },
];

const STORAGE_KEYS = {
  STAFF: 'samsidh_mock_staff_v7',
  STUDENTS: 'samsidh_mock_students_v7',
  LOGS: 'samsidh_mock_logs_v7',
  GATE_PASSES: 'samsidh_mock_gate_passes_v7',
};

export function initMockStorage() {
  const existingStaffStr = localStorage.getItem(STORAGE_KEYS.STAFF);
  if (!existingStaffStr || !existingStaffStr.includes('photo_url')) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEMO_STAFF));
  } else {
    // Ensure every staff in storage has a photo_url fallback
    const parsed: Staff[] = JSON.parse(existingStaffStr);
    const updated = parsed.map((s, idx) => ({
      ...s,
      photo_url: s.photo_url || DEMO_STAFF[idx % DEMO_STAFF.length]?.photo_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
    }));
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(updated));
  }

  const existingStudentsStr = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (!existingStudentsStr || !existingStudentsStr.includes('student_photo_url')) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEMO_STUDENTS));
  } else {
    // Ensure every student in storage has student_photo_url and parent_photo_url fallback
    const parsed: Student[] = JSON.parse(existingStudentsStr);
    const updated = parsed.map((s, idx) => ({
      ...s,
      student_photo_url: s.student_photo_url || DEMO_STUDENTS[idx % DEMO_STUDENTS.length]?.student_photo_url || 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=400&q=80',
      parent_photo_url: s.parent_photo_url || DEMO_STUDENTS[idx % DEMO_STUDENTS.length]?.parent_photo_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    }));
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
  }

  if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(DEMO_LOGS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.GATE_PASSES)) {
    localStorage.setItem(STORAGE_KEYS.GATE_PASSES, JSON.stringify([]));
  }
}

export function getMockStaff(): Staff[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STAFF) || '[]');
}

export function addMockStaff(staffInput: Omit<Staff, 'id'>): Staff {
  const list = getMockStaff();
  const newStaff: Staff = {
    ...staffInput,
    id: `staff-${Date.now()}`,
    role: staffInput.role || 'staff',
  };
  list.push(newStaff);
  localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
  return newStaff;
}

export function getMockStudents(): Student[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
}

export function addMockStudent(studentInput: Omit<Student, 'id'>): Student {
  const list = getMockStudents();
  const newStudent: Student = {
    ...studentInput,
    id: `stud-${Date.now()}`,
  };
  list.push(newStudent);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(list));
  return newStudent;
}

export function getMockLogs(): DailyLog[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
}

export function addMockLog(log: Omit<DailyLog, 'id' | 'created_at'>): DailyLog {
  const logs = getMockLogs();
  const newLog: DailyLog = {
    ...log,
    id: `log-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return newLog;
}

export function deleteMockLog(logId: string): void {
  const logs = getMockLogs();
  const filtered = logs.filter((l) => l.id !== logId);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(filtered));
}

export function updateMockLog(logId: string, updates: Partial<DailyLog>): DailyLog | null {
  const logs = getMockLogs();
  const idx = logs.findIndex((l) => l.id === logId);
  if (idx === -1) return null;
  logs[idx] = { ...logs[idx], ...updates };
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  return logs[idx];
}

export function getMockGatePasses(): GatePass[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GATE_PASSES) || '[]');
}

export function createOrGetMockGatePass(student: Student): GatePass {
  const passes = getMockGatePasses();
  const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const existing = passes.find(
    (p) => (p.student_id === student.id || p.roll_no === student.roll_no) && p.pass_date === today
  );
  if (existing) return existing;

  const newPass: GatePass = {
    id: `pass-${Date.now()}`,
    student_id: student.id,
    roll_no: student.roll_no,
    student_name: student.name,
    class_name: student.class_name,
    status: 'PENDING',
    pass_date: today,
    created_at: new Date().toISOString(),
    student_photo_url: student.student_photo_url,
    parent_photo_url: student.parent_photo_url,
  };

  passes.push(newPass);
  localStorage.setItem(STORAGE_KEYS.GATE_PASSES, JSON.stringify(passes));
  return newPass;
}

export function completeMockGatePass(passIdOrRoll: string, staffName: string): GatePass | null {
  const passes = getMockGatePasses();
  const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const passIndex = passes.findIndex(
    (p) => (p.id === passIdOrRoll || p.roll_no === passIdOrRoll || p.student_id === passIdOrRoll) && p.pass_date === today
  );

  if (passIndex === -1) {
    const student = getMockStudents().find((s) => s.roll_no === passIdOrRoll || s.id === passIdOrRoll);
    if (!student) return null;
    const createdPass = createOrGetMockGatePass(student);
    return completeMockGatePass(createdPass.id, staffName);
  }

  const updatedPass: GatePass = {
    ...passes[passIndex],
    status: 'COMPLETED',
    pickup_time: new Date().toISOString(),
    approved_by_staff: staffName,
  };

  passes[passIndex] = updatedPass;
  localStorage.setItem(STORAGE_KEYS.GATE_PASSES, JSON.stringify(passes));
  return updatedPass;
}

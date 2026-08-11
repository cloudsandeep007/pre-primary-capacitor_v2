import { Staff, Student, DailyLog, GatePass } from './types';

export const DEMO_STAFF: Staff[] = [
  {
    id: 'staff-1',
    email: 'teacher@school.com',
    password: 'teacher123',
    name: 'Ms. Priya',
    assigned_class: 'Nursery',
  },
  {
    id: 'staff-2',
    email: 'lkg@school.com',
    password: 'teacher123',
    name: 'Mrs. Sunita',
    assigned_class: 'Junior KG',
  },
  {
    id: 'staff-3',
    email: 'ukg@school.com',
    password: 'teacher123',
    name: 'Mr. Ramesh',
    assigned_class: 'Senior KG',
  },
  {
    id: 'staff-4',
    email: 'admin@school.com',
    password: 'admin123',
    name: 'Principal Sharma',
    assigned_class: 'All',
  },
  {
    id: 'staff-5',
    email: 'raj@school.com',
    password: '12345',
    name: 'Raj',
    assigned_class: 'Nursery',
  },
  {
    id: 'staff-6',
    email: 'shiwani@school.com',
    password: '12345',
    name: 'Shiwani',
    assigned_class: 'Nursery',
  },
  {
    id: 'staff-7',
    email: 'shiwanikumari@school.com',
    password: '12345',
    name: 'Shiwani Kumari',
    assigned_class: 'Junior KG',
  },
];

export const DEMO_STUDENTS: Student[] = [
  {
    id: 'stud-1',
    roll_no: '101',
    pin: '1234',
    name: 'Aarav Sharma',
    class_name: 'Nursery',
  },
  {
    id: 'stud-2',
    roll_no: '102',
    pin: '1234',
    name: 'Diya Patel',
    class_name: 'Junior KG',
  },
  {
    id: 'stud-3',
    roll_no: '103',
    pin: '1234',
    name: 'Kabir Singh',
    class_name: 'Senior KG',
  },
  {
    id: 'stud-4',
    roll_no: '105',
    pin: '1234',
    name: 'Avyaan',
    class_name: 'Nursery',
  },
];

const today = new Date().toISOString().split('T')[0];

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
  STAFF: 'samsidh_mock_staff_v5',
  STUDENTS: 'samsidh_mock_students_v5',
  LOGS: 'samsidh_mock_logs_v5',
  GATE_PASSES: 'samsidh_mock_gate_passes_v1',
};

export function initMockStorage() {
  const existingStaff = localStorage.getItem(STORAGE_KEYS.STAFF);
  if (!existingStaff || !existingStaff.includes('assigned_class')) {
    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(DEMO_STAFF));
  }
  if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEMO_STUDENTS));
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

export function getMockStudents(): Student[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS) || '[]');
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

export function getMockGatePasses(): GatePass[] {
  initMockStorage();
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.GATE_PASSES) || '[]');
}

export function createOrGetMockGatePass(student: Student): GatePass {
  const passes = getMockGatePasses();
  const today = new Date().toISOString().split('T')[0];
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
  };

  passes.push(newPass);
  localStorage.setItem(STORAGE_KEYS.GATE_PASSES, JSON.stringify(passes));
  return newPass;
}

export function completeMockGatePass(passIdOrRoll: string, staffName: string): GatePass | null {
  const passes = getMockGatePasses();
  const today = new Date().toISOString().split('T')[0];
  const passIndex = passes.findIndex(
    (p) => (p.id === passIdOrRoll || p.roll_no === passIdOrRoll || p.student_id === passIdOrRoll) && p.pass_date === today
  );

  if (passIndex === -1) {
    // Search student by roll_no to auto-create & complete pass
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

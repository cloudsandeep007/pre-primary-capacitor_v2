export type ClassLevel = 'Nursery' | 'Junior KG' | 'Senior KG';

export type MealStatus = 'finished' | 'half' | 'barely';
export type NapStatus = 'none' | '30min' | '1hour+';
export type MoodStatus = 'happy' | 'energetic' | 'tearful';

export interface Staff {
  id: string;
  email: string;
  password: string;
  name: string;
  assigned_class?: ClassLevel | 'All';
}

export interface Student {
  id: string;
  roll_no: string;
  pin: string;
  name: string;
  class_name: ClassLevel;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
  name?: string;
}

export interface DailyLog {
  id: string;
  student_id: string;
  staff_name: string | null;
  meal_status: MealStatus | null;
  nap_time: NapStatus | null;
  mood: MoodStatus | null;
  teacher_notes: string | null;
  photo_url: string | null;
  media_items?: MediaItem[];
  log_date: string;
  created_at: string;
}

export interface DailyLogInput {
  student_id: string;
  staff_name?: string | null;
  meal_status?: MealStatus | null;
  nap_time?: NapStatus | null;
  mood?: MoodStatus | null;
  teacher_notes?: string | null;
  photo_url?: string | null;
  media_items?: MediaItem[];
  log_date?: string;
}

export interface GatePass {
  id: string;
  student_id: string;
  roll_no: string;
  student_name: string;
  class_name: ClassLevel;
  pickup_time?: string | null;
  approved_by_staff?: string | null;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  pass_date: string;
  created_at: string;
}

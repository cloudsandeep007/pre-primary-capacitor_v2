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
  photo_url?: string;
  role?: 'staff' | 'admin' | 'gate_staff';
  is_active?: boolean;
}

export interface Parent {
  id: string;
  auth_user_id?: string;
  email: string;
  name: string;
  phone?: string;
  created_at: string;
}

export interface StudentParent {
  student_id: string;
  parent_id: string;
  relationship_type: 'Father' | 'Mother' | 'Guardian';
  is_primary: boolean;
  student?: Student;
}

export interface SchoolFeedback {
  id: string;
  parent_id?: string;
  student_id?: string;
  rating_overall: number;
  comments?: string;
  is_public_review_clicked: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  class_name: string;
  staff_name: string | null;
  staff_id: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
  replies?: AnnouncementReply[];
}

export interface AnnouncementReply {
  id: string;
  announcement_id: string;
  sender_type: 'parent' | 'teacher';
  sender_name: string | null;
  student_id: string | null;
  body: string;
  created_at: string;
}

export interface HomeworkItem {
  id: string;
  class_name: string;
  staff_name: string | null;
  staff_id: string | null;
  title: string;
  subject: string | null;
  description: string | null;
  due_date: string | null;
  attachment_url: string | null;
  created_at: string;
  replies?: HomeworkReply[];
}

export interface HomeworkReply {
  id: string;
  homework_id: string;
  sender_type: 'parent' | 'teacher';
  sender_name: string | null;
  student_id: string | null;
  body: string;
  created_at: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: 'holiday' | 'event' | 'exam' | 'activity';
  description: string | null;
  class_name: string;
  created_at: string;
}

export interface Student {
  id: string;
  roll_no: string;
  pin: string;
  name: string;
  class_name: ClassLevel;
  guardian_name?: string;
  parent_phone?: string;
  student_photo_url?: string;
  parent_photo_url?: string;
  status?: 'active' | 'dropout' | 'graduated';
  created_at?: string;
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
  student_photo_url?: string | null;
  parent_photo_url?: string | null;
}

export interface Attendance {
  id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late';
  date: string;
  class_name?: string;
}

export interface DailyGrade {
  id: string;
  student_id: string;
  cw_stars: number;
  hw_stars: number;
  activity_stars: number;
  date: string;
  class_name?: string;
  teacher_notes?: string;
}

export interface Classwork {
  id: string;
  title: string;
  description: string;
  subject: string;
  class_name: string;
  date: string;
  image_url: string | null;
  created_at: string;
}

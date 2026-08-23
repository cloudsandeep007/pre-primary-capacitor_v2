# 08 Database Schema

## Core Tables

### `students`
Stores parent/child login credentials.
- `id` (uuid)
- `roll_no` (text, unique)
- `pin` (text)
- `name` (text)
- `class_name` (text)

### `staff`
Stores teacher/admin login credentials.
- `id` (uuid)
- `email` (text)
- `password` (text)
- `role` (text)

### `daily_logs` & `activity_logs`
Stores daily activities (meals, naps, photos). `activity_logs` serves as a legacy/fallback table.

### `announcements` & `homework`
Stores communications. Both use UUIDs for primary keys.

### `homework_completions`
Junction table tracking which student completed which homework.

*(Refer to `supabase/migrations/` for exact current schema)*

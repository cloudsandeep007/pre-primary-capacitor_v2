# 05 Folder Structure

## `src/`
The root of the application code.

### `src/pages/`
Contains the top-level views for each portal.
- `admin/`: Admin Dashboard and management tools.
- `gate/`: Gate pass scanning portal.
- `parent/`: Parent feed, homework, and communications.
- `staff/`: Teacher dashboard, activity logging, attendance.

### `src/components/`
Reusable UI elements (Buttons, Spinners, Toasts, ErrorBoundary).
- **Rule:** Do not put business logic here.

### `src/services/`
The Service Layer.
- Examples: `announcementService.ts`, `homeworkService.ts`, `staffService.ts`.
- **Rule:** All Supabase interactions belong here.

### `src/lib/`
Core utilities and configurations.
- `supabase.ts`: DB client.
- `logger.ts`: Centralized error and audit logging.
- `types.ts`: TypeScript interfaces.
- `mockData.ts`: Fallback data for offline mode.

### `supabase/migrations/`
Contains timestamped SQL files defining the database schema and RLS policies.
- **Rule:** Never modify an old migration. Always create a new one.

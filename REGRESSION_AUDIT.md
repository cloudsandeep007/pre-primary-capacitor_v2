# Regression Audit

| Feature | Status | Frontend | Service | Database | RLS | Error | Suspected Cause |
|---|---|---|---|---|---|---|---|
| **Announcements (Create)** | ⚪ NOT VERIFIED | `AnnouncementsPanel.tsx` | `announcementService.ts` | `announcements` | `public write announcements` | Fixed `22P02 invalid_text_representation` | Component generated a string ID (`local-123456...`) but the DB column `id` is of type `uuid`. Fixed by stripping frontend ID from insert payload. |
| **Announcements (Read)** | ⚪ NOT VERIFIED | `AnnouncementsPanel.tsx` | `announcementService.ts` | `announcements` | `public read announcements` | None | Fetching works correctly. |
| **Announcement Replies (Create)** | ⚪ NOT VERIFIED | `AnnouncementsPanel.tsx` | `announcementService.ts` | `announcement_replies` | `public write ann_replies` | Parent record missing | Parent announcement failed to create. Fixed as part of Announcement Create fix. |
| **Homework (Create)** | ⚪ NOT VERIFIED | `HomeworkPanel.tsx` | `homeworkService.ts` | `homework` | `public write homework` | Fixed `22P02 invalid_text_representation` | Component generated a string ID. Fixed by stripping frontend ID. |
| **Homework (Read)** | ⚪ NOT VERIFIED | `HomeworkPanel.tsx` | `homeworkService.ts` | `homework` | `public read homework` | None | Fetching works correctly. |
| **Homework Replies (Create)** | ⚪ NOT VERIFIED | `HomeworkPanel.tsx` | `homeworkService.ts` | `homework_replies` | `public write hw_replies` | Parent record missing | Parent record failed to create. Fixed as part of Homework Create fix. |
| **Homework Completions** | ⚪ NOT VERIFIED | `ParentHomeworkTab.tsx` | `homeworkService.ts` | `homework_completions` | None -> Fixed | Fixed `42501 RLS Policy Violation` | Added missing RLS policies in `20260819020000_homework_completions_rls.sql`. |
| **Staff Creation** | ⚪ NOT VERIFIED | `AddStaffModal.tsx` | `staffService.ts` | `staff` | `anon_insert_staff` | Fixed `42703 undefined_column` | `staffService.createStaff` attempted to insert into `password_hash`, mapped to `password` in service. |
| **Staff Login** | 🟢 WORKING | `StaffLogin.tsx` | `staffService.ts` | `staff` | `anon_read_staff` | None | Reads from `staff` using `password` field locally or via select. |
| **Parent Login** | 🟢 WORKING | `ParentLogin.tsx` | `studentService.ts` | `students` | `anon_read_students` | None | Reads from `students` table. |
| **Gate Pass (Approve)** | 🟢 WORKING | `GateDashboard.tsx` | `gatePassService.ts` | `gate_passes` | Open | None | Service doesn't explicitly send string IDs for inserts. |

# Project Architecture Audit
**Project:** Pre-Primary School Management App  
**Audit Date:** 2026-08-16  
**Audited By:** Antigravity AI  
**Scope:** Full codebase — no changes made

---

## A. Architecture Overview (In Simple Language)

Think of this app like a school building with 4 separate rooms (portals), each for a different person:

| Portal | Who Uses It | Route in Browser |
|---|---|---|
| **Landing Page** | Everyone — choose which portal to enter | `/#/` |
| **Staff Portal** | Teachers to manage students, log activities | `/#/staff` |
| **Parent Portal** | Parents to see their child's daily updates | `/#/parent` |
| **Admin Dashboard** | Principal to manage staff, view all data | `/#/admin` |
| **Gate Portal** | Gate staff to scan QR codes at pickup | `/#/gate` |

The app runs entirely in the browser (React + TypeScript). It connects to Supabase (your cloud database) to store and fetch real data. It also has a safety net called "mock data" — if Supabase is unreachable, it falls back to demo data stored in the browser's local storage.

**The app does NOT use Supabase's built-in login system.** Instead, it checks the staff email and password directly against the `staff` database table.

---

## B. Folder Structure

```
d:\pre-primary_V1\
├── src/
│   ├── main.tsx                    ← App entry point (starts React + registers service worker)
│   ├── App.tsx                     ← Top-level layout, loads all 4 portals lazily
│   ├── index.css                   ← Global CSS styles
│   ├── lib/
│   │   ├── supabase.ts             ← Supabase client (single shared connection)
│   │   ├── types.ts                ← All TypeScript data shapes (Student, Staff, DailyLog, etc.)
│   │   ├── router.tsx              ← Custom URL routing (uses browser hash #/)
│   │   ├── constants.ts            ← Meal/nap/mood options + label helpers
│   │   ├── mockData.ts             ← Fallback demo data + localStorage helpers ⚠️
│   │   ├── pushNotifications.ts    ← Web push notification setup
│   │   └── dateUtils.ts            ← Date formatting helpers
│   ├── components/
│   │   ├── ErrorBoundary.tsx       ← Catches crashes per portal
│   │   ├── Toast.tsx               ← Notification popups (success/error/info)
│   │   ├── Spinner.tsx             ← Loading indicator
│   │   ├── Button.tsx              ← Reusable button
│   │   ├── Logo.tsx                ← App logo component
│   │   ├── PhotoUploadInput.tsx    ← File upload with Supabase Storage
│   │   ├── ImageViewerModal.tsx    ← View images/videos fullscreen
│   │   ├── QRCodeCanvas.tsx        ← Generates QR codes for gate passes
│   │   ├── PrintableReportCard.tsx ← PDF report card generator
│   │   ├── PWAInstallBanner.tsx    ← "Install App" prompt for mobile
│   │   └── PWAUpdatePrompt.tsx     ← "Update available" prompt
│   └── pages/
│       ├── LandingPage.tsx         ← Home screen with portal selection
│       ├── staff/
│       │   ├── StaffPortal.tsx         ← Wrapper: shows Login or Dashboard
│       │   ├── StaffLogin.tsx          ← Email+password login for teachers
│       │   ├── StaffOnboarding.tsx     ← New teacher registration + photo upload
│       │   ├── StaffDashboard.tsx      ← Main teacher view (788 lines — very large)
│       │   ├── ActivityFormModal.tsx   ← Log meal/nap/mood/photos for a student
│       │   ├── AnnouncementsPanel.tsx  ← Post and view class announcements
│       │   ├── HomeworkPanel.tsx       ← Assign and track homework
│       │   ├── StaffClassworkPanel.tsx ← Log classwork items
│       │   ├── StaffAttendancePanel.tsx← Mark attendance
│       │   ├── StaffGradebookModal.tsx ← Enter star ratings for students
│       │   ├── StaffPerformanceTab.tsx ← View student performance charts
│       │   ├── StaffReportsTab.tsx     ← Generate & download PDF reports
│       │   ├── StaffQRScannerModal.tsx ← QR camera scanner for gate passes
│       │   └── StudentHistoryModal.tsx ← View/edit/delete a student's activity history
│       ├── parent/
│       │   ├── ParentPortal.tsx        ← Wrapper: shows Login or Feed
│       │   ├── ParentLogin.tsx         ← Roll number + PIN login for parents
│       │   ├── ParentOnboarding.tsx    ← Register new student
│       │   ├── ParentFeed.tsx          ← Main parent view: daily logs, photos
│       │   ├── MessagesTab.tsx         ← View and reply to announcements
│       │   ├── HomeworkTab.tsx         ← View and ask about homework
│       │   ├── CalendarTab.tsx         ← View school events/holidays
│       │   ├── ParentClassworkTab.tsx  ← View today's classwork
│       │   ├── PerformanceTab.tsx      ← View child's star grades
│       │   └── ParentGatePassModal.tsx ← Request/view gate pass + QR code
│       ├── admin/
│       │   ├── AdminDashboard.tsx      ← Full admin panel (31KB — very large)
│       │   ├── AnalyticsTab.tsx        ← View charts and statistics
│       │   └── AddStaffModal.tsx       ← Add new staff member
│       └── gate/
│           ├── GatePortal.tsx          ← Wrapper: shows Login or Dashboard
│           ├── GateLogin.tsx           ← Gate staff login
│           └── GateDashboard.tsx       ← QR scan + manual roll number entry
├── supabase/
│   ├── migrations/                 ← 6 timestamped migration files (DB history)
│   └── config.toml                 ← Local Supabase config
└── public/
    └── sw.js                       ← Service Worker for PWA + push notifications
```

---

## C. Important Files and What Each Does

| File | Purpose | Risk Level |
|---|---|---|
| `src/lib/supabase.ts` | Creates the single database connection. **Anon key is hardcoded in the file.** | 🔴 HIGH |
| `src/lib/mockData.ts` | Fallback demo data stored in browser's `localStorage`. Used when Supabase fails. | 🟡 MEDIUM |
| `src/lib/types.ts` | Defines the shape of all data (Student, Staff, DailyLog, etc.) | 🟢 LOW |
| `src/lib/router.tsx` | Handles navigation using URL hash (e.g., `#/staff`) | 🟢 LOW |
| `src/pages/staff/ActivityFormModal.tsx` | **Most critical write path.** Logs activity to `daily_logs`, falls back to `activity_logs`, always writes to mock storage too. | 🔴 HIGH |
| `src/pages/staff/StaffDashboard.tsx` | 788-line file. Contains Realtime subscriptions, student loading, gate pass logic. Too large. | 🟡 MEDIUM |
| `src/pages/admin/AdminDashboard.tsx` | 31KB file. Mixes admin login, data loading, analytics, staff management all in one. Too large. | 🟡 MEDIUM |

---

## D. Data Flow Examples (In Simple Language)

### Example 1: Teacher Logs an Activity for a Student
1. Teacher opens `ActivityFormModal`, fills in meal/nap/mood/photo.
2. Photo is uploaded to **Supabase Storage** (`child-photos` bucket).
3. If Storage upload fails → photo is saved as a Base64 string directly in the database (fallback).
4. The activity is **always** first saved to `localStorage` (mock storage) so the parent sees it instantly even if internet is slow.
5. Then it tries to insert into **`daily_logs`** in Supabase.
6. If that fails → it retries without the `media_items` column.
7. If that also fails → it tries the old **`activity_logs`** table.
8. A success toast message is shown regardless.

### Example 2: Parent Views Child's Feed
1. Parent logs in with roll number + PIN against the `students` table.
2. `ParentFeed` subscribes to **Realtime** on `gate_passes` and `daily_logs`.
3. It fetches logs from `daily_logs`. If empty → tries `activity_logs`. If still empty → uses `localStorage` mock logs.
4. Parent sees photos, meal status, mood icons in a feed format.

### Example 3: Gate Staff Scans QR Code at Pickup
1. Gate staff scans a QR code from the parent's phone.
2. The QR contains the student's `roll_no`.
3. App searches `gate_passes` in Supabase for a matching active pass.
4. If found → marks it `COMPLETED` with a timestamp.
5. If Supabase fails → marks it in `localStorage` mock.
6. Teacher's dashboard sees the update via **Realtime** subscription.

---

## E. Database Interaction Map

### Tables and Who Reads/Writes Them

| Table | Reads From | Writes To | Deletes From |
|---|---|---|---|
| `students` | StaffDashboard, ParentLogin, GateDashboard, StaffQRScannerModal, AdminDashboard, StaffReportsTab, StaffPerformanceTab | ParentOnboarding | AdminDashboard |
| `staff` | StaffLogin, AdminDashboard | StaffOnboarding, AddStaffModal | AdminDashboard |
| `daily_logs` | StaffDashboard, StudentHistoryModal, AdminDashboard, ParentFeed | ActivityFormModal | StudentHistoryModal |
| `activity_logs` | StaffDashboard *(fallback)*, AdminDashboard *(fallback)*, ParentFeed *(fallback)*, StudentHistoryModal *(fallback delete)* | ActivityFormModal *(fallback)* | StudentHistoryModal *(fallback)* |
| `gate_passes` | StaffDashboard, GateDashboard, ParentFeed, ParentGatePassModal, AdminDashboard | GateDashboard, StaffQRScannerModal, ParentGatePassModal | — |
| `announcements` | AnnouncementsPanel, MessagesTab | AnnouncementsPanel | — |
| `announcement_replies` | AnnouncementsPanel, MessagesTab | AnnouncementsPanel, MessagesTab | — |
| `homework` | HomeworkPanel, HomeworkTab | HomeworkPanel | — |
| `homework_replies` | HomeworkPanel, HomeworkTab | HomeworkPanel, HomeworkTab | — |
| `attendance` | StaffAttendancePanel | StaffAttendancePanel | — |
| `classwork` | StaffClassworkPanel, ParentClassworkTab | StaffClassworkPanel | — |
| `daily_grades` | StaffGradebookModal, PerformanceTab, StaffPerformanceTab | StaffGradebookModal | — |
| `school_events` | CalendarTab | AdminDashboard | AdminDashboard |
| `push_subscriptions` | — | pushNotifications.ts | — |

### Supabase Storage Buckets Used

| Bucket | Used By | Operation |
|---|---|---|
| `child-photos` | ActivityFormModal, PhotoUploadInput, HomeworkPanel, StaffClassworkPanel | Upload files (images/videos), get public URL |
| `media` | HomeworkPanel, StaffClassworkPanel | Upload homework/classwork attachments |

### Realtime Subscriptions Active

| Channel Name | Table(s) Watched | Used In |
|---|---|---|
| `public:gate_passes_staff` | `gate_passes`, `daily_logs` | StaffDashboard |
| `public:parent_feed_<id>` | `gate_passes`, `daily_logs` | ParentFeed |
| `public:gate_pass_modal_<id>` | `gate_passes` | ParentGatePassModal |
| `announcements_changes` | `announcements`, `announcement_replies` | AnnouncementsPanel |
| `public:announcements` | `announcements` | MessagesTab (parent side) |
| `public:announcement_replies` | `announcement_replies` | MessagesTab (parent side) |
| `homework_changes` | `homework`, `homework_replies` | HomeworkPanel |
| `public:homework` | `homework` | HomeworkTab (parent side) |
| `public:homework_replies` | `homework_replies` | HomeworkTab (parent side) |
| `attendance_changes` | `attendance` | StaffAttendancePanel |
| `classwork_changes` | `classwork` | StaffClassworkPanel |

---

## F. Current Error-Handling Map

| Location | What Happens on Error |
|---|---|
| `App.tsx` | Each portal wrapped in `<ErrorBoundary>` — crash in one portal does NOT crash others ✅ |
| `ErrorBoundary.tsx` | Shows error message + stack trace on screen. Shows "Reload App" button. Does NOT report errors anywhere. |
| `StaffLogin.tsx` | 3-second timeout on Supabase. Falls back to mock data. Shows toast. |
| `ParentLogin.tsx` | 3-second timeout on Supabase. Falls back to mock data. Shows toast. |
| `ActivityFormModal.tsx` | 3-layer fallback: daily_logs → retry without media_items → activity_logs → mock storage |
| `StaffDashboard.tsx (loadStudents)` | Falls back to mock students. No user-visible error shown. |
| `StaffDashboard.tsx (loadTodayLogs)` | Falls back to mock logs. No user-visible error shown. |
| `AnnouncementsPanel / HomeworkPanel` | Try Supabase, fall back to local state. No user-visible error. |
| `GateDashboard / StaffQRScannerModal` | Try Supabase, fall back to mock. Logs individual SQL errors as `console.warn`. |
| `pushNotifications.ts` | Silently fails with `console.error`. User never knows push setup failed. |
| `main.tsx` | Service worker failure logged as `console.log` (wrong level — should be `.error`). |

---

## G. Current Logging Map

> ⚠️ There is **no centralized logging system**. All logging is done with raw `console.*` calls scattered across 20+ files.

### Total console calls found: ~65 across the codebase

| Level | Count | Examples |
|---|---|---|
| `console.log` | 3 | `main.tsx`, `pushNotifications.ts` |
| `console.warn` | ~30 | Supabase fallbacks, camera errors, mock data usage |
| `console.error` | ~32 | Database errors, save failures, analytics errors |

### Key Logging Issues
1. **Sensitive fallback info** is logged (e.g., `[StaffLogin] Supabase unavailable or timed out, using demo data`) — if a bad actor has browser console access, they know the fallback system exists.
2. **No log levels** — everything goes to the browser console with no structure.
3. **Inconsistent prefixes** — some have `[ComponentName]`, most don't.
4. **Errors are swallowed** — many catch blocks log to console but show no error to the user (silent failures).
5. **Service worker failure uses `console.log`** — should be `.error`.

---

## H. Current Risks

### 🔴 Critical Risks

| Risk | Location | Explanation |
|---|---|---|
| **Anon key hardcoded in source code** | `src/lib/supabase.ts:4` | The Supabase anon key is hardcoded in the source file as a fallback. Anyone who views the compiled JavaScript bundle can extract it. Should be in a `.env` file only. |
| **Passwords stored as plain text** | `staff` table, `mockData.ts` | Staff passwords are compared as plain strings (`staffAccount.password !== password`). They are also stored as plaintext in the `staff` database table and in `mockData.ts`. |
| **Mock data can contaminate production paths** | `ActivityFormModal.tsx:143` | Even when Supabase succeeds, `addMockLog()` is ALWAYS called, writing to localStorage. If the parent app reads localStorage as fallback, they could see mock data mixed with real data. |
| **No authentication system** | All portals | The app does not use Supabase Auth. Staff and parents are verified using plain-text password/PIN comparison against the database. There is no session token, no JWT, no logout-from-server. |
| **RLS policies are fully open** | `20260810082203` migration | All RLS policies allow `anon` (unauthenticated) users to SELECT, INSERT, UPDATE, and DELETE everything. Any person who knows the project URL and anon key can read or delete all student data. |

### 🟡 Medium Risks

| Risk | Location | Explanation |
|---|---|---|
| **activity_logs fallback is silent** | Multiple files | The code falls back from `daily_logs` to `activity_logs` silently. If the wrong table is being used, there is no alert and data could be split across both tables. |
| **StaffDashboard.tsx is 788 lines** | `StaffDashboard.tsx` | A single file that mixes UI, data loading, Realtime subscriptions, and business logic. Very hard to debug or extend safely. |
| **AdminDashboard.tsx is 31KB** | `AdminDashboard.tsx` | Similar problem. Too large and too many responsibilities in one file. |
| **No tests** | Entire project | There are no unit tests, integration tests, or end-to-end tests. Zero. Any change could break something silently. |
| **demo credentials shown on login screen** | `StaffLogin.tsx:156-191` | The login page shows real demo credentials (email and password) in a visible panel. Fine for a prototype, dangerous for a school with real student data. |
| **BroadcastChannel without feature detection** | `StaffDashboard.tsx:82-88` | `BroadcastChannel` is used without proper browser support detection. The try/catch suppresses the error silently. |

### 🟢 Low Risks

| Risk | Location | Explanation |
|---|---|---|
| No `dateUtils.ts` tests | `src/lib/dateUtils.ts` | Date formatting logic is untested |
| `any` type casting | `StaffDashboard.tsx:165` | `data.map((d: any) => ...)` bypasses TypeScript safety |
| Storage bucket `media` vs `child-photos` | Multiple files | Two different buckets are used inconsistently — `child-photos` for activity photos, `media` for homework/classwork. |

---

## I. Recommended Phase 1 Changes

> **Do NOT implement yet. Approve each step before starting.**

### Priority 1 — Observability (Logging)
- Create a single `src/lib/logger.ts` file with `log`, `warn`, `error` functions.
- Replace all 65 raw `console.*` calls with the new logger.
- Logger should include: timestamp, component name, severity level.
- Logger should NOT log sensitive data (passwords, tokens, PINs).

### Priority 2 — Security (Anon Key)
- Move `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to a `.env.local` file.
- Remove hardcoded fallback values from `supabase.ts`.
- Add `.env.local` to `.gitignore` (it likely already is, but verify).

### Priority 3 — Observability (Error Reporting)
- Improve `ErrorBoundary.tsx` to call the logger when a crash is caught.
- Replace silent catch blocks (that log but don't inform the user) with user-facing toast messages.

### Priority 4 — Reduce Mock Data Leakage
- Remove the unconditional `addMockLog()` call from `ActivityFormModal.tsx:143`.
- Mock data should only be used when Supabase is confirmed unreachable, not always.

---

## J. Files Likely to Be Affected by Phase 1

| File | Why |
|---|---|
| `src/lib/supabase.ts` | Remove hardcoded key |
| `src/lib/mockData.ts` | Reduce unconditional usage |
| `src/components/ErrorBoundary.tsx` | Add logger call |
| `src/pages/staff/ActivityFormModal.tsx` | Remove unconditional mock write, fix console calls |
| `src/pages/staff/StaffDashboard.tsx` | Replace ~5 console calls |
| `src/pages/staff/StaffLogin.tsx` | Replace console calls |
| `src/pages/parent/ParentFeed.tsx` | Replace ~3 console calls |
| `src/pages/parent/ParentLogin.tsx` | Replace console calls |
| `src/pages/admin/AdminDashboard.tsx` | Replace console calls |
| Every other file with console.* | ~15 additional files |
| `src/lib/logger.ts` | **NEW FILE** — centralized logger |
| `.env.local` | **NEW FILE** — environment variables |

---

## Summary

### ✅ What Is Already Good
- **ErrorBoundary exists** and wraps every portal — a crash in one section won't bring down the whole app.
- **Lazy loading** — each portal loads only when needed (faster initial load).
- **Realtime subscriptions are properly cleaned up** — every component calls `supabase.removeChannel()` when it unmounts.
- **Fallback logic exists** — the app degrades gracefully when Supabase is offline.
- **Custom router works** — the hash-based routing is simple and works well for a PWA.
- **Toast system** — consistent user-facing messages for success and error scenarios.
- **TypeScript is used** — data shapes are defined and enforced.
- **PWA setup** — service worker and install banner are implemented.
- **Migration history is now structured** — thanks to our earlier work.

### ⚠️ What Is Weak
- **No centralized logging** — 65+ scattered console calls with no structure.
- **Plaintext passwords** in the database and in mock data.
- **Fully open RLS policies** — anyone can read/write all student data anonymously.
- **No real authentication** — no sessions, no JWT, no logout-from-server.
- **Mock data always writes to localStorage** even when Supabase succeeds.
- **Demo credentials visible on login screen** — not appropriate for a live school.
- **No tests of any kind**.
- **Anon key is hardcoded** in the source file as a fallback.
- **Two oversized files** (StaffDashboard.tsx at 788 lines, AdminDashboard.tsx at 31KB).
- **Silent failures** — many errors are caught, logged to console, but the user sees nothing.

### 🔒 What Should NOT Be Changed
- The `daily_logs` / `activity_logs` fallback logic — it exists for a real reason and removing it without a replacement would break the parent feed.
- The mock data system entirely — it is the safety net that keeps the app working offline or during Supabase downtime. It needs to be improved, not removed.
- The Realtime channel setup — it is working correctly and provides live updates.
- The `ErrorBoundary` wrapping pattern — it is well-designed.
- The custom hash router — it is simple and appropriate for a PWA.

### 🚀 What Should Be Changed First
1. **Create `src/lib/logger.ts`** (centralized logging) — this is the foundation for all Phase 1 observability.
2. **Move the Supabase anon key to `.env.local`** — quick security improvement.
3. **Fix the unconditional mock write in `ActivityFormModal.tsx`** — this is the highest-risk data quality issue.
4. **Improve `ErrorBoundary`** to use the new logger — so crashes are properly captured.

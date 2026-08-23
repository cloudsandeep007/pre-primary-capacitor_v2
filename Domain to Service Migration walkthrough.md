# Phase 2: Service Layer Migrations Walkthrough

This document tracks our progress abstracting raw Supabase database calls into dedicated, type-safe services. By doing this, we decouple our UI components from the database schema, making the app vastly easier to maintain, test, and upgrade.

---

## 1. Activity Service (Pilot)

**File:** [`src/services/activityService.ts`](file:///d:/pre-primary_V1/src/services/activityService.ts)

### What Was Done
We centralized all logic related to fetching, creating, updating, and deleting daily logs and activity logs.

### Key Architectural Fix
The application had a complex schema quirk where it attempted to read/write to `daily_logs`, but on failure, fell back to an older `activity_logs` table. Previously, this fallback logic was duplicated across multiple React UI components (making them messy and brittle). 

We completely encapsulated this dual-table fallback logic inside the `activityService`. The UI components now simply call a single method, entirely unaware of the underlying database complexity.

### Refactored Components
- [MODIFY] [`src/pages/admin/AdminDashboard.tsx`](file:///d:/pre-primary_V1/src/pages/admin/AdminDashboard.tsx): Replaced complex dual-table fetch block with `activityService.fetchAllLogs()`.
- [MODIFY] [`src/pages/staff/ActivityFormModal.tsx`](file:///d:/pre-primary_V1/src/pages/staff/ActivityFormModal.tsx): Replaced nested try-catch insert fallback with `activityService.createLog(logEntry)`.
- [MODIFY] [`src/pages/staff/StudentHistoryModal.tsx`](file:///d:/pre-primary_V1/src/pages/staff/StudentHistoryModal.tsx): Refactored fetching, editing, and deleting to use service methods.

---

## 2. Gate Pass Service

**File:** [`src/services/gatePassService.ts`](file:///d:/pre-primary_V1/src/services/gatePassService.ts)

### What Was Done
We centralized all `supabase.from('gate_passes')` logic into a single module.

### Key Architectural Fix
Both the Gate Security Dashboard and the Staff QR Scanner shared complex logic for approving handovers: they needed to search for an existing pending pass for today, and if found, strictly `UPDATE` it; if not found, they had to `INSERT` a new completed pass. 

We moved this entire transaction into `gatePassService.approveHandover()`. This ensures that both scanning interfaces execute the exact same deterministic logic.

### Refactored Components
- [MODIFY] [`src/pages/admin/AdminDashboard.tsx`](file:///d:/pre-primary_V1/src/pages/admin/AdminDashboard.tsx): Simplified fetching global gate passes.
- [MODIFY] [`src/pages/gate/GateDashboard.tsx`](file:///d:/pre-primary_V1/src/pages/gate/GateDashboard.tsx): Replaced 50+ lines of duplicate insert/update fallback logic with `gatePassService.approveHandover()`.
- [MODIFY] [`src/pages/staff/StaffQRScannerModal.tsx`](file:///d:/pre-primary_V1/src/pages/staff/StaffQRScannerModal.tsx): Applied the exact same clean abstraction.

---

## 3. Student Service

**File:** [src/services/studentService.ts](file:///d:/pre-primary_V1/src/services/studentService.ts)

### What Was Done
We abstracted all student creation and fetching logic into a dedicated service layer.

### Key Architectural Fix
The app had schema inconsistencies (e.g., oll_no vs oll_number, class_name vs class). Multiple UI components were performing manual schema fallbacks when querying or inserting students. We consolidated this fallback complexity entirely inside the service.

### Refactored Components
- [MODIFY] [src/pages/admin/AdminDashboard.tsx](file:///d:/pre-primary_V1/src/pages/admin/AdminDashboard.tsx)
- [MODIFY] [src/pages/gate/GateDashboard.tsx](file:///d:/pre-primary_V1/src/pages/gate/GateDashboard.tsx)
- [MODIFY] [src/pages/staff/StaffQRScannerModal.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffQRScannerModal.tsx)
- [MODIFY] [src/pages/parent/ParentLogin.tsx](file:///d:/pre-primary_V1/src/pages/parent/ParentLogin.tsx)
- [MODIFY] [src/pages/parent/ParentOnboarding.tsx](file:///d:/pre-primary_V1/src/pages/parent/ParentOnboarding.tsx)
- [MODIFY] [src/pages/staff/StaffDashboard.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffDashboard.tsx)
- [MODIFY] [src/pages/staff/StaffPerformanceTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffPerformanceTab.tsx)
- [MODIFY] [src/pages/staff/StaffReportsTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffReportsTab.tsx)
- [MODIFY] [src/pages/staff/StaffAttendancePanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffAttendancePanel.tsx)
- [MODIFY] [src/pages/staff/StaffGradebookModal.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffGradebookModal.tsx)
- [MODIFY] [src/pages/admin/AnalyticsTab.tsx](file:///d:/pre-primary_V1/src/pages/admin/AnalyticsTab.tsx)

---

## 4. Staff Service

**File:** [src/services/staffService.ts](file:///d:/pre-primary_V1/src/services/staffService.ts)

### What Was Done
We abstracted all staff creation and fetching logic into a dedicated service layer, hiding schema fallbacks (e.g., password_hash vs password).

### Refactored Components
- [MODIFY] [src/pages/admin/AddStaffModal.tsx](file:///d:/pre-primary_V1/src/pages/admin/AddStaffModal.tsx)
- [MODIFY] [src/pages/admin/AdminDashboard.tsx](file:///d:/pre-primary_V1/src/pages/admin/AdminDashboard.tsx)

---

## 5. Attendance Service

**File:** [src/services/attendanceService.ts](file:///d:/pre-primary_V1/src/services/attendanceService.ts)

### What Was Done
We centralized the queries for inserting, updating, and fetching attendance records. We've added robust filtering logic within the service to fetch by date range, specific date, class, or individual student.

### Refactored Components
- [MODIFY] [src/pages/staff/StaffAttendancePanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffAttendancePanel.tsx)
- [MODIFY] [src/pages/staff/StaffPerformanceTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffPerformanceTab.tsx)
- [MODIFY] [src/pages/staff/StaffReportsTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffReportsTab.tsx)
- [MODIFY] [src/pages/parent/PerformanceTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/PerformanceTab.tsx)
- [MODIFY] [src/pages/admin/AnalyticsTab.tsx](file:///d:/pre-primary_V1/src/pages/admin/AnalyticsTab.tsx)

---

## 6. Announcement Service

**File:** [src/services/announcementService.ts](file:///d:/pre-primary_V1/src/services/announcementService.ts)

### What Was Done
We centralized the queries for creating, replying to, and fetching announcements. Both the staff panel and parent messaging tab now share this same service logic.

### Resiliency Additions
We encapsulated the 'timeout fallback' logic previously scattered in the components directly into the nnouncementService. If a Supabase insert hangs, the UI no longer locks up; the service handles the timeout and resolves safely for optimistic UI updates.

### Refactored Components
- [MODIFY] [src/pages/parent/MessagesTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/MessagesTab.tsx)
- [MODIFY] [src/pages/staff/AnnouncementsPanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/AnnouncementsPanel.tsx)

---

## 7. Homework Service

**File:** [src/services/homeworkService.ts](file:///d:/pre-primary_V1/src/services/homeworkService.ts)

### What Was Done
We refactored the handling of homework assignments, replies, and completion status. The homeworkService now handles all CRUD operations relating to the homework, homework_replies, and homework_completions tables.

### Optimistic Updates & Reliability
Like previous services, we moved the Promise.race() timeout logic out of the UI components and into the service layer, keeping UI logic clean. ParentHomeworkTab.tsx also continues to utilize optimistic UI updates for checking off homework completions, while deferring network persistence to the service layer.

### Refactored Components
- [MODIFY] [src/pages/parent/HomeworkTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/HomeworkTab.tsx)
- [MODIFY] [src/pages/staff/HomeworkPanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/HomeworkPanel.tsx)
- [MODIFY] [src/pages/parent/CalendarTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/CalendarTab.tsx)

---

## 8. Classwork Service

**File:** [src/services/classworkService.ts](file:///d:/pre-primary_V1/src/services/classworkService.ts)

### What Was Done
We extracted classwork fetching and creation into a centralized service. The Staff view fetches today's classwork, while the Parent view fetches the last 20 classwork items. Both of these utilize the same flexible \etchClasswork\ method, passing a \dateFilter\ when necessary.

### Optimistic Updates & Reliability
As with the other services, we brought the timeout fallback for creating classwork into the service to protect against hanging network requests while preserving optimistic UI state updates.

### Refactored Components
- [MODIFY] [src/pages/parent/ParentClassworkTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/ParentClassworkTab.tsx)
- [MODIFY] [src/pages/staff/StaffClassworkPanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffClassworkPanel.tsx)

---

## 9. Daily Grades Service

**File:** [src/services/gradeService.ts](file:///d:/pre-primary_V1/src/services/gradeService.ts)

### What Was Done
Extracted Daily Grade fetching and tracking out of the Admin Analytics and Staff Gradebook panels into a unified service. In addition, the interface DailyGrade was cleaned up and moved globally to 	ypes.ts, fixing the missing class_name and 	eacher_notes fields that were causing TS typing mismatches.

### Query Unification
I created methods like etchGradesByFilter (which matches YYYY-MM bounds for staff/admin analytics) and etchGradesByDateRange (which utilizes precise \startDate\ and \endDate\ queries) to ensure all tabs retrieve their analytics consistently.

### Refactored Components
- [MODIFY] [src/pages/admin/AnalyticsTab.tsx](file:///d:/pre-primary_V1/src/pages/admin/AnalyticsTab.tsx)
- [MODIFY] [src/pages/parent/PerformanceTab.tsx](file:///d:/pre-primary_V1/src/pages/parent/PerformanceTab.tsx)
- [MODIFY] [src/pages/staff/StaffGradebookModal.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffGradebookModal.tsx)
- [MODIFY] [src/pages/staff/StaffPerformanceTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffPerformanceTab.tsx)
- [MODIFY] [src/pages/staff/StaffReportsTab.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffReportsTab.tsx)

---

## 10. Photos & Storage Service

**File:** [src/services/storageService.ts](file:///d:/pre-primary_V1/src/services/storageService.ts)

### What Was Done
Extracted Supabase Storage bucket uploads and URL generation into a unified \storageService.ts\. The service uses \Promise.race\ timeout constraints to prevent uploads from hanging the UI in poor connectivity scenarios.

### Refactored Components
- [MODIFY] [src/components/PhotoUploadInput.tsx](file:///d:/pre-primary_V1/src/components/PhotoUploadInput.tsx)
- [MODIFY] [src/pages/staff/ActivityFormModal.tsx](file:///d:/pre-primary_V1/src/pages/staff/ActivityFormModal.tsx)
- [MODIFY] [src/pages/staff/HomeworkPanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/HomeworkPanel.tsx)
- [MODIFY] [src/pages/staff/StaffClassworkPanel.tsx](file:///d:/pre-primary_V1/src/pages/staff/StaffClassworkPanel.tsx)

---

## 11. Push Notifications Service

**File:** [src/services/notificationService.ts](file:///d:/pre-primary_V1/src/services/notificationService.ts)

### What Was Done
Moved the standalone \src/lib/pushNotifications.ts\ script into a proper class-based service: \
otificationService.ts\. The service uses \Promise.race\ timeout constraints when upserting push subscription details to Supabase to prevent the UI from freezing during the login sequence if the network drops.

### Refactored Components
- [DELETE] \src/lib/pushNotifications.ts\`n- [MODIFY] [src/pages/parent/ParentPortal.tsx](file:///d:/pre-primary_V1/src/pages/parent/ParentPortal.tsx)

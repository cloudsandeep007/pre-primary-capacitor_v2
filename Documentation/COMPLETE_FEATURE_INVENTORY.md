# COMPLETE_FEATURE_INVENTORY.md

## Core System Features
| Feature | Role(s) | Page/Route | Components | Services/DB | Mobile Ready | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication (Email/Pass)** | All | Various Logins | `ParentLogin`, `StaffLogin`, `AdminDashboard` | Supabase Auth, `staff` table, `roles`, `permissions` | Needs Deep Link Config | Requires App/Universal links for password resets. |
| **RBAC / Permissions** | All | Global | `PermissionContext` | `supabase.rpc('get_my_permissions')` | Yes | Works as-is. |
| **Mock Data Fallback** | All | Global | `mockData.ts` | LocalStorage | Needs Adaptation | Should migrate to `@capacitor/preferences` for persistence. |
| **Error Boundary / Toast** | All | Global | `ErrorBoundary`, `Toast` | React Context | Yes | Works as-is. |
| **Push Notifications** | All | Global | `notificationService.ts` | `push_subscriptions`, Web Push API | **No** | Needs `@capacitor/push-notifications`. |
| **Diagnostics / System Core** | Admin | `/system-core` | `DiagnosticsPage` | `diagnosticsService.ts`, Realtime `__diagnostics_hc__` | Yes | UI might need tweaking for small screens. |

## Staff Portal Features (`/staff`)
| Feature | Role(s) | Page/Route | Components | Services/DB | Mobile Ready | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **View Assigned Class** | Staff | `/staff` | `StaffDashboard` | `academicService.ts`, `classes` | Yes | |
| **Log Daily Activity** | Staff | `/staff` | `ActivityFormModal` | `activityService.ts`, `daily_logs`, `activity_logs` | Yes | |
| **Take Attendance** | Staff | `/staff` | `StaffAttendancePanel` | `attendanceService.ts` | Yes | |
| **Manage Classwork** | Staff | `/staff` | `StaffClassworkPanel` | `classworkService.ts`, `classwork` | Yes | |
| **Manage Homework** | Staff | `/staff` | `HomeworkPanel` | `homeworkService.ts`, `homework` | Yes | |
| **View Announcements** | Staff | `/staff` | `AnnouncementsPanel` | `announcementService.ts`, `announcements` | Yes | |
| **Record Grades/Performance** | Staff | `/staff` | `StaffPerformanceTab`, `StaffGradebookModal` | `gradeService.ts`, `daily_grades` | Yes | Complex tables might need responsive adjustments. |
| **Generate Report Cards (PDF)** | Staff | `/staff` | `StaffReportsTab` | `html2canvas`, `jspdf` | **No** | File download mechanism fails on mobile WebViews. |
| **Scan Gate Pass (QR)** | Staff | `/staff` | `StaffQRScannerModal` | `html5-qrcode`, `gatePassService.ts` | **No** | Needs native barcode scanner plugin. |
| **Upload Photos** | Staff | `/staff` | `PhotoUploadInput` | Supabase Storage (`child-photos`) | Needs Adaptation | Better with `@capacitor/camera`. |

## Parent Portal Features (`/parent`)
| Feature | Role(s) | Page/Route | Components | Services/DB | Mobile Ready | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **View Daily Feed** | Parent | `/parent` | `ParentFeed` | `activityService.ts` | Yes | |
| **View Classwork/Homework** | Parent | `/parent` | `ParentClassworkTab`, `HomeworkTab` | `classworkService.ts`, `homeworkService.ts` | Yes | |
| **Send Messages** | Parent | `/parent` | `MessagesTab` | `messageService.ts` | Yes | |
| **View Performance** | Parent | `/parent` | `PerformanceTab` | `gradeService.ts` | Yes | |
| **View Fees & Download Receipt** | Parent | `/parent` | `ParentFeesTab` | `feeService.ts`, `student_fees` | **No (Download)** | Needs Capacitor Filesystem for receipts. |
| **Generate Gate Pass (QR)** | Parent | `/parent` | `ParentGatePassModal`, `QRCodeCanvas` | `gatePassService.ts`, `qrcode` | Yes | Canvas rendering usually works fine. |

## Admin Dashboard Features (`/admin`)
| Feature | Role(s) | Page/Route | Components | Services/DB | Mobile Ready | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard Overview** | Admin | `/admin` | `AdminDashboardOverview` | Multiple services | Yes | |
| **Manage Staff** | Admin | `/admin` | `AdminStaffList`, `AddStaffModal` | `staffService.ts`, `staff` | Yes | CSV Export will fail (needs Filesystem). |
| **Manage Students** | Admin | `/admin` | `AdminStudentsList` | `studentService.ts`, `students` | Yes | CSV Export will fail. |
| **Manage Finances** | Admin | `/admin` | `AdminFinanceView` | `feeService.ts`, `fee_structures`, `fee_payments` | Yes | CSV Export will fail. |
| **Manage Classes** | Admin | `/admin` | `AdminClassesView` | `academicService.ts`, `classes` | Yes | |
| **Manage Documents** | Admin | `/admin` | `AdminDocumentsView` | `storageService.ts` | **No (Download)** | Document download needs Filesystem. |

## Gate Portal Features (`/gate`)
| Feature | Role(s) | Page/Route | Components | Services/DB | Mobile Ready | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Scan QR Code** | Security | `/gate` | `GateDashboard` | `html5-qrcode`, `gatePassService.ts` | **No** | Needs native barcode scanner plugin for performance. |

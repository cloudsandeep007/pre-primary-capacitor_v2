# USER_ROLE_AND_PERMISSION_MATRIX.md

## Roles Overview
Based on the routing and UI components, the application has the following distinct portals which map to logical roles:
1.  **Admin** (`/admin`)
2.  **Staff/Teacher** (`/staff`)
3.  **Parent** (`/parent`)
4.  **Gate/Security** (`/gate`)

## How Roles are Determined
Roles are managed via a custom RBAC (Role-Based Access Control) system in Supabase.
1.  User authenticates via `supabase.auth.signInWithPassword`.
2.  The application calls a Supabase RPC `get_my_permissions` (seen in `PermissionContext.tsx`).
3.  This RPC returns the roles and permissions assigned to the logged-in user.
4.  There is also a fallback mechanism for admin login (checking a hardcoded admin password and syncing it to Supabase Auth) as seen in `AdminDashboard.tsx`.

## Detailed Permissions by Role

### 1. Admin
*   **View**: Dashboard overview, finances, staff list, student list, documents, settings, complaints, admissions, classes.
*   **Create**: Staff members, students, fee structures, announcements, classes, documents.
*   **Edit**: Staff profiles, student profiles, fee records, school settings, class assignments.
*   **Delete**: Staff, students, documents (based on UI icons).
*   **Approve**: Gate passes (implied by dashboard overview).
*   **Manage**: Entire system configuration, RBAC roles (via RPCs), system diagnostics.
*   **Download**: Fee ledgers (CSV), staff lists (CSV), student lists (CSV), reports.

### 2. Staff / Teacher
*   **View**: Assigned class roster, student details, daily schedules, announcements, classwork, homework.
*   **Create**: Daily activity logs, attendance records, grades, classwork, homework, incident reports.
*   **Edit**: Existing logs, homework assignments, student performance data.
*   **Scan**: QR codes for student arrival/departure (using `html5-qrcode`).
*   **Download**: Student report cards (PDF via `jspdf` and `html2canvas`).
*   **Upload**: Photos of students/activities (via `PhotoUploadInput.tsx` to Supabase Storage).

### 3. Parent
*   **View**: Child's daily feed (activities, meals, naps), homework, classwork, fee status, announcements.
*   **Create**: Messages to staff, gate passes for alternative pickup.
*   **View/Download**: Fee receipts.
*   **Generate**: QR codes for gate passes (using `qrcode`).

### 4. Gate / Security Staff
*   **View**: Active gate passes, student pickup authorization.
*   **Scan**: QR codes presented by parents/guardians to validate pickup (using `html5-qrcode`).
*   **Approve/Verify**: Validate gate passes upon successful scan.

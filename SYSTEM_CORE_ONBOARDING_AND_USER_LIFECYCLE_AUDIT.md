# SYSTEM CORE ONBOARDING AND USER LIFECYCLE AUDIT

## 1. Architecture
- **Routes & Pages**:
  - `/admin`: `AdminDashboard` serves as the entry point for school administrators.
  - `/onboarding/staff`: `StaffOnboarding` handles new teacher registration.
  - `/onboarding/parent`: `ParentOnboarding` handles child & parent onboarding.
  - `/system-core`: `DiagnosticsPage`
- **RBAC & User Access**: Managed via `src/pages/superadmin/UserAccessTab.tsx`.
- **Services**: 
  - `rbacService.ts`: Handles roles, permissions, and user status toggles.
  - `staffService.ts`: Handles staff creation/updating.
  - `studentService.ts`: Handles student creation, fetching, and normalization.

## 2. User/Member Model
- **Identity Provider**: `auth.users` (Supabase Auth).
- **Core Tables**: 
  - `staff`: Contains name, email, password (legacy), role, assigned_class, `auth_user_id`, and `is_active`.
  - `parents`: Contains name, email, phone, and `auth_user_id`.
  - `students`: Contains roll_no, class_name, guardian details. Students do not log in directly.
  - `student_parents`: Junction table linking `students` and `parents`.
  - `user_roles`: Maps `auth_user_id` to `role_id`.
- **Unique Numbers/Identifiers**: 
  - **Students**: Currently possess a unique `roll_no`.
  - **Staff & Parents**: Rely entirely on UUIDs (`id` or `auth_user_id`). 
  - **Recommendation**: Introduce a human-readable `employee_id` and `parent_id` (or similar unique system number) for easier cross-referencing and bulk operations.

## 3. Active/Inactive Implementation
**Why the Active toggle in User Access Assignment is not working:**
- **UI State**: In `UserAccessTab.tsx`, `user.id` is populated using `staff.auth_user_id || staff.id`. The frontend passes this ID to `handleStatusChange(user.id, !user.is_active)`.
- **Service Layer**: `rbacService.updateUserStatus(staffId, isActive)` receives this ID.
- **Supabase Request**: The service performs `supabase.from('staff').update({ is_active: isActive }).eq('id', staffId);`.
- **The Bug**: It tries to update the `staff` table by matching the `staff.id` primary key with the `auth_user_id`. Because these are two different UUIDs, the query finds no rows and silently fails to update the status.

## 4. Expected Behavior
- Toggling the status switch should instantly update the `is_active` column in the `staff` table.
- A `USER_ACTIVATED` or `USER_DEACTIVATED` audit log should be emitted.
- If inactive, the user should be blocked from logging in (currently implemented in `StaffLogin.tsx`).

## 5. Security
- The `ParentOnboarding` and `StaffOnboarding` routes (`/onboarding/parent`, `/onboarding/staff`) are publicly accessible. Anyone can submit a record without authentication.
- **Recommendation**: Remove the onboarding option for staff and parents from public routes and move them strictly into the protected System Core portal accessible only to authorized roles.
- The `staffService.createStaff` directly inserts into the `staff` table but does not create an `auth.users` record. `StaffLogin.tsx` attempts a "silent shadow migration" using a hardcoded seed password (`Samsidh@123`) to create the auth account later, which is highly insecure and brittle.

## 6. Existing Child Onboarding Form
Located in `ParentOnboarding.tsx`.
- **Current Fields**:
  - `studentPhotoUrl`, `parentPhotoUrl`, `studentName`, `rollNo`, `className`, `guardianName`, `parentPhone`, `pin`.
- **Validation**: Checks for missing fields and duplicate roll numbers via `studentService.findStudentByRollOrId`.
- **Form Field Recommendations (Child & Parent)**:
  - **MUST HAVE**: Student Name, Roll Number (Unique), Class Name, Parent/Guardian Name, Parent Email, Parent Phone, PIN (for Gate Pass), Parent Photo (for verification), System Role (Read-Only mapped directly to 'Parent' in User Access Control).
  - **SHOULD HAVE**: Emergency Contact Number, Relationship Type (Mother/Father/Guardian), Student Photo, Blood Group.
  - **NICE TO HAVE**: Medical Notes/Allergies, Address, Date of Birth.

## 7. Existing Teacher/Staff Onboarding Form
Located in `AddStaffModal.tsx` and `StaffOnboarding.tsx`.
- **Current Fields**: Full Name, Email Address, Password, System Role (Teacher/Guard/Admin), Assigned Class (if Teacher).
- **Service Mapping**: Maps to `staffService.createStaff`. 
- **Missing Fields**: Does not collect Phone Number or proper Role ID assignment mapping (relies on legacy string-based roles instead of `user_roles`).
- **Form Field Recommendations (Teacher/Staff)**:
  - **MUST HAVE**: Employee ID (Unique System Number), Full Name, Official Email Address, System Role (Dropdown mapped directly to User Access Control RBAC roles), Active Status Toggle.
  - **SHOULD HAVE**: Phone Number, Assigned Class/Department (if applicable), Staff Photo.
  - **NICE TO HAVE**: Joining Date, Emergency Contact, Address.

## 8. Bulk Child Onboarding
- **Completely Missing**. There is an "Export CSV" button in the `AdminStudentsList.tsx`, but no "Import CSV" or bulk onboarding utility exists in the UI or services.

## 9. Bulk Teacher/Staff Onboarding
- **Completely Missing**. No bulk import utilities exist for staff.

## 10. Duplicate Protection
- **Child**: The frontend checks if `roll_no` exists before insertion (`studentService.findStudentByRollOrId`). The database also has a `students_roll_no_key UNIQUE` constraint.
- **Staff**: No frontend check is performed. It relies entirely on the Supabase database constraint to reject duplicate emails.

## 11. User Access Assignment
- The `UserAccessTab.tsx` fetches users and their roles from `user_roles` joined with `roles`. It successfully displays users, but role assignment and status toggling suffer from the `auth_user_id` vs `staff.id` mismatch bug.
- **Role Permissions Recommendation**: The Admin portal should include the option for **Admins** (not just Super Users) to active/inactive anyone **except** Super Users. RBAC policies must enforce this hierarchy to prevent privilege escalation.

## 12. All System Core Members
- **Super Admin, Admin, Principal, Teacher, Gate Staff, Parent, Student**. All identities are mapped correctly in the RBAC schema (`roles`, `permissions`, `role_permissions`).

## 13. Audit Logging
- **Current State**: `auditLog` is invoked for `STUDENT_CREATED` (in `studentService.ts`) and `STAFF_CREATED` (in `staffService.ts`).
- **Missing**: There are no audit logs emitted for `ROLE_ASSIGNED`, `USER_ACTIVATED`, or `USER_DEACTIVATED` inside `rbacService.ts`.

## 14. Error Handling
- Supabase errors are wrapped using `handleSupabaseError` and logged via `logger.error` with trace IDs. However, UI feedback for failed RBAC updates lacks specificity because the DB query returns `{ error: null }` (0 rows updated) during the ID mismatch, tricking the UI into showing success.

## 15. Web/Capacitor Impact
- The forms and services are built to run cross-platform (Web/Capacitor). Photo uploads use `PhotoUploadInput`, which correctly interfaces with the device camera or file picker. No native-specific blocking issues were found.

## 16. Database Impact
- The bug in Active/Inactive does not corrupt data, it simply fails to update the target row.
- The `student_parents` table is structurally sound but relies on proper insertions which are not fully handled in the current open onboarding form.

## 17. Improvement Scope
- **Critical Fix**: Update `rbacService.updateUserStatus` to query by `auth_user_id` or pass the correct `staff.id` from the UI.
- **Security**: Remove public access to `/onboarding/parent` and `/onboarding/staff` and migrate them to the System Core portal.
- **Role Permissions**: Update the Admin portal to allow Admins to manage Active/Inactive states for users (excluding Super Users).
- **Identity Sync**: Fix staff onboarding to properly create `auth.users` identities via Supabase Admin API instead of relying on shadow migrations.

## 18. Safe Implementation Phases
1. **Phase 1: Fix RBAC Status Toggle & Admin Permissions**: Correct the ID mismatch in `updateUserStatus`, enforce Admin hierarchy (Admins cannot deactivate Super Admins), and add Audit Logs.
2. **Phase 2: Secure Onboarding**: Relocate the Staff and Parent onboarding forms into the System Core, enforce auth, and expand the forms with recommended fields (Employee ID, etc).
3. **Phase 3: Add Bulk Import Tools**: Implement CSV parsing and bulk insertion for students and staff using the expanded unique identifiers.

## 19. Regression Protection
- The fixes for the RBAC toggle are highly localized in `rbacService.ts` and `UserAccessTab.tsx`. Modifying them will not break the authentication flow for existing users.
- Relying on `auth_user_id` instead of `id` for role mapping prevents UUID conflicts.

## 20. Test Plan
- **Test 1**: Super Admin / Admin navigates to User Access, clicks Active/Inactive toggle. Verify UI updates and `staff.is_active` updates in the database.
- **Test 2**: Verify an Admin cannot deactivate a Super User.
- **Test 3**: Verify `USER_ACTIVATED` and `USER_DEACTIVATED` appear in `audit_logs`.
- **Test 4**: Navigate to old onboarding URLs; verify they are inaccessible or redirected.
- **Test 5**: Submit a duplicate child roll number in Parent Onboarding; verify proper UI error.

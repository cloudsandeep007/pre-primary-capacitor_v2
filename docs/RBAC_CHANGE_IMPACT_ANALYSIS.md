# RBAC Change Impact Analysis

## 1. Scope of the Changeset
Based on the Git working tree, the recently introduced Role-Based Access Control (RBAC) and associated features represent a massive, uncommitted, overarching update to the application. 

### Files Introduced / Untracked
- **Migrations**: `20260821000001_rbac_architecture.sql` through `20260822000030_fee_phase_1.sql` (Approx 20+ SQL files introducing roles, permissions, identities, academics, fees, operations, and audit structures).
- **Contexts**: `src/contexts/PermissionContext.tsx`
- **Services**: `src/services/` (multiple files including `gatePassService.ts`, `feeService.ts`, `studentService.ts` refactored)
- **Documentation**: Multiple markdown audits and checklists.

### Files Modified
- **App Core**: `package.json`, `vite.config.ts`, `src/App.tsx`, `src/main.tsx`
- **Lib**: `src/lib/types.ts`, `src/lib/supabase.ts`, `src/lib/router.tsx`
- **UI Components**: Massive refactor across `src/pages/admin/*`, `src/pages/staff/*`, `src/pages/parent/*`, and `src/pages/gate/*` to utilize new data structures and authentication flows.

## 2. Database Modifications
- **New Tables**: `roles`, `permissions`, `role_permissions`, `user_roles`, `fee_structures`, `student_fees`, `fee_payments`, `application_errors`, `audit_logs`.
- **Functions Added**: `has_permission()`, `get_my_permissions()`, `assign_role()`.
- **RLS Changes**: Heavy modifications to Row Level Security. Policies now utilize the `has_permission('feature.action')` RPC check rather than basic `auth.uid()` checks.

## 3. Architecture Changes
- **Authorization**: Introduced a robust `Role -> Permission Set -> Permissions` model. The frontend fetches a user's permissions via `get_my_permissions` RPC and exposes them via a React Context (`PermissionContext`).
- **Authentication**: Heavy synchronization introduced between `auth.users` (Supabase Auth) and custom tables (`staff`, `students`). 

## 4. Summary
The RBAC change is not just an addition; it is a fundamental re-architecture of the database schema, security model, and frontend service layer. It touches almost every aspect of the codebase.

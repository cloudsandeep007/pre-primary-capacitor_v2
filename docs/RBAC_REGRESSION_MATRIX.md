# RBAC Existing Feature Regression Matrix

| Feature / Module | Current Code Status | RBAC Impact | Typecheck Status | Build Status | Runtime Status | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication (All)** | Modified (Dual Auth) | Direct (Auth + Role Sync) | Passing | Passing | Partially working | High |
| **Admin: Dashboard** | Modified | Indirect | Failing (Recharts type) | Failing | Untested | Low (Fixable TS) |
| **Admin: Students** | Modified | Indirect | Failing (Missing props) | Failing | Untested | Low (Fixable TS) |
| **Admin: Fees** | Modified | DB Schema changed | Failing (Missing props) | Failing | Broken | Medium (Type Sync) |
| **Staff: Homework** | Modified | Indirect | Failing (Null state) | Failing | Untested | Low (Fixable TS) |
| **Staff: Activity Logging** | Modified | Indirect | Failing (Prop typo) | Failing | Untested | Low (Fixable TS) |
| **Gate: Pass Scanning** | Modified | Direct (Role rules) | Failing (Duplicate import, Role mismatch) | Failing | Broken | Low (Fixable TS) |
| **System: Audit Logs** | Modified | Indirect | Failing (Missing Action Types) | Failing | Broken | Low (Fixable TS) |
| **System: Diagnostics** | Modified | Indirect | Failing (Typecast) | Failing | Untested | Low (Fixable TS) |
| **Parent: All Features** | Modified | Indirect | Passing | Passing | Untested | Medium |

## Analysis
- **Build Status**: 100% FAILING. The sheer number of uncommitted files and type mismatches breaks the build completely.
- **Capacitor Mobile Impact**: Because the React build step (`npm run build`) fails, **neither Android nor iOS can be built or synced**.
- **Service Layer Bypass**: The RBAC system utilizes a centralized React Context (`PermissionContext`) calling a Supabase RPC (`get_my_permissions`). Component-level authorization is generally well-structured via `can('feature.action')`. However, the heavy mixing of Supabase Auth (`auth.users`) and public tables (`staff`, `students`) during login creates "shadow identities" (e.g., Gate Login fallback forcing a silent shadow migration).

## Role Compatibility
The system uses strict roles: `staff`, `admin`, `gate_staff`.
Legacy code attempts to use: `gate`.
This mismatch proves that RBAC was forcibly introduced without fully auditing and mapping legacy roles to the new system, breaking the Gate Portal.

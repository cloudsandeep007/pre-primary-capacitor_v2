# RBAC Repair Plan

## Diagnosis
The recent massive changeset introduced Role-Based Access Control (RBAC) along with several feature expansions (Fees, Auditing, Student Management). 
The RBAC architectural design itself is reasonably sound (`Role -> Permission Set -> Permissions` fetched via RPC). 
However, the changeset was incomplete. The developer updated the database schema and UI components but completely failed to update the central TypeScript interfaces (`src/lib/types.ts` and `src/services/*.ts`). 

This resulted in ~40 structural TypeScript errors that completely block the build process, taking down Web, Android, and iOS deployments simultaneously.

---

## OPTION A: Minimal Repair (RECOMMENDED)
**Goal**: Sync the TypeScript interfaces to match reality and fix typos to restore the build without ripping out the new RBAC architecture.

### Steps:
1. **Sync Interfaces**: Add `discount_amount` and `payment_date` to Fee interfaces. Add `created_at` and `gate_pass_pin` to Student interfaces. Add missing actions to Audit logs.
2. **Fix Duplicate Imports**: Clean up `GatePass` imports in the staff and gate screens.
3. **Fix Role Mismatch**: Change legacy `'gate'` role assignments to the strict `'gate_staff'` role required by RBAC.
4. **Fix State Typings**: Handle `null` fallbacks in the Homework panel and Recharts formatters.

**Why Recommended**: The RBAC system is already deeply intertwined in the database migrations and UI. Rolling it back would be extremely destructive. The build errors are superficial TypeScript complaints, not deep architectural failures. Fixing the types takes less than 10 minutes and restores full functionality.

---

## OPTION B: Proper Architectural Repair
**Goal**: Execute Option A, plus refactor the messy Authentication vs Authorization blending.

### Steps:
1. Execute all steps in Option A to restore the build.
2. **Refactor GateLogin.tsx**: Remove the "Silent shadow migration" hack that creates shadow identities. Move identity management strictly to an Admin panel.
3. **Commit State**: The working tree is dangerously dirty. All these changes must be committed sequentially to avoid catastrophic data loss.
4. **Mobile Verification**: Run Capacitor sync and build processes physically to ensure no native plugins were broken by the new auth flow.

---

## OPTION C: Rollback RBAC
**Goal**: Discard all untracked migrations and revert all modified files to `LAST_KNOWN_GOOD_COMMIT`.

**Why NOT Recommended**: We would lose all the work done on Fees, Activity Logging, and Security, setting the project back significantly. Because RBAC can safely coexist if the TypeScript types are simply synced, a rollback is a massive overreaction to a typing mismatch.

# RBAC Error Classification

| Error | File | Line | Feature | Root Cause | RBAC Related? | Evidence | Severity | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `discount_amount` missing | `feeService.ts`, `AdminFinanceView.tsx`, etc | Multiple | Fees / Finance | DB Schema was updated in RBAC Phase C migration, but TS Types were not updated to match. | Yes (Indirect) | `20260821000026_phase_c_fees.sql` adds `discount_amount` | High (Blocks Build) | Update TS Interfaces |
| `payment_date` missing | `feeService.ts`, `AdminFinanceView.tsx`, etc | Multiple | Fees / Finance | DB Schema updated in Phase C, but TS interfaces not synced. | Yes (Indirect) | `20260821000026_phase_c_fees.sql` adds `payment_date` | High (Blocks Build) | Update TS Interfaces |
| Duplicate `GatePass` | `GateDashboard.tsx`, `StaffQRScannerModal.tsx` | 4-9 | Gate / Security | Two different definitions of `GatePass` imported into the same file during development. | No | Basic TS import collision | Low | Remove duplicate import |
| `"gate"` role mismatch | `GateLogin.tsx` | 46 | Gate / Security | RBAC enforces specific canonical roles (`gate_staff`), but legacy mock login assigns `"gate"`. | Yes (Direct) | Role strictly typed as `'staff' \| 'admin' \| 'gate_staff'` in TS | Medium | Update mock role to `'gate_staff'` |
| `created_at` missing | `AdminStudentsList.tsx` | 94 | Admin Students | UI tries to display `created_at` but it is missing from `Student` interface. | No | Common TS mismatch | Medium | Add to `Student` interface |
| `gate_pass_pin` missing | `AdminStudentsList.tsx` | 98 | Admin Students | UI tries to display `gate_pass_pin` but it is missing from `Student` interface. | No | Common TS mismatch | Medium | Add to `Student` interface |
| `AuditAction` mismatch | `academicService.ts`, `settingsService.ts` | 35, 44 | Audit Logging | `CLASS_CREATED`, `SETTINGS_CHANGED` used in code but missing in strict `AuditAction` union type. | No (Likely concurrent feature) | See `audit.ts` types | Medium | Expand union type |
| `null` assigned to string | `HomeworkPanel.tsx` | 82, 84 | Homework | Service returns `null` for subject/date, but React State is typed as `string`. | No | Strict typing issue | Medium | Use fallback `|| ''` |
| `date` vs `log_date` | `activityService.ts` | 115 | Activity Logs | Payload tries to access `date` instead of `log_date`. | No | Typo / property naming | Medium | Use `log_date` |
| `ApplicationError[]` | `diagnosticsService.ts` | 72 | Diagnostics | Incompatible generic overlap from Supabase typing. | No | Generic TS overlap | Low | Add `unknown` cast |
| `Tooltip` formatter | `AdminDashboardOverview.tsx` | 263 | Dashboard | Recharts expects a generic `ValueType` but `number` is hardcoded. | No | Library typing strictness | Low | Use `any` or correct `ValueType` |

## Summary
* **A — Definitely caused by RBAC**: Gate login role mismatch (the introduction of strict RBAC roles invalidated the legacy mock role).
* **D — Database schema/type mismatch**: Fee tracking and finance errors. The RBAC PR author updated the database with new finance/fee features but neglected to update the central TypeScript interfaces (`src/lib/types.ts` & `src/services/feeService.ts`), leaving them out of sync.
* **C — Unrelated existing issues**: Duplicate imports, Recharts typing, React state null handling. These are basic frontend strictness issues that surfaced during the recent heavy refactoring.

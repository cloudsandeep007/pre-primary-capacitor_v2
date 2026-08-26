# Phase 2 Implementation Plan: Monthly & Annual Metrics

## 1. UNDERSTAND THE REQUEST
- **Business Objective:** Give admins the ability to filter fee records by "Monthly" and "Annual" scopes. Ensure the main Admin Dashboard stays in sync with these financial metrics, and add an animated class-wise drilldown for fees on the dashboard.
- **Expected Workflow:** 
  1. The Finance Portal has a toggle (`Monthly` / `Annual`).
  2. The database ledgers are tagged with `due_date` and `fee_period`.
  3. The `AdminDashboardOverview.tsx` has a new "Finance Overview" widget syncing with these calculations.
  4. The Dashboard also includes a new animated chart (using Recharts) to visualize fee collection by class.

## 2. PROPOSED ARCHITECTURE
- **Database Schema Changes (`student_fees`):**
  - Add `due_date` (DATE) and `fee_period` (TEXT) columns to `student_fees`.
  - Backfill existing data using the `fee_structure` definitions.
- **Service Layer (`feeService.ts`):**
  - Update `StudentFee` interface to map the new columns.
  - Update `assignFeeToClass` to populate `due_date` and `fee_period` upon ledger creation.
- **UI Changes (`AdminFinanceView.tsx`):**
  - Add a toggle: `[ Current Month ] | [ Full Year ]`.
  - Update the 4 KPI cards (Total Expected, Collected, Pending, Discounts) to dynamically aggregate *only* the ledgers that fall in the selected time period.
- **UI Changes (`AdminDashboardOverview.tsx`):**
  - Fetch `student_fees` on load.
  - Add an "MRR / Collection" KPI card showing monthly collection stats.
  - Add a Recharts `BarChart` below the attendance heat map showing "Class-wise Fee Collection" with smooth animations.

## 3. IMPACT MATRIX
| Area | Impact | Files | Risk |
|---|---|---|---|
| Database | Add 2 columns, backfill | `20260826000000_add_due_date_to_fees.sql` | Low |
| Service | Map new columns | `feeService.ts` | Low |
| Finance UI | Time toggles & KPI logic | `AdminFinanceView.tsx` | Medium |
| Dashboard UI | Add finance charts/cards | `AdminDashboardOverview.tsx` | Medium |

## 4. REGRESSION RISKS & MITIGATION
- **Risk:** Calculating old ledgers that do not have a `due_date`.
- **Mitigation:** The database migration will actively backfill existing rows. The UI will fall back to treating ledgers without a due date as "Annual" so they are never lost.

---
**STATUS: AWAITING APPROVAL**
I have paused execution per the Master Production Change Control rules. 
Please review this Phase 2 technical proposal. **Reply with "approved"** and I will implement these changes!

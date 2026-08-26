# Phase 1 Implementation Plan: Fee Configuration & Ledger Linkage

## 1. UNDERSTAND THE REQUEST
- **Business Objective:** Bring the `FeeConfigurationTab` back into the main Admin Finance portal so admins can manage fee structures without going to Developer Diagnostics. Link the creation of a Fee Structure directly to the generation of Student Ledgers.
- **Expected Workflow:** 
  1. Admin opens Finance -> Clicks "Fee Structures" tab.
  2. Admin creates a new structure (e.g. Nursery Tuition, ₹15,000/year).
  3. Admin clicks a new "Generate Ledgers" button on that structure.
  4. System automatically finds all active Nursery students and creates their `student_fees` rows for that exact structure.

## 2. PROPOSED ARCHITECTURE
- **UI Changes (`AdminFinanceView.tsx`):**
  - Introduce a sub-tab navigation: "Ledger Overview" and "Fee Configuration".
  - "Ledger Overview" will hold the current student-grouped table.
  - "Fee Configuration" will import and render `<FeeConfigurationTab activeYear={activeYear} />`.
- **UI Changes (`DiagnosticsPage.tsx`):**
  - Remove the "finance-config" tab completely.
- **Service Changes (`feeService.ts`):**
  - Add `generateLedgersForStructure(structureId, academicYear)`: Fetches the structure's `class_name`, finds all students in that class, and mass-inserts `student_fees` (ignoring students who already have a ledger for this structure).
- **UI Changes (`FeeConfigurationTab.tsx`):**
  - Add the "Generate Ledgers" button to each structure card.
  - Show a badge indicating how many ledgers have been generated vs how many students are in the class.

## 3. IMPACT MATRIX
| Area | Impact | Files | Risk |
|---|---|---|---|
| Admin UI | Move components, add tabs | `AdminFinanceView.tsx`, `DiagnosticsPage.tsx` | Low |
| Config UI | Add "Generate Ledgers" button | `FeeConfigurationTab.tsx` | Medium |
| Service | Add `generateLedgersForStructure` | `feeService.ts` | Medium |
| Database | No schema changes | None | None |

## 4. REGRESSION RISKS & MITIGATION
- **Risk:** Generating duplicate ledgers if the button is clicked twice.
- **Mitigation:** The service layer will first fetch existing ledgers for the `fee_structure_id` and filter out any students who already exist, ensuring idempotency.

---
**STATUS: AWAITING APPROVAL**
I have paused execution per the Master Production Change Control rules. 
Please review this Phase 1 technical proposal. **Reply with "approved"** and I will implement these changes!

# Ad-Hoc Fee Collection & Category Visibility Plan

## 1. UNDERSTAND THE REQUEST
- **Business Objective:** Allow admins to collect payments for ANY fee category (Transport, Admission, etc.) directly in the Admin Finance portal, without being artificially restricted to only "Tuition Fee". The finance ledger should display all categories where payments are collected.
- **Current Limitation:** Currently, admins can only click "Collect" on *existing* ledger rows. Since `student_fees` rows are currently only generated via the bulk "Assign to Class" feature (which may have only been run for Tuition), the admin is blocked from collecting payments for other categories on the fly.
- **Expected Workflow:** Admin clicks a "Collect Ad-Hoc / New Fee" button -> Selects a Student -> Selects a Fee Category (from the master list) -> Enters the payment amount. The system dynamically creates the ledger record and the payment receipt in one go.

## 2. PROPOSED ARCHITECTURE & IMPACT ANALYSIS

| Area | Impact | Files | Risk |
|---|---|---|---|
| **UI** | Add "Collect Ad-Hoc Fee" button & modal in `AdminFinanceView`. Dropdowns for Student and Category selection. | `src/pages/admin/AdminFinanceView.tsx` | Low |
| **Services** | Add `createAdhocFeeAndPayment` to `feeService.ts` to handle the transactional insertion of the ledger + payment. | `src/services/feeService.ts` | Low |
| **Database Schema** | **Important:** Currently, `student_fees` relies entirely on `fee_structures` to know its category. To support true Ad-hoc fees without polluting the class-wide structures table, we should add `category_id` directly to `student_fees`. | New Migration SQL | Low-Medium (Standard Alter) |
| **Receipts** | Update `generateFeeReceiptHtml` to read the category directly from the ledger if structure is missing. | `src/lib/receiptUtils.ts` | Low |

## 3. FILES TO MODIFY / CREATE

### **1. `supabase/migrations/[TIMESTAMP]_add_category_to_student_fees.sql` (NEW)**
- **Why:** To safely decouple individual student fees from rigid class-wide structures.
- **Change:**
  ```sql
  ALTER TABLE public.student_fees ADD COLUMN category_id UUID REFERENCES public.fee_categories(id);
  -- Backfill existing records:
  UPDATE public.student_fees sf SET category_id = fs.category_id FROM public.fee_structures fs WHERE sf.fee_structure_id = fs.id;
  ```

### **2. `src/services/feeService.ts` (MODIFY)**
- **Why:** To fetch the new `category_id` and support creating ad-hoc payments.
- **Change:** Update the `fetchStudentFees` Supabase `.select()` query to include `category:fee_categories(*)`. Add `recordAdhocPayment(studentId, categoryId, amount, ...)` which inserts the `student_fees` row and `fee_payments` row in one sequence.

### **3. `src/pages/admin/AdminFinanceView.tsx` (MODIFY)**
- **Why:** To provide the UI for ad-hoc fee collection.
- **Change:** 
  - Add a "Collect Ad-Hoc Fee" button at the top of the Ledger Overview.
  - Implement a Modal with `<select>` for all Students and `<select>` for all `fee_categories`.
  - Update the table rendering to use `l.category?.name || l.structure?.category?.name` so all categories show up correctly.

### **4. `src/lib/receiptUtils.ts` (MODIFY)**
- **Why:** To ensure receipts print the correct category name for ad-hoc fees.
- **Change:** Fallback to `ledger.category?.name`.

## 4. REGRESSION RISKS & ROLLBACK PLAN
- **Risks:** The database migration is non-destructive (adding a nullable column). Existing bulk-assignment workflows remain completely untouched and will continue to work.
- **Rollback:** Drop the `category_id` column from `student_fees` and revert the React files via Git. No data loss for existing tuition workflows.

---
**STATUS: AWAITING APPROVAL**
Please review this plan. **Reply with "approved"** if you'd like me to implement these database, service, and UI changes.

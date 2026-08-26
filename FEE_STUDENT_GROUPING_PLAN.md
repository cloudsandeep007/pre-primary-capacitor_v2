# Admin Finance Redesign — Student-Centric Grouping

## 1. UNDERSTAND THE REQUEST
- **Business Objective:** Shift the Finance Ledger from an "Invoice-centric" view to a "Student-centric" view. Admins want to find a student, click "Collect", and then decide which fee category the student is paying for directly inside the modal.
- **Current Limitation:** The table shows one row per fee. If a student has 3 fees, they appear 3 times. The payment modal is strictly locked to the specific fee row that was clicked.
- **Rollback Request:** Roll back the "Collect New Fee" top-right button UI from the previous implementation, as it splits the workflow unnecessarily.

## 2. PROPOSED ARCHITECTURE & IMPACT ANALYSIS

| Area | Impact | Files | Risk |
|---|---|---|---|
| **Rollback** | Remove the `showAdhocModal` and the top-right "Collect New Fee" button. | `src/pages/admin/AdminFinanceView.tsx` | Low |
| **Data Grouping** | Group the fetched `student_fees` by `student_id`. The main table will now render one row per Student. | `src/pages/admin/AdminFinanceView.tsx` | Medium |
| **Table UI** | Update columns to: Student, Class, Total Expected, Total Paid, Total Pending, Overall Status. | `src/pages/admin/AdminFinanceView.tsx` | Low |
| **Collect Modal** | The "Record Payment" modal will now accept a `Student` object. It will include a "Fee Category" dropdown. The dropdown will dynamically list the student's existing unpaid fees (e.g., Tuition - ₹1,500 due) AND all master categories for ad-hoc creation. | `src/pages/admin/AdminFinanceView.tsx` | Medium |
| **Service Logic** | When the modal submits, the UI will intelligently route to `recordPayment` (if paying an existing invoice) or `recordAdhocPayment` (if creating a new one on the fly). | `src/pages/admin/AdminFinanceView.tsx` | Low |
| **Database** | Keep the `category_id` column added in the last step, as it is fundamentally required for the ad-hoc payments you select in the new dropdown. | N/A | None |

## 3. FILES TO MODIFY

### **1. `src/pages/admin/AdminFinanceView.tsx` (MODIFY)**
- **Rollback:** Delete the standalone Ad-Hoc modal and top-right button.
- **State Changes:** 
  - Change `paymentTarget` to hold `{ studentId, ledgers: StudentFee[] }`.
  - Add `selectedCategoryId` inside the payment modal.
- **Table Rendering:** 
  - Use `useMemo` to group `ledgers` by `student_id`.
  - Map over the grouped students to render the rows.
- **Modal Logic:** 
  - The dropdown will calculate `Pending Balance` based on the selected category.
  - Form submission will check if a ledger already exists for the selected category. If yes, it pays it off. If no, it uses the Ad-hoc service.

## 4. USER EXPERIENCE WORKFLOW
1. Admin opens Finance Portal.
2. Admin sees a list of **Students** (Kavya, Krishu, etc.) and their total pending balances across ALL fees.
3. Admin clicks **"Collect"** next to Kavya.
4. Modal opens: 
   - Dropdown: "Which fee are you collecting?" -> Admin selects "Tuition Fee".
   - The UI auto-fills ₹1,500 pending.
   - Admin records payment.
5. Alternatively, Admin selects "Transport Fee" (which wasn't previously assigned). Admin types ₹500 and records the ad-hoc payment instantly in the same modal.

---
**STATUS: AWAITING APPROVAL**
Please review this plan. **Reply with "approved"** if you'd like me to execute the rollback and implement this Student-centric grouping!

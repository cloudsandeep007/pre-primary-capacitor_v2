# Admin Finance — Student-Centric Grouping

## What Was Completed
1. **Rollback**: The "Collect New Fee" button and the separate Ad-Hoc modal were completely removed from `AdminFinanceView.tsx`.
2. **Student Grouping**: The main Ledger table now groups all individual fee invoices under the respective **Student**. Each row represents one student, showing their Total Due, Total Paid, and Total Pending across all fee categories.
3. **Smart Collection Modal**: Clicking "Collect" next to a student now opens a unified payment modal.
   - You first select a **Fee Category** from the dropdown.
   - The dropdown dynamically lists the student's existing unpaid fees (e.g. Tuition) with their exact pending balance.
   - It also lists all other master categories for instant Ad-Hoc creation.
   - If you select an existing fee, it pays it off. If you select a new category, it instantly creates an ad-hoc ledger for it.
4. **History Verification**: Clicking "History" next to a student now fetches their payment history across *all* fee categories.

## How to Test
1. Make sure your browser tab is refreshed.
2. In the Admin Portal -> Finance tab, verify you now only see **one row per student** instead of multiple rows.
3. Click **Collect** next to DemoStudent.
4. Select "Tuition Fee" to pay off their existing balance.
5. Click **Collect** again, select a new category (like "Transport Fee"), enter an amount, and record a brand new ad-hoc fee instantly in one step!

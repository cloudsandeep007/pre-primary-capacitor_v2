# Finance Engine Test Plan (Phases 1-3)

This test plan covers the newly implemented features for Fee Configuration, Ledger generation, Discount application, and the Monthly/Annual Metrics dashboard integration. 

Please follow these steps in your local web portal (`npm run dev`) to verify that the existing setup is completely unbroken and the new features work perfectly.

## Test Case 1: Master Fee Configuration & Bulk Assignment (Phase 1)
**Goal:** Verify you can create a fee structure and assign it to an entire class without duplicating ledgers.

1. Navigate to **Admin -> Finance**.
2. Click the new **Fee Structures** tab at the top right.
3. Click **"+ New Structure"**.
   - **Class:** `Nursery`
   - **Category:** `Tuition Fee`
   - **Amount:** `5000`
   - **Frequency:** `Monthly`
   - **Due Date:** Select a date in the *current* month.
   - Click **Add**.
4. Locate your new structure in the table and click the **purple "Assign to Class" (Users icon)** button on the right side.
5. In the modal, read the summary and click **"Assign to Class"**.
6. **Expected Result:** A success toast appears saying it generated ledgers for students in that class. 

## Test Case 2: Ad-Hoc Payments & Discounts (Phase 1)
**Goal:** Verify you can collect money and apply discounts to a specific student seamlessly.

1. Navigate to **Admin -> Finance** and switch back to the **Ledger Overview** tab.
2. Find a student who is in `Nursery` (the class you just assigned the fee to).
3. **Applying a Discount:**
   - Click the **yellow percent (%) icon** for that student.
   - Select the `Tuition Fee` from the dropdown.
   - Enter `500` as the discount amount and a reason (e.g., "Early bird").
   - Click **Apply Discount**.
   - **Expected Result:** The total pending amount in the background table instantly drops by ₹500.
4. **Collecting a Payment:**
   - Click the **green "Collect" (Dollar icon)** button for the same student.
   - Select the `Tuition Fee` from the dropdown. Notice it shows the discounted pending amount.
   - Enter the full pending amount.
   - Click **Record Payment**.
   - **Expected Result:** A success toast appears with the Receipt ID, and the student's row updates to show the amount is fully paid.
5. **Print Receipt:**
   - Click the **blue "History" (Clock icon)** button for the same student.
   - Find the payment you just made and click **Print**.
   - **Expected Result:** The print preview opens, and the receipt explicitly shows the `₹500` Discount Applied.

## Test Case 3: Monthly vs Annual Metric Toggles (Phase 2)
**Goal:** Verify the time-based filters instantly recalculate expected and collected revenues.

1. Stay on the **Admin -> Finance -> Ledger Overview** tab.
2. Look at the 4 KPI cards at the top (Total Expected, Collected, Pending, Discounts).
3. Click the **"Full Year"** toggle button.
   - **Expected Result:** The KPI cards show the absolute total revenue for all ledgers across the entire 2026-2027 year.
4. Click the **"Current Month"** toggle button.
   - **Expected Result:** The KPI cards instantly drop, showing *only* the revenue expected/collected from fees that have a due date in the current month.

## Test Case 4: Dashboard Synchronization & Class-wise Animation (Phase 3)
**Goal:** Verify the Finance data is completely synced with the main Admin Dashboard, including the Recharts breakdown.

1. Navigate to **Admin -> Dashboard**.
2. Locate the **Fee Collection** KPI widget (with the Dollar icon).
3. Change the dropdown inside the widget between **"Monthly"** and **"Annual"**.
   - **Expected Result:** The percentage, the progress bar (Green/Red), and the raw ₹ Paid/Pending amounts recalculate dynamically based on your selection.
4. Scroll down slightly to the new **Finance Class-wise Insight Row**.
   - **Expected Result:** You see a beautiful, animated Recharts stacked bar chart. 
   - Hover your mouse over the bars to see the Tooltip breaking down the exact ₹ Collected vs ₹ Pending for each specific class.
   - Notice the chart title updates dynamically depending on whether you selected Monthly or Annual in the KPI widget above.

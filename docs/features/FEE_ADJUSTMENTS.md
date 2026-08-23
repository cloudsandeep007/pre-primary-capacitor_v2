# Fee Adjustments & Corrections Design
## Adjustments (Discounts, Scholarships, Concessions)
- Can be fixed amount or percentage.
- Tracked distinctly from payments.
- Required fields: Type, Amount/Percent, Reason, Approved By.

## Corrections (Reversals)
- If a manual payment of ₹10,000 was entered but should be ₹8,000:
- **Do not silently edit the payment record.**
- **Process**: Issue a Reversal for the ₹10k, and create a new Payment for ₹8k.
- Both operations are logged in `audit_logs`.

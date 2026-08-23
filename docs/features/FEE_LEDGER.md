# Fee Ledger Design
## Concept
A chronological history of all financial interactions for a specific student.

## Ledger Columns
- Date
- Description (e.g., "Tuition Fee Demand", "Manual Payment")
- Due Amount (Debit)
- Received Amount (Credit)
- Balance

## Integrity
The ledger must be calculated directly from immutable transaction records (Assignments, Adjustments, Payments). Do not store a detached "total balance" that cannot be explained by the ledger.

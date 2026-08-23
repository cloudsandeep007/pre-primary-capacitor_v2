# Fee Database Design

## Proposed Tables
## Proposed New Tables (Extending Phase C)
1. `fee_installments`: ID, StudentFeeID (FK to student_fees), DueDate, AmountDue, AmountPaid, Status.
2. `fee_payment_allocations`: ID, PaymentID (FK to fee_payments), InstallmentID, AllocatedAmount.
3. `fee_adjustments`: ID, StudentFeeID (FK to student_fees), Type, Amount, Reason, ApprovedBy, Date.

## Reused Existing Tables (From `20260821000026_phase_c_fees.sql`)
- `fee_structures` (Already exists: defines base fees)
- `student_fees` (Already exists: maps structures to students, tracks total_due and discounts)
- `fee_payments` (Already exists: the manual ledger tracking actual money received)
- `students`
- `staff`
- `parents`
- `audit_logs`
- `application_errors`

## Integrity Constraints
- Positive amounts only (Check constraints).
- Unique ReceiptNo per academic year.
- Valid foreign keys with NO CASCADE DELETE (prevent accidental financial wiping).

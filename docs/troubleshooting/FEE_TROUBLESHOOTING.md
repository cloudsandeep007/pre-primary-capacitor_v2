# Fee Troubleshooting SOP

## Scenario 1: Payment Entry Fails
- **Symptom**: User clicks Save, gets error toast.
- **Check**: Browser Console -> Logger Trace ID -> `application_errors` table.
- **Fix**: Often RLS blocking the insert, or check constraint (e.g., negative amount). Verify user role.

## Scenario 2: Balance Incorrect
- **Symptom**: Ledger shows ₹10k, but math says ₹8k.
- **Check**: Sum `fee_payment_allocations` vs `fee_payments`. Check for unallocated payments or orphaned adjustments.
- **Fix**: Re-allocate via admin adjustment tool. Never directly edit the `fee_installments` total manually.

## Scenario 3: Parent Cannot See Fees
- **Symptom**: Parent dashboard shows no fees.
- **Check**: `student_fee_assignments` academic year matches current. Check parent-student relationship table.
- **Fix**: Link parent to student properly.

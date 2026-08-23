# Parent Fee View Design
## Concept
A read-only portal for parents to view their own child's financial status.

## Elements
- **Overview Widget**: Total Payable, Received, Pending, Overdue, Next Due Date.
- **Installment Schedule**: List of upcoming and past due installments.
- **Payment History**: List of past payments with receipt references.

## Security Constraint
Must be heavily restricted by Supabase RLS. A parent can only view records where `student_id` maps to their `parent_id` in the relationship table.

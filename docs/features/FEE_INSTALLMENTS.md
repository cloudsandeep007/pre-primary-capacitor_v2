# Fee Installments Design
## Concept
Break down large annual fees into scheduled payments (monthly, quarterly, custom).

## Properties
- **Amount Due**: The fraction of the total fee assigned to this installment.
- **Due Date**: The deadline for payment.
- **Remaining Balance**: Amount Due minus Allocated Payments.
- **Status**: PENDING, PARTIALLY_PAID, PAID, OVERDUE, WAIVED, CANCELLED.

## Tracking
Installments track exactly what is owed and when. Payments allocate against installments sequentially or specifically by user choice.

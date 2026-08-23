# Manual Payment Entry Workflow
## Purpose
To record offline payments (Cash, UPI, Cheque, Bank Transfer) into the system.

## Entry Fields
- Student & Academic Year
- Payment Date & Mode
- Amount Received
- Reference Number (e.g., UPI TXN ID) & Receipt Number
- Collected By (Auto-captured from session)
- Remarks

## Safety Flow
1. Staff enters details.
2. UI displays confirmation modal: "Record payment of ₹X for [Student]?"
3. Upon confirmation, data is sent to `FeeService`.
4. Service validates (no negative, no overpayment unless allowed).
5. Success generates a success toast with the Receipt Number.

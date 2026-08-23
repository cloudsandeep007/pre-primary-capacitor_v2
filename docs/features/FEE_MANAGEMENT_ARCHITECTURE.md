# Fee Management Architecture
## Overview
The Fee Management module is a manual recording and tracking system for school fees. **It is NOT an online payment system.** 

## Core Principles
1. **Manual Entry Only**: No payment gateways. All money is received outside the app.
2. **Integration**: Leverages existing `students`, `staff`, `audit_logs`, and `application_errors` tables.
3. **Data Integrity**: Financial records are historical. Corrections require audit trails.
4. **Architecture Flow**: UI -> Fee Service -> Validation -> Logger/Audit -> Supabase.

## High-Level Components
- **Fee Structures**: Configurable templates (Academic Year, Class, Category, Amount).
- **Student Assignments**: Mapping structures to students with custom net payable (after discounts).
- **Manual Payment Entry**: Staff records received amounts, modes, and receipt numbers.
- **Payment Allocation**: Logic to distribute a lump-sum payment across specific fee categories.
- **Ledger & Balances**: Immutable historical transaction list generating the current balance.

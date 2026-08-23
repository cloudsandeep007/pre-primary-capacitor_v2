# Fee Security & RLS Architecture
## Principles
- Fees are highly sensitive PII.
- No `USING (true)` for read access.

## RLS Policies
- **Parents**: `SELECT` on assignments/payments where `student_id IN (SELECT student_id FROM parent_relationships WHERE parent_id = auth.uid())`
- **Teachers**: Generally NO ACCESS, unless explicitly granted `fees.view` permission via RBAC.
- **Accountant / Admin**: Granted access via `system.manage` or specific `fees.manage` capability.

## Audit Requirement
Every mutation (Insert/Update) to fee tables MUST trigger an entry in `audit_logs`.

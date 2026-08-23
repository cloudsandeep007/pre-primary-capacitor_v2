# 15 Services Architecture

## Overview
Introduced in Phase 2, the Service Layer sits between React components and Supabase.

## Responsibilities
1. **Data Fetching & Mutations:** Execute Supabase queries.
2. **Error Handling:** Catch Supabase errors, map them to standard AppErrors (e.g., `HOMEWORK-001`), and log them via `logger.ts`.
3. **Payload Sanitization:** Ensure frontend data (like string IDs) is stripped or formatted before being sent to PostgreSQL (which expects UUIDs).
4. **Audit Logging:** Trigger `auditLog()` for important actions (e.g., creating announcements, staff, or approving gate passes).

## Example Pattern
```typescript
async createItem(payload: Partial<Item>): Promise<{error: any}> {
    try {
        const dbPayload = { name: payload.name }; // Strip local IDs
        const { error } = await supabase.from('items').insert(dbPayload);
        if (error) throw error;
        
        auditLog({ action: 'ITEM_CREATED', ... });
        return { error: null };
    } catch (err) {
        const appErr = handleSupabaseError(err, 'ITEM-001');
        logger.error('ITEM_CREATE_ERROR', { error: appErr });
        return { error: appErr };
    }
}
```

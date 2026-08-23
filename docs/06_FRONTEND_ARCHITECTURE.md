# 06 Frontend Architecture

## React Architecture
- **Framework:** React 18 using Vite.
- **Routing:** Custom hash-based router (`src/lib/router.tsx`) to support simple SPA navigation (e.g., `/#/staff`).
- **State Management:** Local React state (`useState`, `useEffect`). Props are passed down to components. No Redux/Context API is currently globally enforced for data.

## Reusable Components
- `Toast.tsx`: Unified notification system.
- `ErrorBoundary.tsx`: Wraps portals to prevent cascading crashes.
- `Spinner.tsx`: Standardized loading indicator.

## Golden Rule
**UI should NOT directly implement database calls.**
Instead of:
```typescript
const { data } = await supabase.from('users').select();
```
Use:
```typescript
const data = await userService.getUsers();
```

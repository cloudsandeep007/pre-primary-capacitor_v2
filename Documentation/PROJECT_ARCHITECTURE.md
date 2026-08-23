# PROJECT_ARCHITECTURE.md

## 1. Frontend Framework and Version
*   **Framework**: React
*   **Version**: ^18.3.1 (React and React DOM)
*   **Build Tool**: Vite (^5.4.2)
*   **PWA Support**: Yes (vite-plugin-pwa ^1.3.0, workbox-window ^7.4.1)

## 2. Programming Languages
*   **Language**: TypeScript (^5.5.3)
*   **Styling**: CSS (with Tailwind)

## 3. Build System
*   **Builder**: Vite
*   **Configuration**: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

## 4. Routing System
*   **Type**: Custom Hash-based Routing
*   **File**: `src/lib/router.tsx`
*   **Mechanism**: Uses `window.location.hash` to determine the active route (e.g., `/#/staff`, `/#/parent`). Does not use `react-router-dom`.
*   **Routes**: `/`, `/staff`, `/parent`, `/admin`, `/gate`, `/onboarding/staff`, `/onboarding/parent`, `/system-core`

## 5. Styling System
*   **Framework**: Tailwind CSS (^3.4.1)
*   **Plugins/Extensions**: Autoprefixer (^10.4.18), PostCSS (^8.4.35)
*   **Configuration**: `tailwind.config.js`, `postcss.config.js`
*   **Icons**: `lucide-react` (^0.446.0)

## 6. Backend Architecture
*   **Provider**: Supabase (BaaS)
*   **Client Library**: `@supabase/supabase-js` (^2.57.4)
*   **Client Configuration**: `src/lib/supabase.ts`

## 7. Supabase Usage
*   **Services Used**:
    *   PostgreSQL Database (CRUD operations via REST API)
    *   Auth (Authentication and User Management)
    *   Storage (File/Image Uploads)
    *   Realtime (Channels for live updates)
    *   RPC (Remote Procedure Calls for complex operations)
*   **Local/Remote Setup**: Migrations and schema are managed via Supabase CLI in the `supabase/` folder.

## 8. Authentication System
*   **Method**: Supabase Auth (Email/Password)
*   **Implementation**: `supabase.auth.signInWithPassword`, `supabase.auth.getSession`, `supabase.auth.signOut`
*   **Role-Based Access Control (RBAC)**: Custom RBAC implemented via a `permissions` context and Supabase RPCs (e.g., `get_my_permissions`). Roles are fetched after login.

## 9. Database Interaction
*   **Pattern**: Service classes (e.g., `academicService.ts`, `studentService.ts`, `staffService.ts`) encapsulate database calls.
*   **Operations**: Standard `select`, `insert`, `update`, `delete`, and `upsert` using the Supabase client.

## 10. Realtime Functionality
*   **Usage**: Used for diagnostics (`__diagnostics_hc__` channel).

## 11. File Storage
*   **Provider**: Supabase Storage
*   **Usage**: Uploading photos/documents (e.g., `child-photos` bucket, used in `PhotoUploadInput.tsx` and `storageService.ts`).

## 12. External Services
*   **QR Code Generation**: `qrcode` (renders to canvas)
*   **QR Code Scanning**: `html5-qrcode` (accesses camera via browser APIs)
*   **PDF Generation**: `jspdf` and `html2canvas` (converts DOM elements to PDF)

## 13. Environment Variables and Configuration Requirements
*   `VITE_SUPABASE_URL`: The URL of the Supabase instance.
*   `VITE_SUPABASE_ANON_KEY`: The anonymous API key for the Supabase instance.
*   Managed via `.env` files and accessed via `import.meta.env`.

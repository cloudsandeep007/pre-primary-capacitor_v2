# 02 Quick Start

## 1. Required Software
- Node.js (v18+)
- npm (v9+)
- Git

## 2. Required Versions
- React: 18.x
- Vite: 5.x
- Supabase JS Client: 2.x

## 3. Clone Repository
```bash
git clone <repository_url>
cd pre-primary_V1
```

## 4. Install Dependencies
```bash
npm install
```

## 5. Environment Variables
Create a `.env.local` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 6. Local Configuration
Ensure `src/lib/supabase.ts` is pointing to the environment variables and not using hardcoded keys for production.

## 7. Supabase Configuration
Apply the database migrations in order:
```bash
supabase db push
```
*(UNKNOWN — REQUIRES VERIFICATION: Confirm if Supabase CLI is used locally for this project)*

## 8. Start Development Server
```bash
npm run dev
```

## 9. Build Application
```bash
npm run build
```

## 10. Run Tests
```bash
# NOT VERIFIED (No test runner currently configured)
npm run test
```

## 11. Common Setup Errors
- **Missing .env.local:** Application falls back to hardcoded keys (if present) or throws connection errors.
- **Port 5173 in use:** Vite will start on a different port.

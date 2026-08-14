# SAMSIDH PRESCHOOL APP: DEVELOPER'S FUNCTIONALITY COMPENDIUM

This document serves as an exhaustive, technical breakdown of every single feature in the application. It is written for incoming developers to understand the exact coding paradigms, state management, and architectural decisions without needing to read the raw source code.

---

## 1. CORE ARCHITECTURE & ROUTING

### 1.1 Single Page Application (SPA) Routing
*   **Feature:** Navigating between Parent, Staff, and Gate portals without page reloads.
*   **Technical Approach:** The app avoids heavy routing libraries (like `react-router-dom`) to maintain a minimal bundle size. Instead, it relies on a custom Hash Router built on `window.location.hash`. 
*   **Code Flow:** 
    *   `App.tsx` listens to the `hashchange` browser event.
    *   If the URL is `#/staff`, the `currentPath` state updates, and React conditionally renders `<StaffPortal />`.
    *   If the user hits the back button, the hash changes, triggering a re-render to the previous component.

### 1.2 Global Error Boundary
*   **Feature:** Preventing the "White Screen of Death" if a React component throws a JavaScript error.
*   **Technical Approach:** React 18 Error Boundaries.
*   **Code Flow:** `src/components/ErrorBoundary.tsx` implements `componentDidCatch` and `getDerivedStateFromError`. It wraps the entire application in `main.tsx`. If an error bubbles up, it intercepts the crash and renders a fallback UI ("Something went wrong") with a button to reload the page.

### 1.3 Progressive Web App (PWA) & Service Workers
*   **Feature:** Offline installation, caching, and update prompts.
*   **Technical Approach:** Vite PWA Plugin + Workbox.
*   **Code Flow:**
    *   `vite.config.ts` injects the PWA manifest (icons, theme color).
    *   `public/sw.js` caches all static assets (HTML/CSS/JS) on first load.
    *   `PWAUpdatePrompt.tsx` uses `virtual:pwa-register` to listen for the `needRefresh` event. If a new service worker is detected (meaning new code was deployed), it prompts the user to "Refresh App".

---

## 2. STATE MANAGEMENT & AUTHENTICATION

### 2.1 "Passwordless" Parent Authentication
*   **Feature:** Parents log in using just phone and email.
*   **Technical Approach:** Supabase Table lookups + `localStorage` persistence.
*   **Code Flow:**
    *   `ParentLogin.tsx` sends a Supabase SQL equivalent: `SELECT * FROM students WHERE guardian_phone = X AND guardian_email = Y LIMIT 1`.
    *   If a row is returned, the JSON payload is serialized via `JSON.stringify()` and stored in `localStorage.getItem('samsidh_parent')`.
    *   `ParentPortal.tsx` acts as a Higher Order Component (HOC). It checks `localStorage` on mount. If a student object exists, it hydrates a React state and passes the `Student` object as a prop to all child tabs (`ParentFeed`, `MessagesTab`, etc.).

### 2.2 Teacher Role Authentication
*   **Feature:** Teachers log in securely with passwords and roles.
*   **Technical Approach:** Basic table credential matching (Supabase Auth is bypassed to keep the code purely table-driven for simplicity).
*   **Code Flow:**
    *   `StaffLogin.tsx` queries the `staff` table for matching email/password.
    *   It strictly verifies that `staff.role === 'teacher'`. If the role is `gate_staff`, access is explicitly denied in the frontend logic.
    *   The Staff object is cached in `localStorage('samsidh_staff')`.

---

## 3. DATA FETCHING & OFFLINE RESILIENCE

### 3.1 Optimistic UI & Promise Racing
*   **Feature:** The app never freezes if the internet is slow.
*   **Technical Approach:** `Promise.race()` combined with local state injection.
*   **Code Flow (Example: Posting an Announcement):**
    *   When the teacher clicks 'Post', a `Promise.race` is initialized with two runners: the Supabase `insert()` call, and a `setTimeout` of 3000ms that rejects with a "timeout" error.
    *   If the network drops, the timeout wins. The `catch(e)` block executes.
    *   The `catch` block generates a temporary ID (`local-id-12345`).
    *   The app creates a mock `Announcement` object with this local ID and pushes it into the `setAnnouncements(prev => [newObject, ...prev])` React state array.
    *   The UI updates instantly, appearing successful to the user.

### 3.2 Background Polling (Real-time Sync)
*   **Feature:** Chat messages and announcements appear instantly on other devices.
*   **Technical Approach:** React `useEffect` + `setInterval`.
*   **Code Flow:**
    *   In `MessagesTab.tsx`, a `useEffect` hook initializes `setInterval(fetchAnnouncements, 5000)`.
    *   Every 5 seconds, an asynchronous request asks Supabase for the latest data where `class_name` matches the user's context.
    *   Crucially, `setLoading(true)` is **omitted** from these background fetches. When data returns, `setAnnouncements(data)` triggers a Virtual DOM diff. If a new row exists, React injects just that DOM node, preventing screen flashing.

---

## 4. DOMAIN-SPECIFIC FEATURES

### 4.1 Daily Activity Logging
*   **Feature:** Teachers record student activities (Food, Sleep).
*   **Technical Approach:** Modal Forms and Custom Events.
*   **Code Flow:**
    *   `ActivityFormModal.tsx` controls form state. Upon submit, it constructs an object matching the Supabase `logs` schema (`student_id`, `type`, `description`, `timestamp`).
    *   After inserting to Supabase, it fires `window.dispatchEvent(new CustomEvent('log_added'))`.
    *   `StaffDashboard.tsx` listens to this event on the `window` object. When caught, it re-fetches logs to update the UI without needing heavy global state management (like Redux or Context API).

### 4.2 Gate Pass Cryptography & Scanning
*   **Feature:** Parents generate a secure QR code; Guards scan it.
*   **Technical Approach:** Client-side QR generation (`qrcode.react`) and WebRTC Camera parsing (`html5-qrcode`).
*   **Code Flow (Generation):**
    *   `ParentGatePassModal.tsx` inserts a row into `gate_passes` (status: `PENDING`) and retrieves the UUID primary key.
    *   It converts a JSON object (`{"pass_id": "UUID", "student_id": "UUID"}`) into a Base64 QR code image using `<QRCodeCanvas />`.
*   **Code Flow (Scanning):**
    *   `GateDashboard.tsx` mounts `Html5QrcodeScanner`. This requests camera permissions (`getUserMedia`).
    *   The scanner parses frames 10 times a second. On success, it executes a callback passing the decoded JSON string.
    *   `JSON.parse()` extracts the IDs. The app fetches the student's photo from Supabase and displays it.
    *   Upon pressing "Confirm Handover", an `UPDATE` SQL equivalent is sent: `UPDATE gate_passes SET status = 'COMPLETED' WHERE id = pass_id`.

### 4.3 Two-Way Chat (Homework & Announcements)
*   **Feature:** Teachers and Parents can reply to specific threads.
*   **Technical Approach:** Relational database querying and polymorphic sender types.
*   **Code Flow:**
    *   **Data Model:** `announcement_replies` table uses a foreign key (`announcement_id`) to link to a parent post.
    *   **Sender Resolution:** The schema uses `sender_type` ('teacher' or 'parent') and `sender_name`.
    *   When a parent replies, the frontend dynamically interpolates their name: ``sender_name: `${student.guardian_name} (${student.name})` ``.
    *   When the UI renders the chat bubbles, it checks `reply.sender_type`. If 'teacher', it applies a `ml-auto bg-violet-100` Tailwind class to push the bubble to the right side of the screen, mirroring WhatsApp/iMessage styling.

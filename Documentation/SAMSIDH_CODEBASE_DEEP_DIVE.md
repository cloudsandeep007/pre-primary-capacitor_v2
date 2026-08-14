# SAMSIDH CODEBASE DEEP DIVE: THE ULTIMATE PROGRAMMER'S MANUAL

This document is the absolute ground-truth technical manual for a developer entering the Samsidh codebase. It explains not just *what* the application does, but exactly *how* it is written, including the exact React hooks used, the exact Supabase SQL queries executed under the hood, and the precise state shapes. 

By reading this, a new programmer can understand the codebase without immediately reading thousands of lines of source code.

---

## 1. REACT STATE & PORTAL ROUTING ENGINE
**Files:** `App.tsx`, `main.tsx`, `lib/router.tsx`

### Technical Implementation:
The app avoids `react-router-dom` to reduce bundle size. Instead, it uses a custom hash-based routing engine.

*   **Hook Usage:** `App.tsx` uses `const [currentPath, setCurrentPath] = useState(window.location.hash)`.
*   **Event Listener:** Inside a `useEffect`, it attaches `window.addEventListener('hashchange', () => setCurrentPath(window.location.hash))`.
*   **Conditional Rendering:** A simple `switch` statement reads `currentPath`. If it is `#/staff`, it returns `<StaffPortal />`. If `#/parent`, it returns `<ParentPortal />`.
*   **Error Boundary:** `main.tsx` wraps `<App />` in `<ErrorBoundary />`. If a child component throws an error, `ErrorBoundary.tsx` uses the React lifecycle method `componentDidCatch(error, errorInfo)` to log the stack trace to the console and `static getDerivedStateFromError()` to flip a `hasError` boolean state to `true`, rendering a safe fallback UI.

---

## 2. THE SUPABASE CLIENT LAYER
**Files:** `lib/supabase.ts`, `lib/types.ts`

### Technical Implementation:
*   **Initialization:** `supabase.ts` uses `@supabase/supabase-js`. It exports a singleton instance: `export const supabase = createClient(URL, KEY)`.
*   **TypeScript Enforcement:** `types.ts` provides strictly typed interfaces. For example, `export interface Log { id: string; student_id: string; type: 'food' | 'sleep' | 'activity'; description: string; timestamp: string; }`. Every component that fetches from Supabase casts the response to these types (e.g., `data as Log[]`), ensuring compiler safety.

---

## 3. PARENT PORTAL ARCHITECTURE

### 3.1 Authentication (`ParentLogin.tsx`)
*   **React State:** `useState` tracks `phone` and `email` string inputs.
*   **Query:** When the `<form onSubmit={handleLogin}>` fires, it calls `e.preventDefault()` and runs:
    ```javascript
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('guardian_phone', phone)
      .eq('guardian_email', email)
    ```
*   **Persistence:** If `data.length > 0`, it calls `localStorage.setItem('samsidh_parent', JSON.stringify(data[0]))` and triggers the `onLogin` prop callback to update `ParentPortal`'s state.

### 3.2 The Daily Timeline (`ParentFeed.tsx`)
*   **React State:** `const [logs, setLogs] = useState<Log[]>([])` and `const [loading, setLoading] = useState(true)`.
*   **Fetching:** A `useEffect` hook with `[student.id]` as the dependency array triggers `fetchLogs()`.
*   **Query:** `supabase.from('logs').select('*').eq('student_id', student.id).order('timestamp', { ascending: false })`.
*   **Rendering:** The JSX maps over `logs`. A switch statement on `log.type` determines the icon: if `type === 'food'`, it renders an Apple icon with a green background; if `sleep`, a Moon icon with an indigo background.

### 3.3 Two-Way Chat Sync (`MessagesTab.tsx`)
*   **Polling Interval:** 
    ```javascript
    useEffect(() => {
      const intervalId = setInterval(() => {
        fetchAnnouncements();
        fetchRepliesAll();
      }, 5000);
      return () => clearInterval(intervalId); // Cleanup to prevent memory leaks
    }, [student.class_name]);
    ```
*   **Querying Replies:** `fetchRepliesAll` collects all `announcement_id`s currently in state and uses the `.in('announcement_id', ids)` Supabase modifier to fetch all related replies in a single network request, avoiding the "N+1 query problem".
*   **Sending Replies:** The parent types in a textarea bound to `replyText`. On submit, an `INSERT` is made to `announcement_replies`. The `sender_name` is dynamically constructed as `` `${student.guardian_name} (${student.name})` ``.

---

## 4. STAFF PORTAL ARCHITECTURE

### 4.1 Dashboard & Student Grid (`StaffDashboard.tsx`)
*   **Data Hydration:** Fetches all students where `.eq('class_name', staff.assigned_class)`.
*   **Event Driven Syncing:** To update the UI when a teacher logs an activity in a modal, it listens for a custom DOM event:
    ```javascript
    useEffect(() => {
      const handleLogAdded = () => fetchStudents(); // Re-fetch to update "Last updated" timestamps
      window.addEventListener('log_added', handleLogAdded);
      return () => window.removeEventListener('log_added', handleLogAdded);
    }, []);
    ```

### 4.2 Optimistic Form Submission (`ActivityFormModal.tsx`)
*   **State:** Uses multiple `useState` hooks for `type`, `description`, `amount` (for food), `duration` (for sleep).
*   **Timeout Racing:** To prevent the app from freezing on bad Wi-Fi, the submit function wraps the Supabase call in a `Promise.race`:
    ```javascript
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    await Promise.race([
      supabase.from('logs').insert({ student_id: student.id, type, description }),
      timeout
    ]);
    ```
    If the timeout wins, the catch block generates a mock `Log` object and relies on local state, dispatching the `log_added` event anyway.

---

## 5. GATE STAFF & CRYPTOGRAPHY ARCHITECTURE

### 5.1 QR Code Generation (`ParentGatePassModal.tsx`)
*   **Database Interaction:** Generates a new `gate_passes` row with `status: 'PENDING'`.
*   **Library:** Uses `qrcode.react`.
*   **Rendering:** `<QRCodeCanvas value={JSON.stringify({ pass_id: id, student_id: student.id })} size={256} />`. This component utilizes the HTML5 `<canvas>` API to draw a high-density 2D barcode that can't be easily screenshotted and manipulated.

### 5.2 Video Frame Parsing (`GateDashboard.tsx`)
*   **Library:** Uses `html5-qrcode`.
*   **Camera Initialization:** A `useEffect` hook instantiates the scanner when the modal opens:
    ```javascript
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    scanner.render(onScanSuccess, onScanFailure);
    ```
*   **Parsing Logic:** 
    1. `onScanSuccess` receives raw string text.
    2. `JSON.parse(decodedText)` attempts to extract `pass_id` and `student_id`.
    3. The app executes `supabase.from('students').select('*').eq('id', student_id)`.
    4. React state updates, displaying the student's photo and name.
    5. The guard physically verifies the photo.
    6. Clicking "Confirm" runs `supabase.from('gate_passes').update({ status: 'COMPLETED' }).eq('id', pass_id)`.
    7. `scanner.clear()` is called to shut down the camera stream and free device memory.

---

## 6. CSS & TAILWIND STYLING PATTERNS
*   **Dynamic Class Names:** The app heavily relies on ES6 template literals to apply conditional Tailwind classes based on state.
    *   *Example in Chat:* 
        ```javascript
        className={`p-3 rounded-xl ${reply.sender_type === 'teacher' ? 'bg-violet-100 ml-auto' : 'bg-white border'}`}
        ```
    *   This logic forces teacher replies to the right (`ml-auto` pushes the flex item to the right edge) with a violet background, while parent replies stay on the left with a white background.

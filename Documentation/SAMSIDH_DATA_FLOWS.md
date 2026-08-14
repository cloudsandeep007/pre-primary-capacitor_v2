# SAMSIDH PRESCHOOL APP: INTERNAL DATA FLOWS & REQUEST LIFECYCLES

This document is an extreme deep-dive into the internal request cycles, component lifecycles, and database interactions of the Samsidh Preschool Application. It maps out exactly how data moves from the user's screen (Frontend React Components) across the network to the database (Supabase) and back to other users.

---

## 1. AUTHENTICATION & SESSION DATA FLOW

The application does not use traditional session cookies or JWT tokens for its primary portals. Instead, it relies on a local state mechanism verified against database records. 

### 1.1 Parent Login Flow
When a parent attempts to log in, the system validates their phone number and email against the `students` table to find their child.

```mermaid
sequenceDiagram
    participant Parent as Parent (Browser)
    participant UI as ParentLogin.tsx
    participant Supabase as Supabase API
    participant DB as 'students' Table

    Parent->>UI: Enters Phone & Email
    UI->>UI: Validates input length/format
    UI->>Supabase: supabase.from('students').select('*').eq('guardian_phone', phone).eq('guardian_email', email)
    Supabase->>DB: SQL SELECT
    
    alt Match Found
        DB-->>Supabase: Returns [Student Object]
        Supabase-->>UI: Data payload
        UI->>UI: localStorage.setItem('samsidh_parent', JSON.stringify(student))
        UI->>ParentPortal.tsx: onLogin(student) updates React State
        ParentPortal.tsx-->>Parent: Renders ParentFeed.tsx
    else No Match
        DB-->>Supabase: Returns []
        Supabase-->>UI: Empty array
        UI-->>Parent: Shows Error Toast ("Invalid credentials")
    end
```

### 1.2 Staff Authentication Flow
Staff login explicitly relies on the `staff` table and validates the role.

```mermaid
sequenceDiagram
    participant Teacher
    participant UI as StaffLogin.tsx
    participant DB as 'staff' Table

    Teacher->>UI: Submits Email & Password
    UI->>DB: supabase.from('staff').select('*').eq('email').eq('password')
    
    alt Valid Teacher
        DB-->>UI: Returns Staff Object (role: 'teacher')
        UI->>UI: Validates role !== 'gate_staff'
        UI->>UI: localStorage.setItem('samsidh_staff', ...)
        UI-->>Teacher: Redirects to StaffDashboard.tsx
    else Invalid or Gate Staff
        DB-->>UI: Returns Staff Object (role: 'gate_staff')
        UI-->>Teacher: Rejects login ("Access denied")
    end
```

---

## 2. REAL-TIME DATA SYNC (THE POLLING MECHANISM)

Because WebSockets (Realtime) are disabled by default on new Supabase tables, the application guarantees "real-time" chat feeling via a 5-second background polling cycle.

### 2.1 The Polling Lifecycle (Announcements & Replies)
This flow explains how a Teacher's post instantly appears on a Parent's phone without the parent refreshing the page.

```mermaid
sequenceDiagram
    participant TUI as Staff AnnouncementsPanel
    participant DB as Supabase
    participant PUI as Parent MessagesTab

    Note over PUI: PUI mounts and starts setInterval(5000ms)
    PUI->>DB: Fetch Announcements (Initial)
    DB-->>PUI: Returns 0 rows
    
    Note over TUI: Teacher creates a new post
    TUI->>DB: INSERT INTO announcements (title, body, class_name)
    DB-->>TUI: Success 200 OK
    TUI->>TUI: Updates local state immediately (Optimistic UI)
    
    Note over PUI: 5 seconds elapse
    PUI->>DB: Fetch Announcements (Background Poll)
    DB-->>PUI: Returns 1 row (New Post)
    PUI->>PUI: setAnnouncements(data)
    PUI->>PUI: React Re-renders UI smoothly without loading spinner
    
    Note over PUI: Parent types a reply
    PUI->>DB: INSERT INTO announcement_replies (body, sender_name="Parent (Child)")
    DB-->>PUI: Success
    
    Note over TUI: TUI's own 5-second interval fires
    TUI->>DB: Fetch Replies (Background Poll)
    DB-->>TUI: Returns new Parent reply
    TUI->>TUI: React Re-renders UI
```

**Technical Responsibility Deep-Dive:**
*   **`useEffect` Hooks:** Inside `MessagesTab.tsx`, `HomeworkTab.tsx`, `AnnouncementsPanel.tsx`, and `HomeworkPanel.tsx`, there is a `useEffect` hook with an empty dependency array or a `class_name` dependency. This ensures the 5-second interval is created exactly once when the component is mounted to the DOM, and it is destroyed (`clearInterval`) when the user navigates away, preventing memory leaks.
*   **Zero-Flicker Updates:** The `setLoading(true)` state is deliberately bypassed during the interval loops. When `setAnnouncements(data)` is called with new data, React's Virtual DOM calculates the exact difference (e.g., one new chat bubble) and injects only that element into the browser's DOM, resulting in a buttery-smooth sync.

---

## 3. DAILY LOGS ARCHITECTURE

Teachers log activities for students (Food, Sleep, Custom). Parents view this as a timeline.

### 3.1 The Activity Submission Lifecycle
```mermaid
flowchart TD
    A[Teacher clicks Student Card] --> B[ActivityFormModal Opens]
    B --> C{Select Activity Type}
    C -->|Food| D[Select Portion: Full/Half/None]
    C -->|Sleep| E[Select Duration: 1hr/2hr]
    C -->|Custom| F[Type Description]
    
    D --> G[Click Submit]
    E --> G
    F --> G
    
    G --> H[Promise.race: Supabase INSERT vs 3s Timeout]
    H -->|Success| I[Row added to 'logs' table]
    H -->|Timeout| J[Catch Block: Show Offline Warning]
    
    I --> K[Trigger window.dispatchEvent 'log_added']
    K --> L[StaffDashboard catches event]
    L --> M[StaffDashboard re-fetches logs]
    M --> N[Student Card shows green checkmark]
```

**Database Schema Enforcement:**
*   The `logs` table strictly requires a `student_id`. Supabase enforces this at the database level. If `ActivityFormModal.tsx` attempts to send a log without an ID, the PostgREST API immediately rejects it with a 400 Bad Request.

---

## 4. SECURE GATE PASS (QR CODE) LIFECYCLE

The most critical security feature of the app. It ensures a child cannot be released without cryptographic verification.

### 4.1 End-to-End Handover Flow
```mermaid
sequenceDiagram
    participant Parent UI
    participant Supabase DB
    participant Guard UI (GateDashboard)

    Note over Parent UI: Parent arrives at school
    Parent UI->>Parent UI: Clicks "Generate Gate Pass"
    Parent UI->>Supabase DB: INSERT INTO gate_passes (student_id, status="PENDING")
    Supabase DB-->>Parent UI: Returns new Pass ID
    
    Parent UI->>Parent UI: Generates visual QR Code
    Note right of Parent UI: QR Data = { pass_id: "...", student_id: "..." }
    
    Note over Guard UI: Guard points camera at Parent's phone
    Guard UI->>Guard UI: Html5QrcodeScanner parses image
    Guard UI->>Guard UI: Extracts pass_id & student_id
    
    Guard UI->>Supabase DB: SELECT * FROM students WHERE id = student_id
    Supabase DB-->>Guard UI: Returns Photo, Name, Class
    Guard UI->>Guard UI: Displays Student Identity Card on Screen
    
    Note over Guard UI: Guard physically verifies child matches photo
    Guard UI->>Supabase DB: UPDATE gate_passes SET status="COMPLETED" WHERE id = pass_id
    Supabase DB-->>Guard UI: 200 OK
    
    Guard UI->>Guard UI: Shows Green "Handover Successful" Screen
```

**Technical Responsibility Deep-Dive:**
*   **`ParentGatePassModal.tsx`:** Uses the `qrcode.react` library to convert a JSON payload string into a 2D barcode canvas on the fly. 
*   **`GateDashboard.tsx`:** Relies on the `html5-qrcode` library. This library requests DOM access to the physical device camera via `navigator.mediaDevices.getUserMedia()`, processes video frames 10 times a second, and applies optical character recognition algorithms to find barcode anchor points.

---

## 5. NETWORK FAILURE & RESILIENCE (OPTIMISTIC UI)

The application is built for environments where Wi-Fi or 4G data might drop unexpectedly.

### 5.1 The Offline Creation Flow
When a user attempts to send data without an internet connection, the system utilizes "Optimistic UI" combined with `Promise.race()`.

```mermaid
flowchart TD
    A[User clicks Post] --> B[Disable Button]
    B --> C[Start Supabase INSERT]
    B --> D[Start 3000ms Timer]
    
    C -.-> |Network Drop| E[Hangs indefinitely]
    D --> |3000ms elapses| F[Timer Wins the Race]
    
    F --> G[Catch Block Executes]
    G --> H[Create Fake 'Local' Data Object]
    H --> I[Append 'local-' to ID]
    I --> J[Inject into React State]
    J --> K[UI renders new post instantly]
    J --> L[Show Toast: 'Network slow. Saved locally.']
```
*Note: True persistence of "offline-first" data requires a Service Worker Background Sync or IndexedDB cache. Currently, the app relies on this in-memory optimistic update to prevent UI freezing, meaning a hard refresh while offline will lose the unsynced post.*

# SAMSIDH PRESCHOOL APP: COMPREHENSIVE TECHNICAL MANUAL

This manual provides an exhaustive, granular breakdown of the entire Samsidh Preschool Application. It is written specifically for maintainers, administrators, and non-coders who need to confidently understand the "in and out" of the system, what every file does, and how the different sections communicate.

---

## TABLE OF CONTENTS
1. System Architecture Overview
2. Directory Structure Blueprint
3. Global & Configuration Files
4. Library & Utility Files (`src/lib`)
5. Reusable Components (`src/components`)
6. The Staff Portal (`src/pages/staff`)
7. The Parent Portal (`src/pages/parent`)
8. The Gate Staff Portal (`src/pages/gate`)
9. Authentication & Data Flow

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

The application is built using a modern "JAMstack" architecture. This means there is no traditional server (like Apache or PHP) running 24/7 to render web pages. Instead:

*   **Frontend (The App):** Built using React (a library for building user interfaces) and Vite (a lightning-fast build tool). The app is downloaded once to the user's browser or phone, and then it runs entirely locally.
*   **Backend (The Database):** Handled entirely by **Supabase**. Supabase acts as the database (PostgreSQL), the authentication provider (handling logins), and the API layer (allowing the app to read and write data securely).
*   **PWA (Progressive Web App):** The app includes a Service Worker (`sw.js`). This is a background script that allows the app to be installed on a mobile phone's home screen and caches files so the app loads instantly even on slow networks.

---

## 2. DIRECTORY STRUCTURE BLUEPRINT

The source code (`src/`) is strictly organized by responsibility. Here is the high-level tree:

```
pre-primary/
├── public/                 # Static assets (icons, logos, manifest for PWA)
├── src/                    # All application code
│   ├── components/         # Reusable UI parts (Buttons, Spinners, Modals)
│   ├── lib/                # Brain of the app (Database connection, Types, Routing)
│   ├── pages/              # The actual screens the user sees
│   │   ├── admin/          # Admin screens
│   │   ├── gate/           # Security Guard screens
│   │   ├── parent/         # Parent screens
│   │   └── staff/          # Teacher screens
│   ├── App.tsx             # The master container
│   ├── main.tsx            # The bootloader
│   └── index.css           # Global styling and colors
```

---

## 3. GLOBAL & CONFIGURATION FILES

### `src/main.tsx`
*   **Responsibility:** The "Bootloader". This is the very first file that executes when the app opens.
*   **How it works:** It finds the `<div id="root">` in the HTML and injects the entire React application (`App.tsx`) into it.

### `src/App.tsx`
*   **Responsibility:** The "Traffic Cop" and "Safety Net".
*   **How it works:** 
    *   It uses a custom Router to look at the URL (e.g., `/#/staff` vs `/#/parent`) and decides which Portal to show.
    *   It wraps the entire app in an `<ErrorBoundary>`. If a critical bug happens anywhere in the app, this file catches it and shows a friendly "Something went wrong" message instead of crashing the browser completely.

### `src/index.css`
*   **Responsibility:** The "Paintbrush".
*   **How it works:** It loads **TailwindCSS**, a utility library that allows developers to style the app (colors, spacing, fonts) directly in the code. It also contains some custom CSS animations.

---

## 4. LIBRARY & UTILITY FILES (`src/lib`)

These files do not display anything on the screen. They are the invisible gears turning behind the scenes.

### `src/lib/supabase.ts`
*   **Responsibility:** The "Database Telephone".
*   **How it works:** It holds your unique Supabase URL and Anon Key. It creates a `supabase` client object that is exported. Every time any file in the app needs to save or read data, it imports this file to make the call.

### `src/lib/types.ts`
*   **Responsibility:** The "Dictionary".
*   **How it works:** It defines the exact shape of your data. For example, it dictates that a `Student` *must* have an `id`, `name`, and `class_name`. This prevents developers from making typos (like typing `classname` instead of `class_name`) because the system will reject it.

### `src/lib/mockData.ts`
*   **Responsibility:** The "Backup Generator".
*   **How it works:** If Supabase is down or the user loses internet connection, the app will fall back to reading from this file. It contains hardcoded, fake lists of students and logs so the app can still be tested and viewed offline.

### `src/lib/router.tsx`
*   **Responsibility:** The "Navigator".
*   **How it works:** Since this is a Single Page Application (the webpage never actually reloads), this file listens to changes in the address bar (the `#hash` part) and swaps out the screens instantly.

---

## 5. REUSABLE COMPONENTS (`src/components`)

These are the "Lego blocks" of the application. By writing them once here, we can reuse them across all portals, keeping the app small and consistent.

### `Toast.tsx`
*   **Responsibility:** Shows the little green success or red error popups at the top of the screen (e.g., "Homework Assigned Successfully").
*   **How it works:** It listens to a custom window event and renders a floating banner that auto-hides after 3 seconds.

### `QRCodeCanvas.tsx` & `PhotoUploadInput.tsx`
*   **Responsibility:** Specialized tools for generating Gate Pass QR codes and uploading student photos.
*   **How it works:** They interface directly with browser APIs (like the camera or Canvas API) and wrap them in a simple React component.

### `PWAInstallBanner.tsx` & `PWAUpdatePrompt.tsx`
*   **Responsibility:** Manages the mobile installation experience.
*   **How it works:** The Install banner asks the user to "Add to Home Screen". The Update Prompt detects if a developer released new code, and asks the user to "Refresh to update app".

---

## 6. THE STAFF PORTAL (`src/pages/staff`)

This is the most complex portal, used by class teachers.

### `StaffPortal.tsx` & `StaffLogin.tsx`
*   **Responsibility:** The "Gatekeeper".
*   **How it works:** `StaffPortal` checks if the teacher is logged in. If not, it shows `StaffLogin`. The login file checks the Supabase `staff` table. If the email and password match, it saves the teacher's profile into local memory and lets them into the Dashboard.

### `StaffDashboard.tsx`
*   **Responsibility:** The "Main Classroom View".
*   **How it works:** 
    *   It fetches all students from Supabase who have the same `class_name` as the logged-in teacher.
    *   It lists the students in a grid.
    *   It contains tabs to switch between "Students" (daily logs), "Announcements", and "Homework".

### `ActivityFormModal.tsx` & `StudentHistoryModal.tsx`
*   **Responsibility:** Logging and viewing daily activities.
*   **How it works:** When a teacher clicks on a student, the Activity Form opens. It allows them to record Food (e.g., "Ate Full"), Sleep (e.g., "Slept 2 hours"), or Custom activities. Clicking submit saves a row to the `logs` table in Supabase. The History Modal reads from that same table to show a timeline of the day.

### `AnnouncementsPanel.tsx`
*   **Responsibility:** Creating and managing class-wide broadcasts.
*   **Technical Details:** 
    *   **Fetching:** Queries the `announcements` table for rows where `class_name` matches the teacher's class.
    *   **Polling:** Every 5 seconds, it silently re-fetches to see if parents have replied.
    *   **Inserting:** When creating a new post, it writes to Supabase with the teacher's `staff_id` and `staff_name`.

### `HomeworkPanel.tsx`
*   **Responsibility:** Assigning homework.
*   **Technical Details:** Very similar to Announcements, but it writes to the `homework` table and includes a `due_date` and `subject` field. It also polls every 5 seconds for Parent Q&A replies.

### `StaffQRScannerModal.tsx`
*   **Responsibility:** Scanning parent gate passes.
*   **How it works:** Uses the device's camera. When it detects a QR code, it looks up the student ID. If the student belongs to the teacher's class, it updates the `gate_passes` table in Supabase to mark the handover as `COMPLETED`.

---

## 7. THE PARENT PORTAL (`src/pages/parent`)

Designed to be mobile-first and incredibly simple for parents.

### `ParentPortal.tsx` & `ParentLogin.tsx`
*   **Responsibility:** Authenticates the parent. 
*   **How it works:** Checks the `students` table to match the parent's phone/email with their child.

### `ParentFeed.tsx`
*   **Responsibility:** The "Daily Timeline".
*   **How it works:** It queries the `logs` table for the specific `student_id` of the child. It renders them in a beautiful vertical timeline (e.g., Apple icon for food, Moon icon for sleep).

### `MessagesTab.tsx` & `HomeworkTab.tsx`
*   **Responsibility:** Receiving teacher communications.
*   **Technical Details:** 
    *   Queries `announcements` and `homework` where `class_name` matches the child's class.
    *   **Two-Way Chat:** When a parent types a reply, it inserts a row into `announcement_replies` or `homework_replies`. It formats the sender name as `Parent Name (Child Name)` so the teacher instantly knows who is speaking.
    *   **Silent Sync:** Polls the database every 5 seconds so replies appear instantly without screen flashing.

### `ParentGatePassModal.tsx`
*   **Responsibility:** Generating the secure handover code.
*   **How it works:** When clicked, it inserts a `PENDING` row into the `gate_passes` table. It then takes the `student_id` and draws a secure QR code on the screen. The parent shows this to the gate guard or teacher.

---

## 8. THE GATE STAFF PORTAL (`src/pages/gate`)

A specialized, restricted portal for security guards.

### `GatePortal.tsx`, `GateLogin.tsx`, & `GateDashboard.tsx`
*   **Responsibility:** Authorize school exits securely.
*   **How it works:** 
    *   Guards log in (the app strictly checks if their role is `gate_staff`).
    *   The dashboard is a giant full-screen camera scanner.
    *   When they scan a parent's QR code, it pulls the student's photo and name on the screen to verify identity.
    *   Clicking "Confirm Handover" updates the `gate_passes` table to `COMPLETED`. 

---

## 9. AUTHENTICATION & DATA FLOW (MAINTENANCE SUMMARY)

If you are maintaining this app, you must understand the "Golden Rules" of how data flows:

1.  **The Class Name Link:** The entire app is glued together by the `class_name`. A teacher in "Nursery" will ONLY see students whose `class_name` is exactly "Nursery". They will ONLY see announcements where `class_name` is "Nursery". If a student is not showing up for a teacher, **Check the spelling of the class_name in Supabase**.
2.  **Parent to Child Link:** Parents do not have their own "User Accounts" in the traditional sense. A parent logs in using the credentials attached to the `students` row in the database.
3.  **Realtime Syncing:** To avoid complicated WebSocket configurations and costs, the app uses **Background Polling**. Every 5 seconds, components silently ask Supabase, "Is there new data?". This happens invisibly to the user and ensures the chat interfaces feel "live" and snappy.
4.  **Offline Fallbacks:** Many functions (like `handlePost` in announcements) use a `Promise.race` with a 3-second timeout. This means if Supabase takes longer than 3 seconds to respond (due to bad internet), the app aborts the network call and saves the data to local memory instead, preventing the app from freezing.

### How to Monitor the App
As a maintainer, you do not need to read the code daily. Your primary tool is the **Supabase Dashboard**:
*   Use the **Table Editor** to add new students, fix spelling errors, or delete test announcements.
*   Use the **Authentication** tab to manage passwords if you ever decide to use Supabase Auth instead of raw table lookups.
*   Check the **Database -> API logs** if users complain about slowness; it will tell you if queries are failing.

***End of Technical Manual***

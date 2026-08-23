# MOBILE_FEATURE_PARITY_CHECKLIST.md

This checklist ensures 100% functional parity between the existing web application and the new Capacitor mobile application.

| Module | Feature | Web Exists | Mobile Ready | Tested | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System** | Routing & Navigation | Yes | **Yes** | [x] | Refactored to react-router-dom |
| **Auth** | Login (Admin/Staff/Parent) | Yes | **Yes** | [x] | Implemented deep linking config for Supabase OAuth/resets via `@capacitor/app` |
| **Auth** | RBAC & Permissions Fetching | Yes | Yes | [ ] | |
| **System** | Mock Data Fallback | Yes | **Yes** | [x] | Retained localStorage for synchrony safety |
| **System** | Push Notifications | Yes | **Yes** | [x] | Replaced Web Push with `@capacitor/push-notifications` and global Supabase auth listener |
| **Staff** | View Class Roster | Yes | Yes | [ ] | |
| **Staff** | Log Daily Activity | Yes | Yes | [ ] | |
| **Staff** | Upload Student/Activity Photos | Yes | **Yes** | [x] | Implemented `@capacitor/camera` abstraction layer |
| **Staff** | Manage Classwork/Homework | Yes | Yes | [ ] | |
| **Staff** | Gradebook / Performance | Yes | Yes | [ ] | Ensure UI fits on mobile screens |
| **Staff** | Download Report Cards (PDF) | Yes | **Yes** | [x] | Implemented `@capacitor/filesystem` for PDF save/share |
| **Staff** | Scan Gate Pass (QR) | Yes | **Yes** | [x] | Replaced `html5-qrcode` with native MLKit scanner plugin fallback |
| **Parent** | View Daily Feed & Homework | Yes | Yes | [ ] | |
| **Parent** | Generate Gate Pass (QR) | Yes | Yes | [ ] | Ensure Canvas renders correctly in WebView |
| **Parent** | View Fees | Yes | Yes | [ ] | |
| **Parent** | Download Fee Receipt | Yes | Needs Work | [ ] | Currently an empty button or window.open print script |
| **Admin** | Dashboard Overview | Yes | Yes | [ ] | Responsive UI check |
| **Admin** | Manage Staff/Students/Classes | Yes | Yes | [ ] | |
| **Admin** | Export Lists to CSV | Yes | **Yes** | [x] | Implemented `@capacitor/filesystem` abstraction for CSV export |
| **Admin** | Download Documents | Yes | Needs Work | [ ] | Currently an empty button in UI |
| **Gate** | Scan QR Codes | Yes | **Yes** | [x] | Replaced `html5-qrcode` with native MLKit scanner plugin fallback |

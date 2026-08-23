# WEB_AND_MOBILE_ARCHITECTURE_PLAN.md

## Goal
To successfully wrap the existing React/Vite web application in Capacitor for iOS and Android deployment, while maintaining 100% functional parity and sharing as much code as possible, without breaking the existing web application.

## 1. Unified Codebase Strategy (Standard Capacitor)
Instead of a split monorepo, we are using the standard Capacitor approach: a single unified codebase where the `src/` directory is shared between the Web and Mobile apps.

*   **Shared Code (95%):** The vast majority of the React codebase remains shared and untouched.
*   **Platform-Specific Logic (5%):** We introduce abstraction layers in `src/lib/plugins/` for features that differ. We use `Capacitor.isNativePlatform()` to safely branch logic so the web application is NEVER broken or modified in behavior.

## 2. Required Capacitor Plugins
1.  `@capacitor/core` & `@capacitor/cli` (Installed - v6)
2.  `@capacitor/filesystem` (Installed - v6)
3.  `@capacitor/camera` (Installed - v6)
4.  `@capacitor-mlkit/barcode-scanning` (Installed - v6)
5.  `@capacitor/push-notifications` (Installed - v6)
6.  `@capacitor/app` (Installed - v6)
7.  `@capacitor/preferences` (Installed - v6)
8.  `@capacitor/share` (Installed - v6)

## 3. Recommended Folder Structure
```text
pre-primary_capacitor_V2/
+-- android/               (Capacitor generated - DO NOT manually edit heavily)
+-- ios/                   (Capacitor generated - DO NOT manually edit heavily)
+-- src/
¦   +-- lib/
¦   ¦   +-- plugins/       (NEW: Abstracted wrappers for native features)
¦   ¦   ¦   +-- filesystem.ts
¦   ¦   ¦   +-- camera.ts
¦   ¦   ¦   +-- scanner.ts
¦   ¦   ¦   +-- app.ts
¦   ¦   ¦   +-- notifications.ts
¦   ¦   +-- router.tsx     (REFACTORED to react-router-dom)
¦   +-- components/
¦   +-- ...
+-- DOCUMENTATION/         (Project Analysis and Checklist)
+-- capacitor.config.ts    (Capacitor configuration)
+-- ...
```

## 4. Safest Architecture & Refactoring Strategy
1.  **Plugin Wrappers:** Create wrapper functions in `src/lib/plugins/`. These wrappers check `Capacitor.isNativePlatform()`. The React components call these wrappers instead of direct browser APIs.
2.  **Routing Overhaul:** (COMPLETED) Migrated to `react-router-dom` using HashRouter to perfectly handle deep linking and mobile back buttons without breaking web logic.
3.  **UI Adaptations:** Complex tables will need mobile-specific CSS classes (`hidden md:table-cell`, etc.).

## 5. Migration Implementation Status
*   [x] **Phase 1: Routing & State**
    *   Migrated from custom hash router to `react-router-dom`.
*   [x] **Phase 2: Capacitor Initialization**
    *   Installed Capacitor core/cli (v6).
    *   Initialized project and added Android/iOS platforms.
*   [x] **Phase 3: File System & Downloads**
    *   Abstracted CSV, PDF, and Image downloads (`src/lib/plugins/filesystem.ts`).
*   [x] **Phase 4: Hardware Integration**
    *   Abstracted Camera uploads and QR Scanning.
*   [x] **Phase 5: Push Notifications & Auth**
    *   Installed `@capacitor/push-notifications` and `@capacitor/app`.
    *   Implemented deep-linking URL listener in `App.tsx`.
    *   Implemented global Supabase auth listener to register device push tokens natively.
*   [ ] **Phase 6: UI Polish**
    *   Fix any responsive design issues discovered during device testing.

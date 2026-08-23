# CAPACITOR_COMPATIBILITY_REPORT.md

## Overall Compatibility
The current project is a React/Vite SPA. It is generally compatible with Capacitor, as Capacitor wraps web applications. However, there are several browser-specific APIs and behaviors that will require adaptation or Capacitor plugins to function correctly on iOS and Android.

## Identified Issues & Risks

### 1. Custom Hash Routing
*   **File(s)**: `src/lib/router.tsx`, `App.tsx`
*   **Issue**: The app uses custom routing relying on `window.location.hash` and `hashchange` events. While this might work inside a WebView, it can cause issues with hardware back buttons on Android and deep linking.
*   **Solution**: Migrate to a standard routing library like `react-router-dom` that integrates better with Capacitor and handles history state properly.
*   **Impact on Web**: Refactoring routing affects the web app but is a standard practice and improves maintainability.

### 2. QR Code Scanning (Camera Access)
*   **File(s)**: `src/pages/gate/GateDashboard.tsx`, `src/pages/staff/StaffQRScannerModal.tsx`
*   **Issue**: Uses `html5-qrcode` which relies on `navigator.mediaDevices.getUserMedia`. WebViews often restrict or prompt differently for camera permissions, and performance can be sub-optimal compared to native scanning.
*   **Solution**: Use the `@capacitor-mlkit/barcode-scanning` or `@capacitor-community/barcode-scanner` plugin for native, performant scanning on mobile. Keep `html5-qrcode` as a fallback for the web version.
*   **Impact on Web**: Requires conditional logic to use the web library on the web and the native plugin on mobile.

### 3. File Downloads (CSV, PDF, Images)
*   **File(s)**: `src/components/ImageViewerModal.tsx`, `src/pages/admin/AdminFinanceView.tsx`, `src/pages/staff/StaffReportsTab.tsx`, `src/pages/admin/AdminStaffList.tsx`, `src/pages/admin/AdminStudentsList.tsx`
*   **Issue**: Uses standard web download techniques (`<a download>`, `window.open()`, generating Object URLs). These often fail silently or behave unpredictably inside mobile WebViews (e.g., they might just open a new WebView or do nothing).
*   **Solution**: Use the `@capacitor/filesystem` plugin to write files to the device's native file system, and optionally `@capacitor/share` to let the user save or share them.
*   **Impact on Web**: Requires conditional logic to use anchor tags on the web and the Filesystem API on mobile.

### 4. PDF Generation
*   **File(s)**: `src/pages/staff/StaffReportsTab.tsx`
*   **Issue**: Uses `html2canvas` and `jspdf`. These rely heavily on rendering the DOM to a canvas. This can be slow or inaccurate in some WebViews depending on device memory and OS version.
*   **Solution**: It might work, but needs rigorous testing on low-end devices. A safer approach for mobile is to generate PDFs on the server (Supabase Edge Function) and download them.
*   **Impact on Web**: Moving generation to the server improves web performance as well.

### 5. Local Storage (Mock Data Fallback)
*   **File(s)**: `src/lib/mockData.ts`
*   **Issue**: Relies heavily on `localStorage`. While WebViews support `localStorage`, it can be cleared by the OS when space is low.
*   **Solution**: For persistent critical data, use `@capacitor/preferences` (formerly Storage) or SQLite if complex querying is needed offline. Since this is just a fallback, standard Preferences might be enough.
*   **Impact on Web**: Capacitor Preferences works on the web as well.

### 6. File Uploads (Camera/Gallery)
*   **File(s)**: `src/components/PhotoUploadInput.tsx`
*   **Issue**: Uses standard `<input type="file">` and `navigator.mediaDevices.getUserMedia`. While supported, the native user experience is better handled by a plugin.
*   **Solution**: Use `@capacitor/camera` and `@capacitor/filesystem` to provide a native photo picker and capture experience.
*   **Impact on Web**: The Capacitor Camera plugin has a PWA fallback that uses standard web APIs, so it integrates well.

### 7. Push Notifications
*   **File(s)**: `src/main.tsx`, `src/services/notificationService.ts`
*   **Issue**: Currently uses Service Workers and standard Web Push API (`PushManager`). This will NOT work for native push notifications on iOS and Android.
*   **Solution**: Must implement `@capacitor/push-notifications` and configure APNs (Apple) and FCM (Firebase/Android).
*   **Impact on Web**: Requires separate logic: Service Workers for Web, Capacitor plugin for Mobile.

### 8. Authentication Redirects
*   **File(s)**: `src/pages/admin/AdminDashboard.tsx`, `src/lib/supabase.ts`
*   **Issue**: Supabase Auth uses OAuth redirects or magic links. These require deep linking configuration in Capacitor to redirect back to the app instead of the browser.
*   **Solution**: Configure deep links (Universal Links on iOS, App Links on Android) and handle the incoming URL using the `@capacitor/app` plugin to pass the session back to Supabase.

### 9. Service Workers / PWA Logic
*   **File(s)**: `src/main.tsx`, `src/components/PWAInstallBanner.tsx`, `src/components/PWAUpdatePrompt.tsx`
*   **Issue**: PWA install banners and update prompts are irrelevant in a compiled native app.
*   **Solution**: Conditionally disable PWA UI elements when running in Capacitor natively (`Capacitor.isNativePlatform()`).
*   **Impact on Web**: No impact, PWA logic remains active on the web.

## Required Capacitor Plugins
*   `@capacitor/core`, `@capacitor/cli`
*   `@capacitor/camera` (Photos/Uploads)
*   `@capacitor/filesystem` (Downloads, PDFs)
*   `@capacitor-community/barcode-scanner` or `@capacitor-mlkit/barcode-scanning` (Gate/Staff QR Scanning)
*   `@capacitor/push-notifications` (Alerts)
*   `@capacitor/app` (Deep linking, Auth redirects, Back button)
*   `@capacitor/preferences` (Reliable local storage)
*   `@capacitor/share` (Sharing downloaded reports/receipts)

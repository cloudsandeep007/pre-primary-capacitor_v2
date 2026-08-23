# Android Application Health Report

## Overall Status: 🟡 CODE EXISTS / NOT RUNTIME VERIFIED

### 1. Capacitor Configuration
- **Status:** Android folder exists, `capacitor.config.ts` is valid.
- **Plugins:** `@capacitor/android`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/push-notifications` are installed.

### 2. Permissions
- **Status:** Requires manual verification in `AndroidManifest.xml`.
- **Risk:** Features like the Camera (for QR scanning and photo uploads) and Filesystem (for PDF receipts) will crash the app if the native Android permissions (`CAMERA`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`) are missing from the manifest.

### 3. Authentication & Deep Linking
- **Status:** Code is implemented (`Capacitor.isNativePlatform() ? 'com.samsidh.preprimary://login-callback' : ...`).
- **Risk:** Google OAuth redirection to the native app requires the `intent-filter` to be correctly configured in `AndroidManifest.xml` for `com.samsidh.preprimary://`. If missing, the browser will not return the user to the app after Google login.

### 4. Camera & QR Scanner
- **Implementation:** The app uses `html5-qrcode` inside the webview.
- **Risk:** Android WebViews sometimes block `navigator.mediaDevices.getUserMedia` unless explicitly granted by the WebChromeClient. If the QR scanner shows a black screen, migration to `@capacitor-mlkit/barcode-scanning` is required.

### 5. File Downloads (Receipts)
- **Implementation:** `jspdf` and browser-based download triggers.
- **Risk:** Triggering an HTML `<a>` download attribute often fails in native WebViews. The app should intercept PDF generation and write it to disk using `@capacitor/filesystem` and then open it with `@capacitor/share`.

### 6. Responsive UI
- **Status:** Tailwind CSS handles mobile responsiveness well. Modals and tab navigations have been built with `sm:` breakpoints to ensure mobile usability.

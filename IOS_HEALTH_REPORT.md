# iOS Application Health Report

## Overall Status: 🟡 CODE EXISTS / NOT RUNTIME VERIFIED

### 1. Capacitor Configuration
- **Status:** iOS folder exists, `capacitor.config.ts` is valid.
- **Plugins:** `@capacitor/ios`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/push-notifications` are installed.

### 2. Permissions
- **Status:** Requires manual verification in `Info.plist`.
- **Risk:** Apple strictly rejects apps that access the Camera or Photo Library without valid privacy descriptions (`NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`). If these are missing, the app will instantly crash when a teacher tries to upload a photo.

### 3. Authentication & Deep Linking
- **Status:** Deep link callback `com.samsidh.preprimary://login-callback` is defined.
- **Risk:** iOS requires custom URL schemes to be registered in `Info.plist` under `CFBundleURLTypes`. If this is missing, the Google OAuth flow will strand the user in Safari without returning to the app.

### 4. Camera & QR Scanner
- **Implementation:** `html5-qrcode`.
- **Risk:** iOS WKWebView has strict restrictions on `getUserMedia`. It only works if the app has camera permissions AND the webview is configured to allow inline media playback. A native plugin like `@capacitor-mlkit/barcode-scanning` is much safer for iOS.

### 5. File Downloads (Receipts)
- **Implementation:** Browser-based blob downloads.
- **Risk:** iOS WKWebView notoriously ignores HTML5 download links. PDF receipts will likely fail to save unless routed through `@capacitor/filesystem` and presented via the native iOS share sheet (`@capacitor/share`).

### 6. UI/UX
- **Status:** Standard web UI.
- **Risk:** iPhones have safe-area notches (Dynamic Island). The top headers and bottom tab bars must use `safe-area-inset` CSS variables to avoid overlapping with the iOS status bar or home indicator.

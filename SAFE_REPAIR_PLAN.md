# Safe Repair Plan (Recommended Sequence)

This document outlines the recommended roadmap for addressing the risks identified in the application health audit. 
**DO NOT IMPLEMENT WITHOUT EXPLICIT APPROVAL.**

## 1. Native Mobile Permissions (P1)
**Problem:** iOS `Info.plist` and Android `AndroidManifest.xml` likely lack explicit capability declarations for Camera, Storage, and Push Notifications. App will crash on mobile.
**Proposed Solution:** Update native manifests with `NSCameraUsageDescription`, `READ_EXTERNAL_STORAGE`, etc.
**Testing:** Compile native apps and test permission prompts.
**Risk:** Low. Configuration change only.

## 2. Native Deep Links (OAuth) (P1)
**Problem:** Google OAuth redirect (`com.samsidh.preprimary://login-callback`) will fail on mobile if URL schemes aren't registered.
**Proposed Solution:** Add URL Scheme definitions to `AndroidManifest.xml` and `Info.plist`.
**Testing:** Run OAuth flow on physical devices.
**Risk:** Low.

## 3. Mobile File Downloads (PDF Receipts) (P2)
**Problem:** Web-based PDF downloads fail in native WebViews (especially iOS).
**Proposed Solution:** Refactor `src/utils/receiptUtils.ts` to detect `Capacitor.isNativePlatform()`. If true, write the base64 PDF string using `@capacitor/filesystem` and open it via `@capacitor/share`.
**Testing:** Generate a fee receipt on iOS simulator.
**Risk:** Medium. Requires modifying shared utility functions.

## 4. Mobile QR Scanner Robustness (P2)
**Problem:** `html5-qrcode` relies on browser `getUserMedia`, which is flaky in native WebViews.
**Proposed Solution:** Migrate `StaffQRScannerModal.tsx` and `GateDashboard.tsx` to use the installed native `@capacitor-mlkit/barcode-scanning` plugin when on mobile, falling back to `html5-qrcode` on web.
**Testing:** Scan a gate pass QR code on an Android device.
**Risk:** Medium. UI overlay changes required for native camera preview.

## 5. Push Notifications (P3)
**Problem:** Code is wired in `src/lib/plugins/notifications.ts`, but actual native Push requires Firebase (FCM) / APNs configuration.
**Proposed Solution:** Create a Firebase project, drop `google-services.json` into the `android/app` folder, and configure iOS APNs certificates in Xcode.
**Testing:** Trigger an announcement and verify native push delivery.
**Risk:** Low codebase risk, but high infrastructure complexity.

## 6. Safe Area UI Adjustments (P3)
**Problem:** iOS notches may obscure headers.
**Proposed Solution:** Add `padding-top: env(safe-area-inset-top)` to main layout containers in Tailwind.
**Testing:** View on iPhone simulator.
**Risk:** Very Low.

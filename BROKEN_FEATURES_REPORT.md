# Broken Features Report

## 🔴 CONFIRMED BROKEN
*None detected during this static analysis run.* The application successfully passes all TS checks and builds. Recent bugs regarding Google OAuth redirection and Parent RBAC linking have been explicitly resolved and tested.

## 🟠 PARTIALLY BROKEN
**Push Notifications on Mobile**
- **Exact symptom:** Capacitor push notification tokens might fail to register if the native environment lacks correct Google Services JSON (Android) or APNs certificates (iOS).
- **Root cause:** Native push requires external configuration beyond the codebase.
- **Affected files:** `src/lib/plugins/notifications.ts`, `android/app/google-services.json` (potentially missing)
- **Severity:** P2 (App works, notifications fail silently).

## 🟡 HIGH RISK / LIKELY TO BREAK
**QR Scanner on Native Devices**
- **Symptom:** `html5-qrcode` may conflict with Capacitor's native webview permissions on iOS WKWebView or Android WebView if native camera permissions aren't properly requested before the DOM attempts to access `navigator.mediaDevices`.
- **Root cause:** Browser-based camera API vs Native Camera API.
- **Severity:** P1 (Gate Staff rely on this).

**HashRouter on Native Deep Linking**
- **Symptom:** `HashRouter` is used (`/#/parent`), which can sometimes complicate Capacitor App deep-linking (`app://` custom schemes) if the native intent handler strips the hash.
- **Severity:** P2.

## 🔵 IMPLEMENTED BUT NOT VERIFIED
- **Capacitor File System Downloads:** Receipts and PDF generation use `html2canvas` and `jspdf`. Triggering a "download" in a mobile WebView sometimes fails silently without the `@capacitor/filesystem` plugin explicitly handling the binary blob.

## ⚪ NOT IMPLEMENTED
- **Online Payment Gateway:** Fees are entirely manual entry.

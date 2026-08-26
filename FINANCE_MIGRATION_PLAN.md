# Finance Configuration Migration & Synchronization Plan

## 1. Requirement Implemented
- **Finance Config Migration:** Moved the `FeeConfigurationTab` (which manages Fee Categories and Fee Structures) out of the `AdminFinanceView.tsx` and into the System Core `DiagnosticsPage.tsx` (Developer Portal).
- **Receipt Bug Fix:** Verified that the receipt correctly displays the Fee Category by passing the `StudentFee` object properly down to the HTML generator, ensuring tracking is accurate.

## 2. Impact Analysis
| Area | Impact | Files Modified | Risk |
|------|--------|----------------|------|
| **UI** | Finance Config moved to Diagnostics. Admin Portal is now exclusively for Ledger Overview & Payments. | `AdminFinanceView.tsx`, `DiagnosticsPage.tsx` | Low (UI restructure only) |
| **Services** | No changes. Database and API calls remain exactly the same. | N/A | None |
| **Authentication** | Access to Finance Config is now gated behind System Core access (typically Super Admin / Developer). | `DiagnosticsPage.tsx` | Low |
| **Capacitor** | Standard UI update synchronization required for Android/iOS apps. | N/A | Low |

## 3. Capacitor Synchronization Plan
Since this change modifies the React component tree and routing logic, the Capacitor mobile applications (Android and iOS) must be re-synced to receive the updated JavaScript bundle.

**Step-by-step Sync Process:**
1. **Build the Web App:** 
   Run `npm run build` to compile the new React components into the `dist` folder.
2. **Sync to Native Projects:** 
   Run `npx cap sync android` and `npx cap sync ios` to copy the `dist` contents into the native Android/iOS wrappers.
3. **Compile Native Apps:** 
   - For Android: Open Android Studio (`npx cap open android`) and build the APK/AAB, or run a CLI build.
   - For iOS: Open Xcode (`npx cap open ios`) and build the IPA for distribution.
4. **Deploy:** Distribute the updated mobile apps to staff/admin devices.

## 4. Rollback Plan
If the migration causes issues, we can revert `AdminFinanceView.tsx` and `DiagnosticsPage.tsx` to their previous commits via Git, then re-run the Capacitor sync process.

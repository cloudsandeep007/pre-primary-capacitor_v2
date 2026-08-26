# Root Cause Analysis (RCA): Log Timestamp and Duplication Issues

## 1. Issue: Logs Shifting to "Day Before Yesterday" (Date Ghosting)
**Symptom:** A log created for "today" later appears on the "day before yesterday" screen.
**Root Cause:**
In `ParentFeed.tsx`, there is a massive bug in the error handling (`catch` block) of the log fetching logic:
```typescript
} catch (err) {
  // FALLBACK LOCIC ON ERROR
  const mockLogs = getMockLogs().filter(
    (l) => l.student_id === student.id || l.student_id === student.roll_no
  );
  setLogs(mockLogs);
}
```
Notice that in the `catch` block, the system filters the mock logs by **Student ID only**, but it **fails to filter by `log_date`**. 
If a network error occurs (or Supabase fails to respond), the app falls back to local storage and dumps **every single log that student has ever had** onto whatever date screen you are currently looking at. This creates the illusion that logs are "moving" to past dates, when in reality, the screen is just dumping the entire history of logs due to the missing date filter in the fallback logic.

## 2. Issue: Duplication ("Came Twice")
**Symptom:** A single log upload appears as two identical logs on the parent feed.
**Root Cause:**
When a teacher submits a log in `ActivityFormModal.tsx`, the system saves it in two places simultaneously:
1. Local Storage (`addMockLog`): Generates a client-side ID (e.g., `log-17245...`)
2. Supabase (`activityService.createLog`): Generates a real database UUID (e.g., `550e8400...`)

When `ParentFeed.tsx` successfully fetches data, it merges both data sources:
```typescript
let mergedLogs = [...mockLogs, ...remoteLogs];
```
It tries to remove duplicates based on the log `id`. Since the mock log and the database log have completely different IDs, the system thinks they are two unique logs and displays both of them side-by-side.

## 3. Issue: Timestamps Changing Automatically
**Symptom:** The time of the log shifts slightly or appears differently.
**Root Cause:**
Because the log is duplicated (one from local storage, one from the database), they carry two slightly different origin timestamps:
- The mock log stamps the time using the teacher's local device clock.
- The Supabase log stamps the time using the database server's UTC clock.
When both are rendered side-by-side, the timestamps will not match exactly. If the screen is refreshed, the sorting algorithm might flip their positions, making it look like the timestamp of "the" log is changing automatically.

---

## Action Plan to Fix
1. **Fix the Fallback Bug:** Update the `catch` block in `ParentFeed.tsx` to properly filter `mockLogs` by `log_date`, just like the primary fetch does.
2. **Remove Unconditional Mocking:** Modify `ActivityFormModal.tsx` so it does NOT write to `addMockLog` if the Supabase insertion is successful. The local mock storage should only be used if the database insert fails (Offline Mode).

Please let me know if you approve this RCA and if you'd like me to deploy these fixes to the code!

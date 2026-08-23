# 01 Project Overview

## Application Name
Pre-Primary School Management App

## Business Purpose
To manage daily activities, attendance, homework, announcements, and gate passes for a pre-primary school, providing seamless communication between staff and parents.

## Target Users
- **Staff (Teachers/Gate Keepers):** Manage student activities, attendance, homework, and physical handover.
- **Parents:** View daily activities, homework, announcements, and request gate passes.
- **Admins:** Manage staff, students, and view analytics.

## Major Features
- **Authentication:** Application-layer auth via Roll Number/PIN for parents and Email/Password for staff.
- **Portals:** Landing, Admin, Staff, Parent, Gate.
- **Core Operations:** Activity logging (meals, naps, mood, photos), Announcements, Homework tracking.
- **Gate Pass System:** QR-based student handover system.
- **Offline/Fallback Capabilities:** Fallback mock data when Supabase is unreachable.

## Technology Stack
- **Frontend Framework:** React (Vite), TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (via Supabase)
- **Storage:** Supabase Storage (child-photos bucket)
- **Authentication Approach:** Custom application-layer validation against `students` and `staff` tables (NOT Supabase Auth).
- **Deployment Architecture:** Static frontend deployment, serverless Supabase backend.
- **External Services:** Supabase Realtime, web push notifications.
- **Logging System:** Centralized `src/lib/logger.ts` capturing frontend application errors and audit logs to `audit_logs` table.

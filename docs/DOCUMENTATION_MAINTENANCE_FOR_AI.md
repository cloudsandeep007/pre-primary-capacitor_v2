# Documentation Maintenance For AI

Whenever an AI is asked to modify the application:

STEP 1
Read:
docs/00_HANDBOOK_START_HERE.md

STEP 2
Read:
docs/onboarding/SAFE_CHANGE_GUIDE.md

STEP 3
Inspect actual code.

STEP 4
Identify documentation affected.

STEP 5
Make code changes.

STEP 6
Update documentation in the same change.

STEP 7
Run:
npm run typecheck
npm run build

STEP 8
Run documentation validation (node scripts/validate-documentation.cjs).

STEP 9
Update:
CHANGELOG.md
and appropriate ADR if architecture changed.

STEP 10
Report:
Code changes
Database changes
Documentation changes
Tests
Remaining risks
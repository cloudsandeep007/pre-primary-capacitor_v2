# Fee Structure Design
## Concept
Fee structures define what can be charged. They are templates assigned to students.

## Configuration Parameters
- **Academic Year**: e.g., 2026-27
- **Class**: e.g., Nursery
- **Fee Category**: Tuition Fee, Annual Fee, Transport Fee (Dynamic, not hardcoded)
- **Amount**: Base fee amount
- **Frequency**: Monthly, Quarterly, Annual, One-time
- **Status**: Active / Inactive

## Rule
Historical student charges must NOT change if the underlying fee structure is updated later. Assignments create a snapshot.

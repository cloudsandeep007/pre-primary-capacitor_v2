# Permanent Development Rules

**IMPORTANT**: This is an existing production application. Do not treat it as a new project.

## MANDATORY RULES

1. Understand the existing architecture before changing anything.
2. Search the existing implementation before creating new code.
3. Do not create duplicate tables.
4. Do not create duplicate services, utilities, hooks, components, or functionality if an existing implementation can be reused.
5. Do not rename database tables or columns without first searching every reference across the entire project.
6. NEVER modify an already-applied/old Supabase migration file.
7. Any database schema change must be implemented through a NEW timestamped Supabase migration.
8. Do not remove existing fallback logic such as daily_logs/activity_logs without first analyzing why it exists and showing me the impact.
9. Do not introduce mock/demo data into production paths.
10. Before making any major change, show me:
    - files that will change
    - files that will be created
    - files that will be deleted
    - database changes
    - affected features
    - possible risks
11. Explain the database impact before applying database changes.
12. Explain which application features may be affected.
13. After implementation, run the appropriate tests, type checking and production build.
14. Do not hide errors with silent catch blocks.
15. Do not use console.log randomly throughout the application. Use the centralized logging system once it exists.
16. Do not expose passwords, tokens, service-role keys, secrets, or sensitive personal information in logs.
17. Do not make unrelated improvements while implementing a requested feature.
18. Prefer small, reversible changes.
19. Preserve existing functionality unless the requested change explicitly requires changing it.
20. Never delete code simply because it appears unused without proving that it is unused.
21. Before changing Supabase schema, inspect the existing migration history.
22. Before changing RLS policies, inspect the current policies and explain the security impact.
23. Before changing Storage policies, inspect existing bucket configuration and policies.
24. Before changing Realtime configuration, inspect existing subscriptions and publication configuration.
25. When fixing a bug, first identify the root cause. Do not simply patch the visible symptom.
26. If you are uncertain, STOP and ask me instead of guessing.
27. I am not an experienced programmer. Explain important technical decisions in simple language.
28. Maintain/update project documentation whenever architecture, database structure, troubleshooting procedures, or deployment procedures materially change.

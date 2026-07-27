---
name: safe_code_optimization
description: "Best practices and mandatory rules for optimizing codebase performance, bundling, and refactoring without corrupting functionality, breaking UX, or dropping imports."
---

# Safe Code Optimization & Integrity Skill

This skill defines strict protocols for auditing, refactoring, and optimizing code in the SIGRE PWA without risking regressions or functional corruption.

## Core Directives

1. **Zero Corruption Guarantee (Integridad Absoluta)**:
   - NEVER drop essential imports (e.g., `React`, `useState`, UI components, or icons) that cause runtime reference errors.
   - Maintain compatibility with local databases (Dexie) and state hydration (Zustand/localStorage). Always wrap JSON parsing in `try...catch` blocks.

2. **Bundling & Code-Splitting Optimization**:
   - Avoid redundant dynamic imports (`import('@/lib/sync')`) inside components when static imports are cleaner or already loaded in the parent chunk.
   - Address large bundle chunks by auditing heavy imports and ensuring proper tree-shaking without altering functionality.

3. **Database & Sync Resilience**:
   - Ensure Dexie queries handle empty states or unindexed fallbacks gracefully.
   - When destructuring objects for Supabase synchronization (e.g., stripping `sync_status`), ensure unused variable linter rules do not break the payload structure.

4. **Tailwind & JSX Safe Refactoring**:
   - Strictly preserve backticks (\`) in dynamic Tailwind class expressions.
   - Keep mobile-first touch targets intact (min 44px height for interactive elements).

5. **Exhaustive Verification Protocol**:
   - After any modification, execute build verification (`npm run build`) and linter checks (`npm run lint`) to confirm 0 compilation errors and structural integrity across the entire repository.

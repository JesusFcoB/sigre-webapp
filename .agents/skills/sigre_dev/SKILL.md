---
name: sigre_dev
description: "Skills and instructions for developing and running the SIGRE Progressive Web App."
---

# SIGRE Development Skill

This skill is automatically triggered when working on the SIGRE project.

## Environment Requirements
- Node.js must be installed.
- Ensure you are in the `sigre-webapp` directory.

## Common Commands
- **Start Development Server**: `npm run dev`
- **Install Dependencies**: `npm install`
- **Build for Production**: `npm run build`
- **Lint Code**: `npm run lint`

## Architecture Context
- The app is a mobile-first Progressive Web App (PWA).
- Tech Stack: Vite, React, Tailwind CSS, shadcn/ui.
- Navigation is handled via state in `App.jsx` using a Bottom Navigation bar for simplicity in the prototype phase.
- Core views are located in `src/components/views/`.
- UI primitives are located in `src/components/ui/` and do not heavily rely on Radix for the initial prototype to avoid dependency issues.

## Additional Skills
- **Frontend Design**: Contains best practices for UX/UI design. (from `anthropics/skills/frontend-design` & local `frontend_design`)
- **React Best Practices**: Contains best practices and optimizations for React apps. (from `vercel-labs/agent-skills/vercel-react-best-practices` & local `react_best_practices`)
- **Systems Analyst**: Guidelines for requirement validation, system planning, and scope management. (local `systems_analyst`)
- **Database Design**: Best practices for PostgreSQL and Supabase, focusing on RLS and data integrity. (local `database_design`)
- **Git Best Practices**: Enforces conventional commits, atomic commits, and proper branching strategies. (local `git_best_practices`)

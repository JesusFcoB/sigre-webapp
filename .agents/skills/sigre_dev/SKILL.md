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

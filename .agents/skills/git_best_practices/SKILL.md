---
name: git_best_practices
description: "Standard operating procedures for Git version control and conventional commits."
---

# Git Best Practices Skill

This skill enforces a clean and professional version control history.

## Guidelines
1. **Conventional Commits**: Always use Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
2. **Descriptive Messages**: Commit messages must explain the "what" and "why" of a change, not just the "how".
3. **Branching Strategy**: Use feature branches (`feature/name`, `bugfix/name`) instead of committing directly to `main` or `production`.
4. **Atomic Commits**: Group related changes into single, cohesive commits. Do not lump unrelated features or bug fixes together.
5. **Ignore Unnecessary Files**: Ensure `.gitignore` is respected. Never commit sensitive files (`.env`), build artifacts (`dist/`, `node_modules/`), or OS files (`.DS_Store`).

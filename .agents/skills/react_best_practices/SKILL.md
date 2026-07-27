---
name: react_best_practices
description: "Best practices and optimizations for writing modern React code (Hooks, State Management, Performance)."
---

# React Best Practices Skill

This skill ensures that React code is modern, performant, and maintainable.

## Guidelines
1. **Functional Components**: Always use functional components and React Hooks instead of class components.
2. **State Management**: Keep state as local as possible. Lift state up only when necessary to share it between sibling components.
3. **Immutability**: Never mutate state directly. Always use the setter function provided by `useState` or `useReducer` and spread operators for objects/arrays.
4. **Effect Dependencies**: Always provide a complete dependency array to `useEffect` to prevent stale closures and infinite loops.
5. **Component Modularity**: Break down large components into smaller, reusable pieces. A component should ideally do one thing (Single Responsibility Principle).
6. **Prop Drilling**: Avoid excessive prop drilling; consider Context API or state management libraries for deeply nested global states.

# Reglas y Directrices para Agentes en el Proyecto SIGRE

Este archivo (`AGENTS.md`) define el comportamiento, reglas y lineamientos que cualquier agente de IA debe seguir al interactuar o modificar el código de la PWA "SIGRE" (Sistema Integral de Gestión de Recursos Escolares).

## 1. Stack Tecnológico Principal
- **Core**: Vite + React (JavaScript moderno, con `"type": "module"`).
- **Estilos**: Tailwind CSS + componentes inspirados en shadcn/ui.
- **Iconos**: `lucide-react`.

## 2. Reglas Críticas de Desarrollo
- **Enfoque Mobile-First**: La interfaz debe ser diseñada estrictamente priorizando la vista móvil (botones grandes, navegación inferior, buen contraste).
- **Sintaxis JSX y Backticks**: Prestar extrema atención para **no escapar accidentalmente las comillas invertidas** (\`) dentro de las expresiones literales (*template literals*) dinámicas de Tailwind.
- **Integridad de Imports**: ¡Muy importante! Al modificar o reemplazar bloques de código, el agente jamás debe sobrescribir u olvidar las importaciones base, como `import React, { useState } from 'react'`, ya que esto produce un quiebre en tiempo de ejecución (pantalla en blanco).
- **Exportación en Tailwind**: Dado que el proyecto Vite usa ESM, el archivo `tailwind.config.js` siempre debe utilizar `export default` y NUNCA `module.exports`. Si se usa este último, los estilos no compilarán.

## 3. Arquitectura y Buenas Prácticas
- Usar siempre Componentes Funcionales (Functional Components) y Hooks.
- Mantener el estado local de ser posible y evitar el "prop drilling" excesivo.
- Aprovechar las guías locales ubicadas en `.agents/skills/`. Además de diseño y React, existen lineamientos obligatorios para análisis de sistemas (`systems_analyst`), bases de datos (`database_design`) y control de versiones (`git_best_practices`).

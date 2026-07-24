# SIGRE - Sistema Integral de Gestión de Recursos Escolares

Una Aplicación Web Progresiva (PWA) enfocada en la gestión de inventario, mantenimiento y control de recursos en planteles escolares. Diseñada con un enfoque "Offline-First" para operar sin problemas en zonas con conectividad limitada.

## Características Principales

*   **100% Offline-First:** Los profesores y directivos pueden seguir trabajando sin internet gracias a la base de datos local en el navegador (IndexedDB / Dexie.js).
*   **Sincronización Automática:** Cuando el dispositivo detecta conexión Wi-Fi, envía automáticamente los datos locales a la nube (Supabase).
*   **Altas Rápidas:** Registro ágil de bienes mediante toma de fotografía (cámara del dispositivo) y captura de códigos de barras (escáner).
*   **Módulo de Reportes:** Permite reportar incidencias (como fallas en aires acondicionados) escaneando el código QR del salón.
*   **Módulo de Conciliación Inteligente:** Procesa archivos Excel locales y compara el inventario oficial contra lo que realmente existe en el plantel, identificando "Faltantes", "Sobrantes" o discrepancias físicas.
*   **Vales de Resguardo:** Genera listas por aula y permite que el responsable firme autógrafamente el vale en la pantalla de su celular.

## ¿Cómo ejecutar el proyecto?

### Opción 1: Ejecución Automática (Recomendada en Windows)

Simplemente haz doble clic sobre el archivo **`iniciar_sigre.bat`** que se encuentra en la raíz del proyecto.
Este archivo se encargará automáticamente de:
1. Instalar todas las dependencias necesarias.
2. Iniciar el servidor local de desarrollo.
3. Mostrarte en la consola la ruta (usualmente `http://localhost:5173`) a la cual debes entrar en tu navegador.

### Opción 2: Ejecución Manual por Consola

Si prefieres usar la terminal (Símbolo del sistema, PowerShell, o bash), sigue estos pasos:

1. Abre tu terminal en la carpeta principal de `sigre-webapp`.
2. Asegúrate de tener instalado [Node.js](https://nodejs.org/).
3. Ejecuta el comando para instalar las librerías:
   ```bash
   npm install
   ```
4. Levanta el entorno de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre el enlace local proporcionado (por defecto `http://localhost:5173`) en tu navegador de preferencia.

---
## Tecnologías utilizadas (Stack Tecnológico)
*   **Frontend:** React.js con Vite, Tailwind CSS y shadcn/ui.
*   **Motor Offline:** Dexie.js (para base de datos local) y Zustand (manejo de estados).
*   **Componentes Adicionales:** `html5-qrcode` para lectura de cámaras, `SheetJS (xlsx)` para parseo de Excels, y `Recharts` para las métricas visuales.

---
## ¿Qué falta por implementar? (Próximos Pasos - Fase 3)
*   **Conexión Real a Supabase:** Configurar las variables de entorno para apuntar a un proyecto real en la nube de Supabase.
*   **Sincronización Bidireccional:** Asegurar que los datos locales (Offline) y de la nube (Online) estén en sintonía mediante un esquema robusto de sincronización de Dexie a PostgreSQL.
*   **Gestión de Usuarios Nube:** Migrar el Auth quemado localmente al sistema de Autenticación de Supabase (Admin vs Capturista).
*   **Despliegue a Producción (Vercel/Netlify):** Empaquetar y subir la PWA a la nube para su acceso universal mediante URL pública.

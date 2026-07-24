# SIGRE - Sistema Integral de Gestión de Recursos Escolares

Una Aplicación Web Progresiva (PWA) enfocada en la gestión de inventario, mantenimiento y control de recursos en planteles escolares. Diseñada con un enfoque "Offline-First" para operar sin problemas en zonas con conectividad limitada.

## Características Principales (Implementadas hasta ahora)

*   **100% Offline-First:** Los profesores y directivos pueden seguir trabajando sin internet gracias a la base de datos local en el navegador (IndexedDB / Dexie.js).
*   **Sincronización Automática:** Cuando el dispositivo detecta conexión Wi-Fi, envía automáticamente los datos locales a la nube (Supabase).
*   **Sistema de Cuentas y Roles:** Control de acceso mediante roles. El "Director" (Admin) tiene control total (editar, eliminar, dar de baja), mientras que el "Capturista/Invitado" solo puede agregar nuevos registros de manera segura.
*   **Altas Rápidas:** Registro ágil de bienes mediante toma de fotografía (cámara del dispositivo) y captura de códigos de barras (escáner).
*   **Módulo de Reportes de Incidencias:** Permite reportar incidencias (como fallas en aires acondicionados) escaneando el código QR del salón.
*   **Módulo de Conciliación Inteligente:** Procesa archivos Excel locales y compara el inventario oficial contra lo que realmente existe en el plantel, identificando "Faltantes", "Sobrantes" o discrepancias físicas.
*   **Módulo de Vales de Resguardo:** Permite generar asignaciones formales de bienes a maestros u operativos. Genera automáticamente un documento PDF listo para imprimir o enviar con firma autógrafa digital.
*   **Módulo Independiente de "Bajas":** Proceso rápido y seguro para descartar artículos (por obsolescencia, daño o robo), registrando el motivo, ubicación de resguardo y evidencia fotográfica del artículo desechado, conservándolo en una pestaña histórica separada.
*   **Semáforo de Mantenimiento Preventivo:** Permite asignar una frecuencia de revisión (en meses) a los equipos (ej. aires acondicionados). El sistema calcula dinámicamente y muestra un semáforo visual (Verde, Amarillo, Rojo) alertando cuando un equipo necesita servicio técnico.

*   **Conexión a la Nube (Supabase):** Cuenta con una base de datos PostgreSQL remota y segura en la nube.
*   **Sincronización Bidireccional Automática:** Sube automáticamente los registros creados sin internet y descarga las novedades desde Supabase en cuanto se detecta conexión, usando manejo de conflictos.

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
*   **Conexión Remota:** `@supabase/supabase-js`.
*   **Componentes Adicionales:** `html5-qrcode` para lectura de cámaras, `SheetJS (xlsx)` para parseo de Excels, `Recharts` para las métricas visuales, y `jsPDF` para exportación de vales.

---
## ¿Qué falta por implementar? (Próximos Pasos - Fase 4: Despliegue)
*   **Despliegue a Producción (Vercel/Netlify):** Empaquetar y subir la PWA a la nube para su acceso universal mediante URL pública.
*   **Gestión de Usuarios Nube (Opcional):** Migrar el Auth quemado localmente al sistema de Autenticación de Supabase (Admin vs Capturista) para mayor estrictez de cuentas.

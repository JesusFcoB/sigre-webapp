# SIGRE - Sistema Integral de Gestión de Recursos Escolares

Sistema Integral de Gestión de Recursos Escolares (SIGRE).
Una Aplicación Web Progresiva (PWA) enfocada en la gestión de inventario, mantenimiento y control de recursos en planteles escolares. Diseñada con un enfoque "Offline-First" para operar sin problemas en zonas con conectividad limitada.

## Características Principales (Implementadas hasta ahora)

*   **100% Offline-First:** Los profesores y directivos pueden seguir trabajando sin internet gracias a la base de datos local en el navegador (IndexedDB / Dexie.js).
*   **Sincronización Automática:** Cuando el dispositivo detecta conexión Wi-Fi, envía automáticamente los datos locales a la nube (Supabase).
*   **Autenticación en la Nube (Supabase Auth):** Sistema de cuentas real y seguro vinculado a correos electrónicos, con manejo estricto de sesiones y roles corporativos.
*   **Sistema de Roles (RBAC):** El "Director" (Admin) tiene control total (editar, eliminar, gestionar usuarios, conciliaciones), mientras que el "Capturista" o "Profesor" tienen permisos limitados para registrar información.
*   **Altas Rápidas y Optimización de Imágenes:** Registro ágil de bienes con compresión automática de fotografías a formato WebP (Client-Side) para ahorrar ancho de banda y espacio local.
*   **Módulo de Reportes de Incidencias:** Vista rediseñada (tipo Drawer) que permite reportar incidencias detalladas, incluyendo la ubicación específica del problema dentro de un área.
*   **Módulo de Conciliación Inteligente:** Compara el inventario contra lo que realmente existe en el plantel. Incluye una **Validación Estricta de Archivos Excel** para garantizar que cumplan con el formato oficial de la SEP antes de ser procesados.
*   **Módulo de Vales de Resguardo:** Genera asignaciones formales de bienes a maestros u operativos, incluye captura de **firma digital directamente en pantalla** y generación de documento PDF.
*   **Módulo Independiente de "Bajas":** Proceso rápido y seguro para descartar artículos por obsolescencia, daño o robo, registrando evidencia fotográfica.
*   **Gestión Administrativa de Usuarios:** Panel dedicado donde el Director puede dar de alta cuentas, modificar roles (Director, Capturista, Profesor), eliminar usuarios, y forzar la restauración de contraseñas de forma segura (vía SQL RPC) sin requerir verificación por correo (ideal para entornos escolares controlados).
*   **Dashboard Directivo:** Panel de control con métricas en tiempo real y gráficas interactivas que reflejan el estado del inventario (Nuevo, Bueno, Regular, Malo) alimentadas directamente de la base de datos local.
*   **Sincronización Inteligente de Archivos:** Las fotografías, firmas digitales y facturas se capturan localmente, se optimizan (WebP) y se suben automáticamente a la nube a través de **Supabase Storage**, manteniendo la base de datos de PostgreSQL limpia y rápida guardando únicamente las URLs públicas.
*   **Semáforo de Mantenimiento Preventivo:** Calcula dinámicamente alertas de servicio técnico según frecuencia asignada (Verde, Amarillo, Rojo).
*   **Interfaz Optimizada para Móviles (Mobile-First):** Acciones siempre accesibles desde teléfonos mediante Bottom Navigation.

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
*   **Backend / Auth / BD:** Supabase (PostgreSQL, Supabase Auth y Storage).
*   **Componentes Adicionales:** `html5-qrcode` para lectura de cámaras, `SheetJS (xlsx)` para parseo de Excels, `Recharts` para las métricas visuales, y `jsPDF` para exportación de vales.

---
## ¿Qué falta por implementar / Mejoras Futuras (Roadmap)?
*   **Impresión de Etiquetas y Códigos QR en PDF:** Crear un módulo para seleccionar múltiples bienes y generar plantillas en PDF listas para imprimir sus etiquetas de identificación física (para posteriormente ser escaneadas).
*   **Historial de Depreciación y Movimientos:** Mantener un registro contable del valor estimado del equipo a lo largo del tiempo, así como una bitácora de los movimientos físicos (cambios de salón o responsables).

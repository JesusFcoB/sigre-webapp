# SIGRE - Sistema Integral de Gestión de Recursos Escolares

Sistema Integral de Gestión de Recursos Escolares (SIGRE).
Una Aplicación Web Progresiva (PWA) enfocada en la gestión de inventario, mantenimiento y control de recursos en planteles escolares. Diseñada con un enfoque "Offline-First" para operar sin problemas en zonas con conectividad limitada.

## Características Principales (Implementadas hasta ahora)

*   **100% Offline-First:** Los profesores y directivos pueden seguir trabajando sin internet gracias a la base de datos local en el navegador (IndexedDB / Dexie.js).
*   **Sincronización Automática:** Cuando el dispositivo detecta conexión Wi-Fi, envía automáticamente los datos locales a la nube (Supabase).
*   **Sistema de Cuentas y Roles:** Control de acceso mediante roles. El "Director" (Admin) tiene control total (editar, eliminar, dar de baja, ver conciliaciones), mientras que el "Capturista" solo puede agregar registros o modificar los propios sin afectar lo demás.
*   **Altas Rápidas:** Registro ágil de bienes mediante toma de fotografía (cámara del dispositivo), captura de código de barras (escáner) para el número de serie, y **subida de fotografía de factura/ticket**.
*   **Módulo de Reportes de Incidencias:** Permite reportar incidencias (como fallas en aires acondicionados) escaneando el código QR del salón o seleccionando un artículo.
*   **Módulo de Conciliación Inteligente:** Procesa archivos Excel oficiales y compara el inventario contra lo que realmente existe en el plantel, identificando "Faltantes", "Sobrantes" o discrepancias físicas (solo disponible para Directores).
*   **Módulo de Vales de Resguardo:** Permite generar asignaciones formales de bienes a maestros u operativos. Genera automáticamente un documento PDF listo para imprimir e incluye un pad para capturar la **firma digital directamente en pantalla**.
*   **Módulo Independiente de "Bajas":** Proceso rápido y seguro para descartar artículos (por obsolescencia, daño o robo), registrando el motivo, ubicación de resguardo y evidencia fotográfica del artículo desechado, conservándolo en una pestaña histórica separada.
*   **Semáforo de Mantenimiento Preventivo:** Calcula dinámicamente y muestra un semáforo visual (Verde, Amarillo, Rojo) alertando cuando un equipo necesita servicio técnico según su frecuencia asignada.
*   **Interfaz Optimizada para Móviles (Mobile-First):** Botones de acción (editar, eliminar) siempre visibles y operables fácilmente desde teléfonos sin necesidad de interactuar con menús escondidos.

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
## ¿Qué falta por implementar / Mejoras Futuras (Roadmap)?
*   **Campo de Ubicación en Incidencias:** Agregar un campo opcional para especificar la ubicación exacta del problema dentro de un salón o área al levantar un reporte de incidencia.
*   **Rediseño de la Vista de Reportes:** Reestructurar la pantalla de reportes para que funcione como la vista de bienes (lista general en primer plano, panel lateral para agregar), y añadir un botón de "Solucionado" con una pestaña para reportes cerrados.
*   **Validación Estricta de Excels en Conciliación:** Implementar un bloqueo o validación que impida subir cualquier archivo Excel que no cuente exactamente con el formato oficial de la SEP para evitar fallos.
*   **Sincronización de Facturas (Supabase):** Añadir la columna `invoice_image` en la tabla `items` de Supabase para poder subir a la nube las fotografías de tickets/facturas que ya se están guardando localmente.
*   **Migración a Autenticación Real (Supabase Auth):** Reemplazar el inicio de sesión local (mocked) por un sistema de cuentas vinculado a correos electrónicos reales para mayor seguridad corporativa.
*   **Impresión de Etiquetas y Códigos QR:** Crear un módulo para seleccionar múltiples bienes y generar plantillas listas para imprimir sus etiquetas de identificación física.
*   **Optimización de Imágenes (Client-Side):** Implementar compresión de fotografías a formato WebP u optimización de tamaño antes de guardarlas, ahorrando ancho de banda y espacio local.
*   **Historial de Depreciación y Movimientos:** Mantener un registro contable del valor estimado del equipo y los movimientos físicos (cambios de salón).

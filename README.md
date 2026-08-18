# SIGRE — Sistema Integral de Gestión de Recursos Escolares

> **PWA Offline-First para la Gestión de Inventarios, Auditorías Físicas, Vales de Almacén y Control Patrimonial en Planteles Escolares.**

SIGRE es una Aplicación Web Progresiva (PWA) de alto rendimiento desarrollada para optimizar el control de activos fijos, suministros de papelería, auditorías in situ en aulas y reportes de incidencias en centros educativos, operando de forma 100% autónoma sin conexión a internet y sincronizándose automáticamente con la nube (Supabase) cuando hay conectividad.

---

## 🚀 Funcionalidades Principales Implementadas

### 1. 📦 Catálogo Maestro y Control de Inventarios
* **Taxonomía Normalizada:** Selector de nombres de bienes estandarizados (*Minisplit, Mesabanco individual, Computadora de escritorio, Proyector, etc.*) con opción de enriquecimiento dinámico del catálogo.
* **Separación de Identidad y Atributos:** Distinción clara entre el *Nombre del Artículo* de catálogo y los *Detalles Físicos* (color, material, medidas, especificaciones).
* **Clasificación Patrimonial:** Soporte para **Activos Fijos (Devolutivos)** y **Materiales Consumibles**.
* **Trazabilidad de Origen:** Registro del proveedor o fuente de adquisición (*SEC, Asociación de Padres de Familia - APF, La Escuela es Nuestra - LEEN, Donación, Recurso Propio*).
* **Altas en Lote con Serialización:** Generación automática de folios y registros individuales por cada unidad física.
* **Compresión Fotográfica Client-Side:** Conversión automática de fotos y facturas a formato **WebP** ligero para optimizar el almacenamiento local y el ancho de banda.

---

### 2. 🔍 Auditoría Física y Conteo In Situ por Código QR / Barras
* **Escáner de Puerta de Aula:** Al leer el código QR colocado en el marco del aula o seleccionar el salón, se abre el panel de inventario y auditoría de dicho espacio.
* **Lector Continuo de Alta Velocidad con Cámara:** Permite auditar el mobiliario y equipo del salón pasando la cámara continuamente por los códigos de barra o QR.
* **Feedback Auditivo y Visual:** Emisión de sonido (*beep/chime*) de confirmación en cada lectura válida.
* **Detección Automática de Bienes:**
  * 🟢 **Verificado:** Marca el bien con check verde, registra la hora y actualiza la barra de progreso en vivo.
  * 🔵 **Ya Verificado:** Avisa si un artículo ya fue contabilizado previamente en la misma sesión.
  * 🟡 **Bien Ajeno:** Alerta si el artículo leído físicamente pertenece a otro salón (*ej. "Este mesabanco pertenece al Aula 2B"*).
  * 🔴 **No Registrado:** Alerta de código no identificado en el padrón escolar.
* **Checklist y Marcado Manual:** Permite verificar artículos manualmente tocando la casilla en pantalla cuando las etiquetas físicas estén deterioradas.
* **Acta de Auditoría en PDF:** Descarga inmediata del acta de verificación física oficial con porcentaje de completitud y relación de faltantes.

---

### 3. 🖨️ Generador Masivo de Etiquetas Adhesivas (QR y Barras)
* **Plantillas PDF de Impresión Directa:** Genera hojas listas para imprimir en papel adhesivo estándar con códigos QR nítidos vectorizados.
* **Formatos Disponibles:**
  * **🔖 Placa Institucional (10 por hoja carta):** Etiquetas grandes de alta durabilidad con nombre del plantel, nombre del bien, especificaciones, serie destacada y código QR.
  * **🏷️ Compacta Estándar (30 por hoja carta):** Formato compatible con hojas de etiquetas Avery 5160 para etiquetado masivo de butacas y mobiliario.
* **Filtros Avanzados:** Permite imprimir por aula específica, por categoría de bien o por selección manual con casillas.

---

### 4. 📋 Vales de Préstamo y Suministro de Almacén
* **Regla Estricta de Almacén:** Los vales solo permiten solicitar artículos físicamente disponibles en áreas de *Almacén o Bodega General*.
* **Tipología de Vales:**
  * **🏢 Préstamo Temporal (Devolutivo):** Para computadoras, cañones, herramientas o mobiliario. Requiere fecha compromiso de entrega, firma de conformidad y reingresa automáticamente al stock de almacén al marcarse como devuelto.
  * **📦 Suministro de Consumibles (No Reembolsable):** Para resmas de hojas, plumones, tóner o artículos de limpieza. Permite solicitar cantidades específicas (`ej. 3 paquetes`) y, al ser aprobado por el Director, **descuenta automáticamente la cantidad del inventario de almacén**.
* **Pestañas de Control:** Clasificación organizada en *Pendientes de Aprobación*, *Préstamos Activos*, *Suministros Despachados* e *Historial*.
* **Firma Digital en Pantalla:** Captura de firma autógrafa desde el celular o tablet y generación de comprobante de vale en PDF.

---

### 5. 👥 Expediente Institucional de Personal y Usuarios
* **Ficha de Usuario Enriquecida:** Registro de Matrícula / Clave Presupuestal, Género, Antigüedad / Fecha de Ingreso y Correo Institucional.
* **Control de Acceso por Roles (RBAC):**
  * **Director (Admin):** Control total, aprobación de vales, altas, bajas, configuración de espacios y gestión de usuarios.
  * **Capturista:** Acceso operativo a inventario de bienes, escáner QR, reporte de fallas y visualización de vales.
  * **Profesor:** Solicitud de vales de almacén, auditoría física de su aula asignada y reporte de incidencias.
* **Restablecimiento Forzado de Contraseñas:** Permite al Director resetear claves de acceso de forma inmediata vía RPC seguro de PostgreSQL sin requerir validación por correo electrónico.

---

### 6. 🏢 Catálogo de Aulas y Espacios Escolares
* **Vinculación de Responsables:** El campo de responsable se alimenta directamente del catálogo de usuarios registrados, garantizando integridad referencial.
* **Generador de Señalética QR Oficial:** Descarga de carteles imprimibles en PDF con el código QR de puerta y datos del responsable del aula.

---

### 7. 🛠️ Reporte de Incidencias y Módulo de Bajas
* **Reportes de Mantenimiento:** Envío de incidencias con tipo de falla (eléctrica, plomería, aire acondicionado, mobiliario), ubicación exacta y evidencia fotográfica.
* **Módulo de Bajas Patrimoniales:** Procedimiento formal para retirar bienes por desgaste irreparable, robo o daño, capturando motivo, lugar de resguardo y evidencia fotográfica.

---

### 8. 📊 Dashboard Directivo y Semáforo de Mantenimiento
* **Métricas en Tiempo Real:** Gráficas de distribución de inventario por estado (Nuevo, Bueno, Regular, Malo) y conteos por salón.
* **Semáforo Preventivo:** Alertas automáticas de servicio técnico según la periodicidad configurada en cada equipo.

---

### 9. ⚡ Arquitectura Offline-First y Sincronización
* **Almacenamiento Local (IndexedDB / Dexie.js):** Toda la operación funciona sin conexión a internet.
* **Sincronización Bidireccional con Supabase:** Sincroniza datos y sube archivos multimedia (fotos, firmas, facturas) a **Supabase Storage** manteniendo la base de datos limpia con URLs públicas.

---

## 🔮 ¿Qué falta por implementar? (Roadmap Institucional)

| Módulo / Función | Descripción | Prioridad |
| :--- | :--- | :---: |
| **📊 Conciliación Automatizada con Padrón Oficial SEC** | Importación del archivo Excel oficial de la SEC y cruce automático de series para generar la clasificación tripartita: 🟢 *Conciliados (Match)*, 🟡 *Sobrantes en Escuela (APF/LEEN)* y 🔴 *Faltantes Oficiales*, con acta de entrega de supervisión. | **Alta (Próximo Sprint)** |
| **📉 Bitácora de Movimientos y Depreciación** | Registro histórico de traspasos de bienes entre salones/profesores y cálculo de depreciación contable según la Ley General de Contabilidad Gubernamental (LGCG). | **Media** |
| **🔔 Alertas Push y Notificaciones de Vales Vencidos** | Recordatorios automáticos al docente y directivo cuando un préstamo temporal haya sobrepasado su fecha de entrega. | **Media** |
| **⚡ Optimización de Bundles (Code-Splitting)** | Separación de librerías (`jspdf`, `xlsx`, `html5-qrcode`) en chunks independientes para maximizar la velocidad de carga en dispositivos móviles de gama baja. | **Media** |

---

## 💻 ¿Cómo ejecutar el proyecto?

### Opción 1: Ejecución Automática (Windows)
Haz doble clic sobre el archivo **`iniciar_sigre.bat`** en la carpeta principal del proyecto.

### Opción 2: Ejecución Manual por Terminal
1. Abre tu terminal en la raíz del proyecto.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
4. Abre `http://localhost:5173` en tu navegador.

---

## 🛠️ Stack Tecnológico

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide Icons, Radix UI.
* **Motor Offline-First:** Dexie.js (IndexedDB) y Zustand.
* **Backend y Autenticación:** Supabase (PostgreSQL, Row Level Security, Auth y Storage).
* **Herramientas Especiales:** `html5-qrcode` (lector QR/barras), `qrcode` (generación de QR), `jspdf` & `jspdf-autotable` (generación de actas y etiquetas), `xlsx` (procesamiento Excel), `recharts` (gráficas interactivas).

// Catálogo Maestro de Artículos Escolares Normalizados para SIGRE

export const RESOURCE_TYPES = [
  { value: 'fixed', label: 'Activo Fijo / Devolutivo', description: 'Mobiliario y equipo permanente sujeto a resguardo y préstamo' },
  { value: 'consumable', label: 'Material Consumible', description: 'Papelería e insumos que se consumen y no se devuelven' }
];

export const ORIGIN_PROVIDERS = [
  'SEC (Secretaría de Educación y Cultura)',
  'Programa La Escuela es Nuestra (LEEN)',
  'Asociación de Padres de Familia (APF)',
  'Recurso Propio / Tiendita Escolar',
  'Donación Particular / Exalumnos',
  'Presupuesto Operativo Directo'
];

export const DEFAULT_CATEGORIES = [
  'Mobiliario y Equipo',
  'Equipo de Cómputo',
  'Climatización y Ventilación',
  'Audio y Video',
  'Material Didáctico y Deportivo',
  'Papelería y Consumibles',
  'Herramientas y Mantenimiento',
  'Instrumentos y Laboratorio'
];

export const DEFAULT_ARTICLE_CATALOG = [
  // Mobiliario
  { name: 'Mesabanco individual con paleta', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Mesabanco binario', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Silla con paleta derecha', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Silla con paleta izquierda (Zurdo)', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Silla apilable para eventos', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Silla ejecutiva docente', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Escritorio docente con cajones', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Mesa de trabajo rectangular', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Pizarrón blanco porcelanizado', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Pizarrón magnético', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Estante metálico / Librero', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Archivero metálico 4 gavetas', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Casillero / Locker escolar', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Bote de basura institucional', category: 'Mobiliario y Equipo', resource_type: 'fixed' },

  // Climatización
  { name: 'Minisplit 1 Tonelada (Frío/Calor)', category: 'Climatización y Ventilación', resource_type: 'fixed' },
  { name: 'Minisplit 1.5 Toneladas', category: 'Climatización y Ventilación', resource_type: 'fixed' },
  { name: 'Minisplit 2 Toneladas', category: 'Climatización y Ventilación', resource_type: 'fixed' },
  { name: 'Aire Acondicionado de Ventana', category: 'Climatización y Ventilación', resource_type: 'fixed' },
  { name: 'Ventilador de techo industrial', category: 'Climatización y Ventilación', resource_type: 'fixed' },
  { name: 'Ventilador de pedestal / oscilatorio', category: 'Climatización y Ventilación', resource_type: 'fixed' },

  // Cómputo y Electrónica
  { name: 'Computadora de escritorio (PC Completa)', category: 'Equipo de Cómputo', resource_type: 'fixed' },
  { name: 'Computadora portátil (Laptop)', category: 'Equipo de Cómputo', resource_type: 'fixed' },
  { name: 'Proyector multimedia / Cañón', category: 'Audio y Video', resource_type: 'fixed' },
  { name: 'Pantalla Smart TV 55"', category: 'Audio y Video', resource_type: 'fixed' },
  { name: 'Bocina amplificada / Bafle recargable', category: 'Audio y Video', resource_type: 'fixed' },
  { name: 'Micrófono inalámbrico', category: 'Audio y Video', resource_type: 'fixed' },
  { name: 'Impresora multifuncional láser', category: 'Equipo de Cómputo', resource_type: 'fixed' },
  { name: 'Impresora multifuncional de tinta continua', category: 'Equipo de Cómputo', resource_type: 'fixed' },
  { name: 'Regulador de voltaje / No-Break (UPS)', category: 'Equipo de Cómputo', resource_type: 'fixed' },
  { name: 'Router / Access Point Wi-Fi', category: 'Equipo de Cómputo', resource_type: 'fixed' },

  // Didáctico y Deportivo
  { name: 'Globo terráqueo didáctico', category: 'Material Didáctico y Deportivo', resource_type: 'fixed' },
  { name: 'Microscopio escolar', category: 'Instrumentos y Laboratorio', resource_type: 'fixed' },
  { name: 'Balón de fútbol / básquetbol / voleibol', category: 'Material Didáctico y Deportivo', resource_type: 'fixed' },
  { name: 'Garrafón de agua purificada', category: 'Mobiliario y Equipo', resource_type: 'fixed' },
  { name: 'Dispensador / Enfriador de agua', category: 'Climatización y Ventilación', resource_type: 'fixed' },

  // Consumibles
  { name: 'Paquete de hojas blancas (Resma Carta)', category: 'Papelería y Consumibles', resource_type: 'consumable' },
  { name: 'Caja de plumones para pizarrón blanco', category: 'Papelería y Consumibles', resource_type: 'consumable' },
  { name: 'Borrador para pizarrón blanco', category: 'Papelería y Consumibles', resource_type: 'consumable' },
  { name: 'Tóner / Cartucho de tinta para impresora', category: 'Papelería y Consumibles', resource_type: 'consumable' },
  { name: 'Kit de productos de limpieza e higiene', category: 'Papelería y Consumibles', resource_type: 'consumable' },

  // Herramientas y Mantenimiento
  { name: 'Escalera de tijera de aluminio', category: 'Herramientas y Mantenimiento', resource_type: 'fixed' },
  { name: 'Podadora de césped a gasolina', category: 'Herramientas y Mantenimiento', resource_type: 'fixed' },
  { name: 'Desbrozadora / Orilladora', category: 'Herramientas y Mantenimiento', resource_type: 'fixed' },
  { name: 'Caja de herramientas de mantenimiento', category: 'Herramientas y Mantenimiento', resource_type: 'fixed' },
  { name: 'Extintor contra incendios ABC', category: 'Herramientas y Mantenimiento', resource_type: 'fixed' }
];

const LOCAL_STORAGE_KEY = 'sigre_custom_article_catalog';

/**
 * Obtiene la lista completa de artículos combinando el catálogo por defecto con los agregados por el usuario.
 */
export function getArticleCatalog() {
  try {
    const custom = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const existingNames = new Set(DEFAULT_ARTICLE_CATALOG.map(a => a.name.toLowerCase().trim()));
    const combined = [...DEFAULT_ARTICLE_CATALOG];
    
    custom.forEach(item => {
      if (item && item.name && !existingNames.has(item.name.toLowerCase().trim())) {
        combined.push(item);
        existingNames.add(item.name.toLowerCase().trim());
      }
    });

    return combined.sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  } catch (err) {
    console.error('Error al cargar catálogo de artículos:', err);
    return DEFAULT_ARTICLE_CATALOG;
  }
}

/**
 * Agrega un nuevo artículo personalizado al catálogo maestro
 */
export function addArticleToCatalog(name, category = 'Mobiliario y Equipo', resourceType = 'fixed') {
  if (!name || !name.trim()) return null;
  const cleanName = name.trim();
  
  try {
    const custom = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const exists = custom.some(c => c.name.toLowerCase() === cleanName.toLowerCase()) ||
                   DEFAULT_ARTICLE_CATALOG.some(d => d.name.toLowerCase() === cleanName.toLowerCase());

    const newItem = {
      name: cleanName,
      category: category || 'Mobiliario y Equipo',
      resource_type: resourceType || 'fixed'
    };

    if (!exists) {
      custom.push(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(custom));
    }

    return newItem;
  } catch (err) {
    console.error('Error al guardar artículo en catálogo:', err);
    return { name: cleanName, category, resource_type: resourceType };
  }
}

-- ========================================================================================
-- SIGRE - Supabase Initial Schema & RLS Policies
-- ========================================================================================

-- 1. Create Tables

-- Locations (Aulas/Espacios)
CREATE TABLE public.locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    responsible_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Items (Bienes)
CREATE TABLE public.items (
    id TEXT PRIMARY KEY,
    official_inventory_number TEXT,
    description TEXT NOT NULL,
    condition TEXT,
    location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
    category TEXT,
    status TEXT DEFAULT 'activo',
    quantity INTEGER DEFAULT 1,
    maintenance_frequency_months INTEGER,
    last_maintenance_date TEXT,
    image TEXT,
    disposal_date TEXT,
    disposal_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tickets (Reportes de Incidencias)
CREATE TABLE public.tickets (
    id SERIAL PRIMARY KEY,
    issue_type TEXT NOT NULL,
    description TEXT,
    location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    image TEXT
);

-- Vales (Vales de Resguardo)
CREATE TABLE public.vales (
    id SERIAL PRIMARY KEY,
    person_name TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    items JSONB,
    pdf_data TEXT,
    is_active BOOLEAN DEFAULT true,
    signature_base64 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Row Level Security (RLS) Policies
-- Por defecto, habilitamos RLS en todas las tablas para seguridad
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;

-- Como primer paso (y dado que el auth migrará pronto), 
-- permitimos acceso público total (anon) de lectura y escritura para que la sincronización offline funcione.
-- IMPORTANTE: Una vez implementado Supabase Auth, cambiaremos estas políticas para requerir autenticación.

CREATE POLICY "Allow public all on locations" ON public.locations FOR ALL USING (true);
CREATE POLICY "Allow public all on items" ON public.items FOR ALL USING (true);
CREATE POLICY "Allow public all on tickets" ON public.tickets FOR ALL USING (true);
CREATE POLICY "Allow public all on vales" ON public.vales FOR ALL USING (true);

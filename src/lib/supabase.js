import { createClient } from '@supabase/supabase-js'

// We will use import.meta.env for Vite environment variables
// It falls back to an empty string if not provided so the app doesn't crash during dev/offline.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

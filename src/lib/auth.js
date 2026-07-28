import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

// Utilizamos un cliente secundario para que al crear usuarios (signUp) no se inicie sesión automáticamente,
// lo cual cerraría la sesión del Director actual que está creando la cuenta.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'
const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
})

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const createUser = async (email, password, role, name) => {
  const { data, error } = await secondarySupabase.auth.signUp({
    email,
    password,
    options: {
      data: { // User Metadata
        role: role,
        name: name,
      }
    }
  })
  
  if (error) throw error
  return data
}

export const getUsersList = async () => {
  const { data, error } = await supabase.rpc('get_all_users')
  if (error) throw error
  return data
}

export const deleteUserAccount = async (targetUserId) => {
  const { error } = await supabase.rpc('delete_user', { target_user_id: targetUserId })
  if (error) throw error
}

export const updateUserRole = async (targetUserId, newRole) => {
  const { error } = await supabase.rpc('update_user_role', { target_user_id: targetUserId, new_role: newRole })
  if (error) throw error
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Los usuarios ahora se manejan a través de Supabase Auth
// y no necesitamos un array local por defecto

export const useStore = create(
  persist(
    (set) => ({
      isOnline: navigator.onLine,
      setOnlineStatus: (status) => set({ isOnline: status }),
      
      // Autenticación
      user: null,
      role: null,
      login: (userData) => set({ user: userData, role: userData.user_metadata?.role || 'profesor' }),
      logout: () => set({ user: null, role: null }),

      // Estado UI volátil (no se guardará al recargar)
      syncCount: 0,
      setSyncCount: (count) => set({ syncCount: count }),

      editingItem: null,
      setEditingItem: (item) => set({ editingItem: item }),
      
      editingTicket: null,
      setEditingTicket: (ticket) => set({ editingTicket: ticket }),

      selectedLocation: null,
      setSelectedLocation: (loc) => set({ selectedLocation: loc }),

      theme: 'light',
      toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: newTheme };
      }),
    }),
    {
      name: 'sigre-storage', // Nombre de la clave en localStorage
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        theme: state.theme,
      }),
    }
  )
)

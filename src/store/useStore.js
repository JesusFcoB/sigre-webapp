import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const savedUsers = JSON.parse(localStorage.getItem('sigre_users') || 'null');
const defaultUsers = savedUsers || [
  { id: '1', name: 'Director General', username: 'director', password: '123', role: 'director' },
  { id: '2', name: 'Capturista Asignado', username: 'capturista', password: '123', role: 'capturista' },
  { id: '3', name: 'Profesor Base', username: 'profesor', password: '123', role: 'profesor' }
];

export const useStore = create(
  persist(
    (set) => ({
      isOnline: navigator.onLine,
      setOnlineStatus: (status) => set({ isOnline: status }),
      
      // Gestión de Usuarios locales
      users: defaultUsers,
      addUser: (user) => set((state) => {
        const newUsers = [...state.users, { ...user, id: Date.now().toString() }];
        localStorage.setItem('sigre_users', JSON.stringify(newUsers)); // Mantener compatibilidad anterior
        return { users: newUsers };
      }),
      removeUser: (userId) => set((state) => {
        const newUsers = state.users.filter(u => u.id !== userId);
        localStorage.setItem('sigre_users', JSON.stringify(newUsers)); // Mantener compatibilidad anterior
        return { users: newUsers };
      }),
      
      // Autenticación
      user: null,
      role: null,
      login: (userData) => set({ user: userData, role: userData.role }),
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
        users: state.users, // Guardamos la lista de usuarios aquí también
      }),
    }
  )
)

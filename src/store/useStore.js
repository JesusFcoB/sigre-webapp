import { create } from 'zustand'

export const useStore = create((set) => ({
  isOnline: navigator.onLine,
  setOnlineStatus: (status) => set({ isOnline: status }),
  
  // You can add more global state here later (like user profile, sync queue count, etc.)
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
}))

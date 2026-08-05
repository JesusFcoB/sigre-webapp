import React, { useState, useEffect } from 'react'
import DashboardView from './components/views/DashboardView'
import ScannerView from './components/views/ScannerView'
import ReportView from './components/views/ReportView'
import ConciliationView from './components/views/ConciliationView'
import AssetsView from './components/views/AssetsView'

import ClassroomInventoryView from './components/views/ClassroomInventoryView'
import LoginView from './components/views/LoginView'
import ValesView from './components/views/ValesView'
import { LayoutDashboard, QrCode, AlertCircle, FileSpreadsheet, Package, LogOut, FileSignature, Cloud, CloudOff, RefreshCw, Users, School, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react'

import { useStore } from './store/useStore'
import { syncAll } from './lib/sync'
import { db } from './lib/db'
import { supabase } from './lib/supabase'
import { signOut } from './lib/auth'
import LocationsView from './components/views/LocationsView'
import UserManagementView from './components/views/UserManagementView'
import { Button } from './components/ui/button'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const setOnlineStatus = useStore((state) => state.setOnlineStatus)
  const isOnline = useStore((state) => state.isOnline)
  const user = useStore((state) => state.user)
  const role = (useStore((state) => state.role) || '').toLowerCase()
  const logout = useStore((state) => state.logout)

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatusMsg, setSyncStatusMsg] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        useStore.getState().login(session.user)
      } else {
        useStore.getState().logout()
      }
    })
    return () => { subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      setOnlineStatus(true)
      setIsSyncing(true)
      setSyncStatusMsg('Sincronizando...')
      const res = await syncAll()
      setIsSyncing(false)
      setSyncStatusMsg(res.message || 'Sincronizado')
    }
    const handleOffline = () => {
      setOnlineStatus(false)
      setSyncStatusMsg('Modo Offline')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (navigator.onLine) { handleOnline() } else { handleOffline() }
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])

  useEffect(() => {
    const seedLocations = async () => {
      try {
        const count = await db.locations.count();
        if (count === 0) {
          await db.locations.bulkAdd([
            { id: 'aula_1a', name: 'Aula 1A', responsible_name: 'Prof. Juan Pérez' },
            { id: 'aula_medios', name: 'Aula de Medios', responsible_name: 'Profa. María López' },
            { id: 'direccion', name: 'Dirección', responsible_name: 'Director Escolar' },
            { id: 'almacen', name: 'Almacén', responsible_name: 'Encargado de Materiales' }
          ]);
        }
      } catch (err) {
        console.error('Error inicializando ubicaciones:', err);
      }
    };
    seedLocations();
  }, []);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView navigateTo={setActiveTab} />
      case 'assets': return <AssetsView />
      case 'scanner': return <ScannerView navigateTo={setActiveTab} />
      case 'report': return <ReportView />
      case 'vales': return <ValesView />
      case 'conciliation': return <ConciliationView />
      case 'classroom_inventory': return <ClassroomInventoryView navigateTo={setActiveTab} />
      case 'locations': return <LocationsView navigateTo={setActiveTab} />
      case 'users': return role === 'director' ? <UserManagementView /> : <DashboardView />
      default: return <DashboardView />
    }
  }

  if (!user) {
    return <LoginView />
  }

  // Build sidebar nav items based on role
  const navItems = []
  if (role !== 'profesor') {
    navItems.push({ id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' })
    navItems.push({ id: 'assets', icon: <Package className="w-5 h-5" />, label: 'Bienes' })
  }
  navItems.push({ id: 'scanner', icon: <QrCode className="w-5 h-5" />, label: 'Escáner QR' })
  navItems.push({ id: 'report', icon: <AlertCircle className="w-5 h-5" />, label: 'Reportar' })
  if (role === 'director') {
    navItems.push({ id: 'vales', icon: <FileSignature className="w-5 h-5" />, label: 'Vales' })
    navItems.push({ id: 'conciliation', icon: <FileSpreadsheet className="w-5 h-5" />, label: 'Conciliación' })
    navItems.push({ id: 'locations', icon: <School className="w-5 h-5" />, label: 'Aulas' })
    navItems.push({ id: 'users', icon: <Users className="w-5 h-5" />, label: 'Usuarios' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-3 bg-card border-b shadow-sm z-40 relative">
        <h1 className="text-xl font-bold text-primary tracking-tight">SIGRE</h1>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border text-xs font-medium">
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : isOnline ? (
              <Cloud className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-red-500" />
            )}
            <span className="text-muted-foreground">{syncStatusMsg}</span>
          </div>

          <div className="flex items-center gap-3 border-l pl-4">
            <span className="text-sm text-muted-foreground hidden md:inline-block font-medium">
              {user.user_metadata?.name || user.email} <span className="opacity-70">({role})</span>
            </span>
            <Button variant="ghost" size="icon" onClick={() => signOut()} title="Cerrar Sesión" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop: Sidebar + Content | Mobile: Content only */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Desktop Vertical Sidebar */}
        <aside className={`hidden md:flex flex-col border-r bg-card shadow-sm transition-all duration-300 ${sidebarCollapsed ? 'w-[72px]' : 'w-[220px]'}`}>
          <nav className="flex-1 flex flex-col gap-1 p-3 pt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl font-semibold text-sm transition-all outline-none active:scale-[0.97] ${sidebarCollapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Collapse toggle */}
          <div className="border-t p-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /> Colapsar</>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto w-full">
          {renderView()}
        </main>
      </div>

      {/* Mobile "More" Menu Overlay */}
      {moreMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setMoreMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-foreground">Más opciones</h3>
              <button onClick={() => setMoreMenuOpen(false)} className="p-2 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {role === 'director' && (
                <button onClick={() => { setActiveTab('vales'); setMoreMenuOpen(false); }} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${activeTab === 'vales' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                  <FileSignature className="w-6 h-6" />
                  <span className="text-xs font-bold">Vales</span>
                </button>
              )}
              {role === 'director' && (
                <button onClick={() => { setActiveTab('conciliation'); setMoreMenuOpen(false); }} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${activeTab === 'conciliation' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                  <FileSpreadsheet className="w-6 h-6" />
                  <span className="text-xs font-bold">Conciliar</span>
                </button>
              )}
              {role === 'director' && (
                <button onClick={() => { setActiveTab('locations'); setMoreMenuOpen(false); }} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${activeTab === 'locations' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                  <School className="w-6 h-6" />
                  <span className="text-xs font-bold">Aulas</span>
                </button>
              )}
              {role === 'director' && (
                <button onClick={() => { setActiveTab('users'); setMoreMenuOpen(false); }} className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>
                  <Users className="w-6 h-6" />
                  <span className="text-xs font-bold">Usuarios</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation - max 5 items */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 px-2 pb-safe md:hidden">
        <div className="max-w-5xl mx-auto flex justify-around items-center h-16">
          {role !== 'profesor' && (
            <NavItem 
              icon={<LayoutDashboard className="w-5 h-5" />} 
              label="Inicio" 
              isActive={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
            />
          )}
          {role !== 'profesor' && (
            <NavItem 
              icon={<Package className="w-5 h-5" />} 
              label="Bienes" 
              isActive={activeTab === 'assets'} 
              onClick={() => setActiveTab('assets')} 
            />
          )}
          <NavItem 
            icon={<QrCode className="w-6 h-6" />} 
            label="Escáner" 
            isActive={activeTab === 'scanner'} 
            onClick={() => setActiveTab('scanner')} 
            isPrimary
          />
          <NavItem 
            icon={<AlertCircle className="w-5 h-5" />} 
            label="Reporte" 
            isActive={activeTab === 'report'} 
            onClick={() => setActiveTab('report')} 
          />
          {role === 'director' && (
            <NavItem 
              icon={<MoreHorizontal className="w-5 h-5" />} 
              label="Más" 
              isActive={moreMenuOpen || ['vales','conciliation','locations','users'].includes(activeTab)} 
              onClick={() => setMoreMenuOpen(!moreMenuOpen)} 
            />
          )}
        </div>
      </nav>
      
      <style dangerouslySetInnerHTML={{__html: `.pb-safe { padding-bottom: env(safe-area-inset-bottom); }`}} />
    </div>
  )
}

function NavItem({ icon, label, isActive, onClick, isPrimary }) {
  if (isPrimary) {
    return (
      <button 
        onClick={onClick}
        className="flex flex-col items-center justify-center flex-1 h-full -mt-6 group relative outline-none"
      >
        <div className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg transition-transform duration-200 active:scale-95 ${isActive ? 'bg-primary text-primary-foreground scale-110' : 'bg-primary/90 text-primary-foreground group-hover:bg-primary'}`}>
          {icon}
        </div>
        <span className={`text-[11px] font-medium mt-1 ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </button>
    )
  }

  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 h-full gap-1 outline-none transition-colors active:bg-muted/50 rounded-xl"
    >
      <div className={`transition-transform duration-200 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-medium ${isActive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </button>
  )
}

export default App

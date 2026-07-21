import React, { useState, useEffect } from 'react'
import DashboardView from './components/views/DashboardView'
import ScannerView from './components/views/ScannerView'
import ReportView from './components/views/ReportView'
import ConciliationView from './components/views/ConciliationView'
import AssetRegistrationView from './components/views/AssetRegistrationView'
import ClassroomInventoryView from './components/views/ClassroomInventoryView'
import { LayoutDashboard, QrCode, AlertCircle, FileSpreadsheet, PackagePlus } from 'lucide-react'
import { useStore } from './store/useStore'
import { syncTicketsToSupabase, syncItemsToSupabase, syncValesToSupabase } from './lib/sync'
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const setOnlineStatus = useStore((state) => state.setOnlineStatus)
  const isOnline = useStore((state) => state.isOnline)

  useEffect(() => {
    const handleOnline = async () => {
      setOnlineStatus(true)
      // Attempt to sync when connection is restored
      await syncTicketsToSupabase()
      await syncItemsToSupabase()
      await syncValesToSupabase()
    }
    const handleOffline = () => setOnlineStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial sync check if starting online
    if (navigator.onLine) {
      handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnlineStatus])

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView navigateTo={setActiveTab} />
      case 'registration':
        return <AssetRegistrationView />
      case 'scanner':
        return <ScannerView navigateTo={setActiveTab} />
      case 'report':
        return <ReportView />
      case 'conciliation':
        return <ConciliationView />
      case 'classroom_inventory':
        return <ClassroomInventoryView navigateTo={setActiveTab} />
      default:
        return <DashboardView />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
        {renderView()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 px-2 pb-safe md:px-0 md:static md:border-t-0 md:bg-transparent md:shadow-none">
        <div className="max-w-5xl mx-auto flex justify-around items-center h-20 md:hidden">
          <NavItem 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Métricas" 
            isActive={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<PackagePlus className="w-5 h-5" />} 
            label="Altas" 
            isActive={activeTab === 'registration'} 
            onClick={() => setActiveTab('registration')} 
          />
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
          <NavItem 
            icon={<FileSpreadsheet className="w-5 h-5" />} 
            label="Conciliar" 
            isActive={activeTab === 'conciliation'} 
            onClick={() => setActiveTab('conciliation')} 
          />
        </div>
        
        {/* Desktop Sidebar / Topbar equivalent (simplified for prototype) */}
        <div className="hidden md:flex max-w-5xl mx-auto justify-center gap-4 py-4 bg-card rounded-t-3xl border-t border-x px-8">
           <ButtonNavDesktop icon={<LayoutDashboard />} label="Dashboard" isActive={activeTab==='dashboard'} onClick={()=>setActiveTab('dashboard')} />
           <ButtonNavDesktop icon={<PackagePlus />} label="Alta Bienes" isActive={activeTab==='registration'} onClick={()=>setActiveTab('registration')} />
           <ButtonNavDesktop icon={<QrCode />} label="Escáner QR" isActive={activeTab==='scanner'} onClick={()=>setActiveTab('scanner')} />
           <ButtonNavDesktop icon={<AlertCircle />} label="Reportar" isActive={activeTab==='report'} onClick={()=>setActiveTab('report')} />
           <ButtonNavDesktop icon={<FileSpreadsheet />} label="Conciliación" isActive={activeTab==='conciliation'} onClick={()=>setActiveTab('conciliation')} />
        </div>
      </nav>
      
      {/* Safe area support for iOS */}
      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
      `}} />
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

function ButtonNavDesktop({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all outline-none active:scale-95 ${isActive ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted text-muted-foreground'}`}
    >
      {icon}
      {label}
    </button>
  )
}

export default App

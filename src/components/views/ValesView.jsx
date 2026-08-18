import React, { useState, useMemo } from 'react'
import HelpTooltip from '@/components/ui/HelpTooltip'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FileSignature, Plus, X, FileText, CheckCircle2, PenTool, Clock, XCircle, RotateCcw, AlertTriangle, User, Calendar, Package, HelpCircle } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { syncValesToSupabase } from '@/lib/sync'
import SignatureModal from '@/components/ui/SignatureModal'
import { useStore } from '@/store/useStore'

// ─── Helpers ────────────────────────────────────────────────
function getValeStatusMeta(vale) {
  const now = new Date()
  const endDate = vale.end_date ? new Date(vale.end_date + 'T23:59:59') : null

  if (vale.vale_status === 'pending_approval') return { label: 'Pendiente', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock }
  if (vale.vale_status === 'rejected') return { label: 'Rechazado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle }
  if (vale.vale_status === 'completed') return { label: 'Devuelto', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle2 }
  if (vale.vale_status === 'active' && endDate && now > endDate) return { label: 'Vencido', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: AlertTriangle }
  if (vale.vale_status === 'active') return { label: 'Activo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', icon: Package }
  return { label: vale.vale_status || '—', color: 'bg-gray-100 text-gray-600', icon: Clock }
}

function getDaysRemaining(endDate) {
  if (!endDate) return null
  const end = new Date(endDate + 'T23:59:59')
  const now = new Date()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff
}

// ─── Main Component ─────────────────────────────────────────
export default function ValesView() {
  const [activeTab, setActiveTab] = useState('pending')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [formData, setFormData] = useState({
    person_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    item_id: '',
    signatureBase64: null
  })

  const role = (useStore(state => state.role) || '').toLowerCase()
  const user = useStore(state => state.user)
  
  const valesQuery = useLiveQuery(() => db.vales.toArray()) || []
  const allItems = useLiveQuery(() => db.items.toArray()) || []
  const items = useMemo(() => allItems.filter(i => i.status !== 'discarded' && i.sync_status !== 'pending_delete'), [allItems])
  const locations = useLiveQuery(() => db.locations.toArray()) || []

  const itemMap = useMemo(() => {
    const m = {}
    allItems.forEach(i => { m[i.id] = i })
    return m
  }, [allItems])

  const locationMap = useMemo(() => {
    const m = {}
    locations.forEach(l => { m[l.id] = l })
    return m
  }, [locations])

  // Filter vales by sync_status (exclude pending_delete) and by role
  const vales = useMemo(() => {
    const filtered = valesQuery.filter(v => v.sync_status !== 'pending_delete')
    // Professors only see their own vales
    if (role === 'profesor' && user) {
      const userIdentifier = user.email || user.user_metadata?.name || ''
      return filtered.filter(v => v.requested_by === userIdentifier || v.person_name === userIdentifier || v.person_name === (user.user_metadata?.name || ''))
    }
    return filtered
  }, [valesQuery, role, user])

  // Set of item IDs currently on an active or pending loan
  const activeLoanItemIds = useMemo(() => {
    const set = new Set()
    valesQuery.forEach(v => {
      if (v.sync_status !== 'pending_delete' && (v.vale_status === 'active' || v.vale_status === 'pending_approval')) {
        if (v.item_id) set.add(v.item_id)
      }
    })
    return set
  }, [valesQuery])

  // Helper to identify warehouse/storage locations
  const isWarehouseLocation = (loc) => {
    if (!loc) return false
    const n = (loc.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return n.includes('almacen') || n.includes('bodega') || n.includes('deposito') || n.includes('stock') || n.includes('resguardo')
  }

  // Items available for loan: strictly from warehouse and not currently loaned
  const warehouseItems = useMemo(() => {
    const hasWarehouses = locations.some(isWarehouseLocation)
    return items.filter(item => {
      if (activeLoanItemIds.has(item.id)) return false
      const loc = locationMap[item.location_id]
      if (hasWarehouses) {
        return isWarehouseLocation(loc)
      }
      return !loc || isWarehouseLocation(loc)
    })
  }, [items, locations, locationMap, activeLoanItemIds])

  // Categorize vales
  const pendingVales = useMemo(() => vales.filter(v => v.vale_status === 'pending_approval'), [vales])
  const activeVales = useMemo(() => vales.filter(v => v.vale_status === 'active'), [vales])
  const historyVales = useMemo(() => vales.filter(v => v.vale_status === 'completed' || v.vale_status === 'rejected'), [vales])

  // Counts
  const expiredCount = useMemo(() => {
    const now = new Date()
    return activeVales.filter(v => v.end_date && new Date(v.end_date + 'T23:59:59') < now).length
  }, [activeVales])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const userName = user?.user_metadata?.name || user?.email || (role === 'profesor' ? 'Profesor' : 'Director')
      const isProfesor = role === 'profesor'
      
      await db.vales.add({
        ...formData,
        person_name: isProfesor ? userName : formData.person_name,
        vale_status: isProfesor ? 'pending_approval' : 'active',
        requested_by: userName,
        requested_at: new Date().toISOString(),
        approved_at: isProfesor ? null : new Date().toISOString(),
        sync_status: 'pending_create'
      })
      setDrawerOpen(false)
      setFormData({ person_name: '', start_date: new Date().toISOString().split('T')[0], end_date: '', item_id: '', signatureBase64: null })
      if (navigator.onLine) syncValesToSupabase()
    } catch (err) {
      console.error(err)
    }
  }

  const handleApprove = async (vale) => {
    await db.vales.update(vale.id, {
      vale_status: 'active',
      approved_at: new Date().toISOString(),
      sync_status: vale.sync_status === 'synced' ? 'pending_update' : vale.sync_status
    })
    if (navigator.onLine) syncValesToSupabase()
  }

  const handleReject = async (vale) => {
    if (!window.confirm(`¿Rechazar la solicitud de ${vale.person_name}?`)) return
    await db.vales.update(vale.id, {
      vale_status: 'rejected',
      sync_status: vale.sync_status === 'synced' ? 'pending_update' : vale.sync_status
    })
    if (navigator.onLine) syncValesToSupabase()
  }

  const handleComplete = async (vale) => {
    if (!window.confirm(`¿Marcar como devuelto el préstamo de ${vale.person_name}?`)) return
    await db.vales.update(vale.id, {
      vale_status: 'completed',
      completed_at: new Date().toISOString(),
      sync_status: vale.sync_status === 'synced' ? 'pending_update' : vale.sync_status
    })
    if (navigator.onLine) syncValesToSupabase()
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este vale permanentemente?")) {
      const record = await db.vales.get(id)
      if (record && (record.sync_status === 'pending_create' || record.sync_status === 'pending')) {
        await db.vales.delete(id)
      } else {
        await db.vales.update(id, { sync_status: 'pending_delete' })
      }
      if (navigator.onLine) syncValesToSupabase()
    }
  }

  const exportVale = (vale) => {
    const item = itemMap[vale.item_id]
    const doc = new jsPDF()
    doc.setFontSize(20)
    doc.text("VALE DE RESGUARDO", 105, 20, { align: "center" })
    
    doc.setFontSize(12)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, 40)
    doc.text(`Responsable: ${vale.person_name}`, 14, 50)
    doc.text(`Válido desde: ${vale.start_date} hasta ${vale.end_date || 'Indefinido'}`, 14, 60)
    
    doc.text("El abajo firmante asume la responsabilidad del siguiente bien:", 14, 80)
    
    autoTable(doc, {
      startY: 90,
      head: [["Descripción", "No. Serie", "Condición"]],
      body: [
        [
          item?.description || "Desconocido", 
          item?.serial_number || "—", 
          item?.condition || "—"
        ]
      ]
    })
    
    const finalY = doc.lastAutoTable.finalY || 120
    
    if (vale.signatureBase64 || vale.signature_base64) {
      doc.addImage(vale.signatureBase64 || vale.signature_base64, 'PNG', 85, finalY + 18, 40, 22)
    }

    doc.line(40, finalY + 40, 170, finalY + 40)
    doc.text("Firma de Conformidad", 105, finalY + 50, { align: "center" })
    doc.text(vale.person_name, 105, finalY + 60, { align: "center" })
    
    doc.save(`Vale_${vale.person_name.replace(/\s/g, '_')}_${String(vale.id).slice(0, 5)}.pdf`)
  }

  const tabs = [
    { id: 'pending', label: 'Pendientes', count: pendingVales.length },
    { id: 'active', label: 'Activos', count: activeVales.length },
    { id: 'history', label: 'Historial', count: historyVales.length },
  ]

  const currentVales = activeTab === 'pending' ? pendingVales : activeTab === 'active' ? activeVales : historyVales

  return (
    <div className="flex flex-col h-full pb-28 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary" /> {role === 'profesor' ? 'Mis Vales' : 'Vales de Resguardo'}
            <HelpTooltip 
              title={role === 'profesor' ? 'Solicitudes de Vale' : 'Vales de Resguardo'}
              text={role === 'profesor'
                ? 'Solicita préstamos de bienes al Director. Puedes dar seguimiento al estado de tus solicitudes desde aquí.'
                : 'Administra préstamos de bienes a docentes. Genera vales con firma digital, aprueba solicitudes y controla devoluciones con fechas límite.'}
            />
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {role === 'profesor' ? 'Seguimiento de tus solicitudes de préstamo' : 'Control de préstamos de bienes'}
          </p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="h-10 rounded-xl font-bold gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{role === 'profesor' ? 'Solicitar Vale' : 'Nuevo Vale'}</span>
        </Button>
      </div>

      {/* Metrics Cards */}
      {role === 'director' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingVales.length}</p>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Por Aprobar</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{activeVales.length}</p>
            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-500 uppercase tracking-wider">Prestados</p>
          </div>
          <div className={`rounded-xl p-3 text-center border ${expiredCount > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'}`}>
            <p className={`text-2xl font-bold ${expiredCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>{expiredCount}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${expiredCount > 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>Vencidos</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-muted p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Vale Cards */}
      {currentVales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <FileSignature className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="font-bold text-lg text-foreground mb-1">
            {activeTab === 'pending' ? 'Sin solicitudes pendientes' : activeTab === 'active' ? 'Sin vales activos' : 'Sin historial de préstamos'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-5 font-medium">
            {activeTab === 'pending' 
              ? 'Todas las solicitudes de préstamo han sido procesadas.' 
              : activeTab === 'active' 
              ? 'No hay bienes en resguardo o préstamo temporal en este momento.' 
              : 'El historial de vales completados o rechazados se mostrará aquí.'}
          </p>
          <Button onClick={() => setDrawerOpen(true)} size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            {role === 'profesor' ? 'Solicitar Préstamo' : 'Generar Nuevo Vale'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {currentVales.map(vale => {
            const item = itemMap[vale.item_id]
            const statusMeta = getValeStatusMeta(vale)
            const StatusIcon = statusMeta.icon
            const daysRemaining = getDaysRemaining(vale.end_date)
            const isExpired = vale.vale_status === 'active' && daysRemaining !== null && daysRemaining < 0

            return (
              <div key={vale.id} className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md ${isExpired ? 'border-red-300 dark:border-red-700' : ''}`}>
                {/* Status Bar */}
                <div className={`px-4 py-2 flex items-center justify-between ${isExpired ? 'bg-red-50 dark:bg-red-950/30' : 'bg-muted/30'}`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon className="w-4 h-4" />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusMeta.color}`}>{statusMeta.label}</span>
                  </div>
                  {vale.vale_status === 'active' && daysRemaining !== null && (
                    <span className={`text-xs font-bold ${isExpired ? 'text-red-600 dark:text-red-400' : daysRemaining <= 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                      {isExpired ? `Venció hace ${Math.abs(daysRemaining)} día(s)` : `${daysRemaining} día(s) restantes`}
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {/* Person info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-foreground truncate">{vale.person_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {vale.requested_by && vale.requested_by !== vale.person_name ? `Solicitado por: ${vale.requested_by}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Item info */}
                  <div className="bg-muted/40 border rounded-xl p-3 flex items-start gap-3">
                    {item?.photoBase64 ? (
                      <img src={item.photoBase64} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item?.description || 'Artículo no encontrado'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Serie: {item?.serial_number || 'N/A'} • {item?.condition || '—'}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Desde: <strong className="text-foreground">{vale.start_date}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Hasta: <strong className={`${isExpired ? 'text-red-600' : 'text-foreground'}`}>{vale.end_date || 'Sin límite'}</strong></span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    {vale.vale_status === 'pending_approval' && role !== 'profesor' && (
                      <>
                        <Button className="flex-1 h-10 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(vale)}>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Aprobar
                        </Button>
                        <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30" onClick={() => handleReject(vale)}>
                          <XCircle className="w-4 h-4 mr-1.5" /> Rechazar
                        </Button>
                      </>
                    )}
                    {vale.vale_status === 'pending_approval' && role === 'profesor' && (
                      <div className="flex-1 text-center py-2 text-sm text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/50">
                        Esperando validación del Directivo
                      </div>
                    )}
                    {vale.vale_status === 'active' && (
                      <>
                        {role !== 'profesor' && (
                          <Button className="flex-1 h-10 rounded-xl font-bold bg-primary hover:bg-primary/90" onClick={() => handleComplete(vale)}>
                            <RotateCcw className="w-4 h-4 mr-1.5" /> Marcar Devuelto
                          </Button>
                        )}
                        <Button variant="outline" className={`h-10 ${role === 'profesor' ? 'flex-1 rounded-xl text-primary font-bold border-primary/20 hover:bg-primary/10' : 'w-10 px-0 rounded-xl'}`} onClick={() => exportVale(vale)} title="Descargar PDF">
                          <FileText className={`w-4 h-4 ${role === 'profesor' ? 'mr-2' : 'text-red-500'}`} /> {role === 'profesor' && 'PDF Vale'}
                        </Button>
                      </>
                    )}
                    {(vale.vale_status === 'completed' || vale.vale_status === 'rejected') && (
                      <>
                        <Button variant="outline" className="flex-1 h-10 rounded-xl text-primary font-bold border-primary/20 hover:bg-primary/10" onClick={() => exportVale(vale)}>
                          <FileText className="w-4 h-4 mr-2" /> PDF Vale
                        </Button>
                        {role === 'director' && (
                          <Button variant="ghost" className="h-10 w-10 p-0 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(vale.id)}>
                            <X className="w-5 h-5" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Vale Drawer (Director) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">{role === 'profesor' ? 'Solicitar Préstamo' : 'Generar Vale Directo'}</h3>
                <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}><X className="w-5 h-5" /></Button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Responsable / Maestro *</label>
                  <Input 
                    value={role === 'profesor' ? (user?.user_metadata?.name || user?.email || 'Profesor') : formData.person_name} 
                    onChange={e => setFormData(p => ({ ...p, person_name: e.target.value }))} 
                    placeholder="Ej. Juan Pérez" 
                    required 
                    disabled={role === 'profesor'}
                    className={role === 'profesor' ? "bg-muted/30" : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold">Bien Solicitado (Almacén) *</label>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      📦 {warehouseItems.length} disponible{warehouseItems.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {warehouseItems.length === 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">No hay bienes disponibles en Almacén</p>
                        <p className="mt-0.5 opacity-90">
                          Solo los bienes ubicados en áreas de <strong>Almacén o Bodega</strong> y sin préstamo activo pueden solicitarse en vale.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <Select 
                    value={formData.item_id} 
                    onChange={e => setFormData(p => ({ ...p, item_id: e.target.value }))} 
                    required
                    disabled={warehouseItems.length === 0}
                  >
                    <option value="" disabled>
                      {warehouseItems.length === 0 ? 'Sin existencias en almacén...' : 'Seleccione un bien disponible en almacén...'}
                    </option>
                    {warehouseItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.description} — 📍 {locationMap[item.location_id]?.name || 'Almacén'} {item.serial_number ? `(Serie: ${item.serial_number})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold">Fecha Inicio *</label>
                    <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold">Fecha Fin (Opcional)</label>
                    <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Firma Digital (Opcional)</label>
                  {formData.signatureBase64 ? (
                    <div className="relative border rounded-xl p-2 bg-muted/30">
                      <img src={formData.signatureBase64} alt="Firma" className="h-20 w-auto mx-auto" />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => setFormData(p => ({ ...p, signatureBase64: null }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="w-full h-12 border-dashed border-2" onClick={() => setShowSignatureModal(true)}>
                      <PenTool className="w-4 h-4 mr-2" />
                      Agregar Firma Digital
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 text-center">Si se deja en blanco, el vale deberá firmarse en papel impreso.</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSignatureModal && (
        <SignatureModal
          onClose={() => setShowSignatureModal(false)}
          onSign={(dataUrl) => {
            setFormData(p => ({ ...p, signatureBase64: dataUrl }));
            setShowSignatureModal(false);
          }}
        />
      )}
    </div>
  )
}

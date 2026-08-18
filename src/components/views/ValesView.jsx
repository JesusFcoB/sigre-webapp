import React, { useState, useMemo } from 'react'
import HelpTooltip from '@/components/ui/HelpTooltip'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  FileSignature, Plus, X, FileText, CheckCircle2, PenTool, 
  Clock, XCircle, RotateCcw, AlertTriangle, User, Calendar, 
  Package, HelpCircle, ArrowRight, Tag, Layers, Check
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { syncValesToSupabase, syncItemsToSupabase } from '@/lib/sync'
import SignatureModal from '@/components/ui/SignatureModal'
import { useStore } from '@/store/useStore'

// ─── Helpers ────────────────────────────────────────────────
function getValeStatusMeta(vale) {
  const now = new Date()
  const endDate = vale.end_date ? new Date(vale.end_date + 'T23:59:59') : null

  if (vale.vale_type === 'supply' && vale.vale_status === 'completed') {
    return { label: 'Suministrado / Despachado', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: Package }
  }
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
    vale_type: 'loan', // 'loan' (Préstamo Devolutivo) | 'supply' (Suministro Consumible)
    person_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    item_id: '',
    quantity_requested: 1,
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
        if (v.item_id && v.vale_type !== 'supply') set.add(v.item_id)
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

  // Items in warehouse
  const allWarehouseItems = useMemo(() => {
    const hasWarehouses = locations.some(isWarehouseLocation)
    return items.filter(item => {
      const loc = locationMap[item.location_id]
      if (hasWarehouses) {
        return isWarehouseLocation(loc)
      }
      return !loc || isWarehouseLocation(loc)
    })
  }, [items, locations, locationMap])

  // Warehouse items for LOANS (fixed/devolutive, not on active loan)
  const warehouseLoanItems = useMemo(() => {
    return allWarehouseItems.filter(item => {
      if (item.resource_type === 'consumable') return false
      return !activeLoanItemIds.has(item.id)
    })
  }, [allWarehouseItems, activeLoanItemIds])

  // Warehouse items for SUPPLIES (consumables with available stock > 0)
  const warehouseSupplyItems = useMemo(() => {
    return allWarehouseItems.filter(item => {
      const isConsumable = item.resource_type === 'consumable' || item.category === 'Papelería y Consumibles'
      return isConsumable && (Number(item.quantity) || 1) > 0
    })
  }, [allWarehouseItems])

  // Selectable items in drawer based on vale_type
  const selectableItems = formData.vale_type === 'supply' ? warehouseSupplyItems : warehouseLoanItems
  const selectedItemRecord = itemMap[formData.item_id]

  // Categorize vales for tabs
  const pendingVales = useMemo(() => vales.filter(v => v.vale_status === 'pending_approval'), [vales])
  const activeVales = useMemo(() => vales.filter(v => v.vale_status === 'active' && v.vale_type !== 'supply'), [vales])
  const supplyVales = useMemo(() => vales.filter(v => v.vale_type === 'supply' && v.vale_status === 'completed'), [vales])
  const historyVales = useMemo(() => vales.filter(v => (v.vale_status === 'completed' && v.vale_type !== 'supply') || v.vale_status === 'rejected'), [vales])

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
      const isSupply = formData.vale_type === 'supply'
      
      const newVale = {
        ...formData,
        quantity_requested: Number(formData.quantity_requested) || 1,
        person_name: isProfesor ? userName : formData.person_name,
        vale_status: isProfesor ? 'pending_approval' : (isSupply ? 'completed' : 'active'),
        requested_by: userName,
        requested_at: new Date().toISOString(),
        approved_at: isProfesor ? null : new Date().toISOString(),
        completed_at: (!isProfesor && isSupply) ? new Date().toISOString() : null,
        sync_status: 'pending_create'
      }

      await db.vales.add(newVale)

      // If Director creates a supply directly, discount stock immediately
      if (!isProfesor && isSupply && formData.item_id) {
        const target = await db.items.get(formData.item_id)
        if (target) {
          const newQty = Math.max(0, (Number(target.quantity) || 1) - (Number(formData.quantity_requested) || 1))
          await db.items.update(target.id, {
            quantity: newQty,
            sync_status: 'pending_update'
          })
          if (navigator.onLine) syncItemsToSupabase()
        }
      }

      setDrawerOpen(false)
      setFormData({
        vale_type: 'loan',
        person_name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        item_id: '',
        quantity_requested: 1,
        signatureBase64: null
      })
      if (navigator.onLine) syncValesToSupabase()
    } catch (err) {
      console.error(err)
    }
  }

  const handleApprove = async (vale) => {
    const isSupply = vale.vale_type === 'supply'
    
    if (isSupply) {
      // Approve and complete supply + deduct stock
      await db.vales.update(vale.id, {
        vale_status: 'completed',
        approved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        sync_status: vale.sync_status === 'synced' ? 'pending_update' : vale.sync_status
      })

      if (vale.item_id) {
        const target = await db.items.get(vale.item_id)
        if (target) {
          const newQty = Math.max(0, (Number(target.quantity) || 1) - (Number(vale.quantity_requested) || 1))
          await db.items.update(target.id, {
            quantity: newQty,
            sync_status: 'pending_update'
          })
          if (navigator.onLine) syncItemsToSupabase()
        }
      }
    } else {
      // Approve loan
      await db.vales.update(vale.id, {
        vale_status: 'active',
        approved_at: new Date().toISOString(),
        sync_status: vale.sync_status === 'synced' ? 'pending_update' : vale.sync_status
      })
    }

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
    const isSupply = vale.vale_type === 'supply'
    
    doc.setFontSize(20)
    doc.text(isSupply ? "VALE DE SUMINISTRO DE MATERIAL" : "VALE DE PRÉSTAMO Y RESGUARDO", 105, 20, { align: "center" })
    
    doc.setFontSize(11)
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 14, 40)
    doc.text(`Solicitante / Receptor: ${vale.person_name}`, 14, 48)
    doc.text(`Tipo de Vale: ${isSupply ? 'Suministro Consumible (No Devolutivo)' : 'Préstamo Temporal (Devolutivo)'}`, 14, 56)
    if (!isSupply) {
      doc.text(`Vigencia: Desde ${vale.start_date} hasta ${vale.end_date || 'Entrega pendiente'}`, 14, 64)
    }
    
    doc.text(isSupply ? "Se hace entrega del siguiente material consumible para uso educativo:" : "El abajo firmante asume la responsabilidad del resguardo del siguiente bien:", 14, isSupply ? 68 : 76)
    
    autoTable(doc, {
      startY: isSupply ? 76 : 84,
      head: [["Artículo", "No. Serie / Folio", "Categoría", "Cantidad", "Almacén de Salida"]],
      body: [
        [
          item?.name || item?.description || "Artículo no especificado",
          item?.serial_number || "S/N",
          item?.category || "General",
          isSupply ? (vale.quantity_requested || 1) : 1,
          locationMap[item?.location_id]?.name || "Almacén General"
        ]
      ],
      headStyles: { fillColor: isSupply ? [126, 34, 206] : [30, 58, 138] }
    })
    
    const finalY = doc.lastAutoTable.finalY + 30
    doc.text("_______________________________", 105, finalY, { align: "center" })
    doc.text(vale.person_name, 105, finalY + 8, { align: "center" })
    doc.text("Firma de Conformidad", 105, finalY + 15, { align: "center" })
    
    if (vale.signatureBase64) {
      doc.addImage(vale.signatureBase64, 'PNG', 85, finalY - 25, 40, 20)
    }
    
    doc.save(`SIGRE_Vale_${vale.person_name.replace(/\s+/g, '_')}_${vale.start_date}.pdf`)
  }

  return (
    <div className="flex flex-col h-full pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2 border-b">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary" /> Vales y Préstamos
            <HelpTooltip 
              title="Gestión de Vales y Suministros" 
              text="Administra préstamos temporales de equipo y suministros de papelería/limpieza de almacén. Permite firmar vales digitalmente y descargar actas PDF." 
            />
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Control de préstamos temporales y suministros de almacén</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="h-10 rounded-xl font-bold gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Vale</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted p-1 rounded-2xl gap-1 overflow-x-auto">
        <button
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'pending' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Pendientes ({pendingVales.length})</span>
        </button>

        <button
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'active' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('active')}
        >
          <Package className="w-3.5 h-3.5 text-blue-500" />
          <span>Préstamos Activos ({activeVales.length})</span>
          {expiredCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {expiredCount}
            </span>
          )}
        </button>

        <button
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'supply' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('supply')}
        >
          <Tag className="w-3.5 h-3.5 text-purple-500" />
          <span>Suministros ({supplyVales.length})</span>
        </button>

        <button
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'
          }`}
          onClick={() => setActiveTab('history')}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Historial ({historyVales.length})</span>
        </button>
      </div>

      {/* Content based on Active Tab */}
      {(() => {
        let currentList = []
        if (activeTab === 'pending') currentList = pendingVales
        else if (activeTab === 'active') currentList = activeVales
        else if (activeTab === 'supply') currentList = supplyVales
        else currentList = historyVales

        if (currentList.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed rounded-3xl text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <FileSignature className="w-8 h-8 opacity-80" />
              </div>
              <h3 className="font-bold text-lg text-foreground mb-1">
                {activeTab === 'pending' ? 'No hay solicitudes pendientes' : 
                 activeTab === 'active' ? 'No hay préstamos activos' : 
                 activeTab === 'supply' ? 'No hay suministros registrados' : 'Sin historial de vales'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs font-medium">
                {activeTab === 'pending' ? 'Las solicitudes de préstamo o suministro hechas por profesores aparecerán aquí.' : 'Los registros se actualizarán conforme se autoricen y entreguen vales.'}
              </p>
            </div>
          )
        }

        return (
          <div className="flex flex-col gap-3">
            {currentList.map(vale => {
              const item = itemMap[vale.item_id]
              const meta = getValeStatusMeta(vale)
              const remaining = getDaysRemaining(vale.end_date)
              const isSupply = vale.vale_type === 'supply'

              return (
                <div key={vale.id} className="bg-card border rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${meta.color}`}>
                          {meta.label}
                        </span>
                        {isSupply ? (
                          <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            📦 Suministro ({vale.quantity_requested || 1} uds)
                          </span>
                        ) : (
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            🏢 Préstamo Devolutivo
                          </span>
                        )}
                      </div>
                      
                      <h4 className="font-bold text-base text-foreground mt-1 truncate">
                        {item?.name || item?.description || 'Artículo no especificado'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Solicitante: <span className="font-semibold text-foreground">{vale.person_name}</span>
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => exportVale(vale)} title="Descargar Vale PDF">
                        <FileText className="w-4 h-4" />
                      </Button>
                      {role === 'director' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(vale.id)} title="Eliminar Vale">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dates and details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-xl border border-border/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Salida: {vale.start_date}
                    </span>
                    {!isSupply && vale.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Compromiso: {vale.end_date}
                        {remaining !== null && (
                          <strong className={remaining < 0 ? 'text-red-500 ml-1' : remaining <= 2 ? 'text-amber-500 ml-1' : 'text-emerald-600 ml-1'}>
                            ({remaining < 0 ? `Vencido hace ${Math.abs(remaining)}d` : remaining === 0 ? 'Vence hoy' : `${remaining}d restantes`})
                          </strong>
                        )}
                      </span>
                    )}
                    {item?.serial_number && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Serie: {item.serial_number}
                      </span>
                    )}
                  </div>

                  {/* Action Buttons for Director / Admin */}
                  {role !== 'profesor' && (
                    <div className="flex gap-2 justify-end pt-1">
                      {vale.vale_status === 'pending_approval' && (
                        <>
                          <Button size="sm" variant="outline" className="h-9 text-xs rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleReject(vale)}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Rechazar
                          </Button>
                          <Button size="sm" className="h-9 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprove(vale)}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            {isSupply ? "Aprobar y Despachar" : "Aprobar Préstamo"}
                          </Button>
                        </>
                      )}
                      {vale.vale_status === 'active' && !isSupply && (
                        <Button size="sm" className="h-9 text-xs rounded-xl font-bold bg-primary hover:bg-primary/90" onClick={() => handleComplete(vale)}>
                          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Marcar como Devuelto
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Create Vale Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Solicitud de Vale</h3>
                  <p className="text-muted-foreground text-sm">Préstamo o suministro de material de almacén</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setDrawerOpen(false)}><X className="w-5 h-5" /></Button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* 1. Tipo de Vale */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Tipo de Solicitud *</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, vale_type: 'loan', item_id: '' }))}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        formData.vale_type === 'loan' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Package className="w-4 h-4 text-primary" />
                      <span>Préstamo Temporal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, vale_type: 'supply', item_id: '' }))}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        formData.vale_type === 'supply' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Tag className="w-4 h-4 text-purple-600" />
                      <span>Suministro Consumible</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground italic">
                    {formData.vale_type === 'loan' 
                      ? 'Para equipos y mobiliario fijo que deben devolverse al almacén.' 
                      : 'Para papelería y artículos de consumo que se descuentan del inventario.'}
                  </p>
                </div>

                {/* 2. Solicitante */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Persona Responsable / Solicitante *</label>
                  <Input 
                    value={role === 'profesor' ? (user?.user_metadata?.name || user?.email || 'Profesor') : formData.person_name} 
                    onChange={e => setFormData(p => ({ ...p, person_name: e.target.value }))} 
                    placeholder="Ej. Juan Pérez López" 
                    required 
                    disabled={role === 'profesor'}
                    className={role === 'profesor' ? "bg-muted/30 h-11" : "h-11"}
                  />
                </div>

                {/* 3. Selección de Bien de Almacén */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                      {formData.vale_type === 'supply' ? 'Material Consumible (Almacén) *' : 'Bien Solicitado (Almacén) *'}
                    </label>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      📦 {selectableItems.length} disponible{selectableItems.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {selectableItems.length === 0 ? (
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Sin existencias en Almacén</p>
                        <p className="mt-0.5 opacity-90">
                          {formData.vale_type === 'supply'
                            ? 'No hay materiales consumibles registrados en áreas de Almacén o Bodega.'
                            : 'No hay bienes de activo fijo disponibles en Almacén sin préstamo activo.'}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <Select 
                    value={formData.item_id} 
                    onChange={e => setFormData(p => ({ ...p, item_id: e.target.value }))} 
                    required
                    disabled={selectableItems.length === 0}
                    className="h-11 text-xs"
                  >
                    <option value="" disabled>
                      {selectableItems.length === 0 ? 'Sin existencias...' : 'Selecciona un artículo disponible...'}
                    </option>
                    {selectableItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name || item.description} — 📍 {locationMap[item.location_id]?.name || 'Almacén'} {item.quantity ? `(Stock: ${item.quantity})` : ''} {item.serial_number ? `(Serie: ${item.serial_number})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Si es consumible: Selector de Cantidad */}
                {formData.vale_type === 'supply' && (
                  <div className="space-y-1.5 bg-purple-50/60 dark:bg-purple-950/20 p-3 rounded-2xl border border-purple-200 dark:border-purple-900/50">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-900 dark:text-purple-300 uppercase">Cantidad a Suministrar *</label>
                      {selectedItemRecord && (
                        <span className="text-xs text-purple-700 dark:text-purple-300 font-bold">
                          Máx. disponible: {selectedItemRecord.quantity || 1}
                        </span>
                      )}
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max={selectedItemRecord ? Number(selectedItemRecord.quantity) || 1 : 999}
                      value={formData.quantity_requested}
                      onChange={e => setFormData(p => ({ ...p, quantity_requested: Math.max(1, parseInt(e.target.value, 10) || 1) }))}
                      required
                      className="h-11 font-bold text-sm bg-background"
                    />
                    <p className="text-[11px] text-purple-700 dark:text-purple-400">
                      Al aprobarse este vale, las {formData.quantity_requested} unidades se descontarán automáticamente del almacén.
                    </p>
                  </div>
                )}

                {/* Fechas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase">Fecha de Salida *</label>
                    <Input type="date" value={formData.start_date} onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))} required className="h-11 text-xs" />
                  </div>
                  {formData.vale_type === 'loan' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground uppercase">Fecha Compromiso</label>
                      <Input type="date" value={formData.end_date} onChange={e => setFormData(p => ({ ...p, end_date: e.target.value }))} className="h-11 text-xs" />
                    </div>
                  )}
                </div>
                
                {/* Firma Digital */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-foreground uppercase">Firma Digital (Opcional)</label>
                  {formData.signatureBase64 ? (
                    <div className="relative border rounded-2xl p-2 bg-muted/30">
                      <img src={formData.signatureBase64} alt="Firma" className="h-20 w-auto mx-auto" />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => setFormData(p => ({ ...p, signatureBase64: null }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="w-full h-12 border-dashed border-2 rounded-2xl" onClick={() => setShowSignatureModal(true)}>
                      <PenTool className="w-4 h-4 mr-2" />
                      Agregar Firma Digital
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground text-center">Si se deja en blanco, podrá firmarse físicamente en papel.</p>
                </div>

                <div className="flex gap-3 pt-3">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {role === 'profesor' ? 'Enviar Solicitud' : 'Crear Vale'}
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

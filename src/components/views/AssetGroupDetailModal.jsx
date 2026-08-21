import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { db, addHistoryRecord } from "@/lib/db"
import { syncItemsToSupabase } from "@/lib/sync"
import { useLiveQuery } from "dexie-react-hooks"
import {
  Package, X, ChevronDown, ChevronRight, QrCode,
  Edit2, Trash2, Info, MapPin, FileSpreadsheet,
  Search, MoreVertical, ArrowRightLeft, Tag,
  History, Clock, CheckCircle2
} from "lucide-react"
import * as XLSX from 'xlsx'

// ─── Constants ────────────────────────────────────────────────
const CONDITIONS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", barColor: "bg-blue-500", dotColor: "bg-blue-500" },
  { value: "bueno", label: "Bueno", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", barColor: "bg-green-500", dotColor: "bg-green-500" },
  { value: "regular", label: "Regular", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", barColor: "bg-yellow-500", dotColor: "bg-yellow-500" },
  { value: "malo", label: "Malo", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", barColor: "bg-red-500", dotColor: "bg-red-500" },
]

const conditionMeta = (val) => CONDITIONS.find(c => c.value === val) || { label: val || "—", color: "bg-gray-100 text-gray-600", barColor: "bg-gray-400", dotColor: "bg-gray-400" }

// ─── Dropdown Menu (Custom, no Radix dependency) ─────────────
function ItemDropdown({ item, role, onTransfer, onChangeState, onHistory, onEdit, onBaja }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const menuItems = [
    { icon: ArrowRightLeft, label: "Traspasar", action: () => onTransfer(item), color: "text-blue-600 dark:text-blue-400", show: role !== 'profesor' },
    { icon: Tag, label: "Cambiar Estado", action: () => onChangeState(item), color: "text-amber-600 dark:text-amber-400", show: role !== 'profesor' },
    { icon: History, label: "Ver Historial", action: () => onHistory(item), color: "text-purple-600 dark:text-purple-400", show: true },
    { icon: Edit2, label: "Editar", action: () => onEdit(item), color: "text-foreground", show: role !== 'profesor' },
    { icon: Trash2, label: "Dar de Baja", action: () => onBaja(item), color: "text-red-600 dark:text-red-400", show: role === 'director' },
  ]

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-muted"
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p) }}
      >
        <MoreVertical className="w-4 h-4 text-muted-foreground" />
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-xl shadow-xl z-[80] p-1 animate-in fade-in-50 zoom-in-95 duration-150">
          {menuItems.filter(m => m.show).map((m, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); m.action() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors text-left"
            >
              <m.icon className={`w-4 h-4 shrink-0 ${m.color}`} />
              <span className={m.color}>{m.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Transfer Modal ──────────────────────────────────────────
function TransferModal({ item, locations, locationMap, userName, onClose, onDone }) {
  const [targetLocation, setTargetLocation] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const currentLocName = locationMap[item.location_id]?.name || item.location_id || 'Sin ubicación'

  const filtered = useMemo(() => {
    if (!search.trim()) return locations.filter(l => l.id !== item.location_id)
    return locations.filter(l =>
      l.id !== item.location_id &&
      ((l.name || '').toLowerCase().includes(search.toLowerCase()) ||
       (l.responsible_name || '').toLowerCase().includes(search.toLowerCase()))
    )
  }, [locations, search, item.location_id])

  const handleSubmit = async () => {
    if (!targetLocation || saving) return
    setSaving(true)
    try {
      const oldLocName = locationMap[item.location_id]?.name || item.location_id || 'Sin ubicación'
      const newLocName = locationMap[targetLocation]?.name || targetLocation

      await db.items.update(item.id, {
        location_id: targetLocation,
        sync_status: 'pending_update'
      })

      await addHistoryRecord('transfer', item.id, item.location_id, targetLocation, {
        oldLabel: oldLocName,
        newLabel: newLocName,
        userName
      })

      if (navigator.onLine) syncItemsToSupabase()
      onDone()
    } catch (err) {
      console.error('Error en traspaso:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl z-10 p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            Traspasar Bien
          </h3>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground font-medium">
          Serie: <span className="font-mono font-bold text-foreground">{item.serial_number || 'Sin serie'}</span>
        </p>

        {/* Current Location */}
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-1">Ubicación Actual</p>
          <p className="text-sm font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4" /> {currentLocName}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <ChevronDown className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        {/* Target Location */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Nueva Ubicación</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar salón..."
              className="pl-9 h-10 rounded-xl text-sm"
            />
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-xl p-1.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No se encontraron salones</p>
            ) : (
              filtered.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => setTargetLocation(loc.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    targetLocation === loc.id
                      ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700 border font-bold text-green-700 dark:text-green-300'
                      : 'hover:bg-muted font-medium'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{loc.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{loc.responsible_name || '—'}</p>
                  </div>
                  {targetLocation === loc.id && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmit}
            disabled={!targetLocation || saving}
          >
            {saving ? 'Guardando...' : 'Confirmar Traspaso'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── State Change Modal ──────────────────────────────────────
function StateChangeModal({ item, locationMap, userName, onClose, onDone }) {
  const [newCondition, setNewCondition] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const currentMeta = conditionMeta(item.condition)

  const handleSubmit = async () => {
    if (!newCondition || newCondition === item.condition || saving) return
    setSaving(true)
    try {
      const oldMeta = conditionMeta(item.condition)
      const newMeta = conditionMeta(newCondition)

      await db.items.update(item.id, {
        condition: newCondition,
        sync_status: 'pending_update'
      })

      await addHistoryRecord('state_change', item.id, item.condition, newCondition, {
        oldLabel: oldMeta.label,
        newLabel: newMeta.label,
        reason,
        userName
      })

      if (navigator.onLine) syncItemsToSupabase()
      onDone()
    } catch (err) {
      console.error('Error al cambiar estado:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl z-10 p-5 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-600" />
            Cambiar Estado
          </h3>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground font-medium">
          Serie: <span className="font-mono font-bold text-foreground">{item.serial_number || 'Sin serie'}</span>
          {' · '}
          <span className="text-muted-foreground">{locationMap[item.location_id]?.name || item.location_id || '—'}</span>
        </p>

        {/* Current State */}
        <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-bold">Estado Actual:</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${currentMeta.color}`}>{currentMeta.label}</span>
        </div>

        {/* New State Selection */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Nuevo Estado</p>
          <div className="grid grid-cols-2 gap-2">
            {CONDITIONS.map(cond => {
              const isSelected = newCondition === cond.value
              const isCurrent = item.condition === cond.value
              return (
                <button
                  key={cond.value}
                  onClick={() => !isCurrent && setNewCondition(cond.value)}
                  disabled={isCurrent}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    isCurrent
                      ? 'opacity-30 cursor-not-allowed border-transparent bg-muted'
                      : isSelected
                        ? 'border-primary bg-primary/10 shadow-md scale-[1.02]'
                        : 'border-transparent hover:border-primary/30 hover:shadow-sm'
                  } ${cond.color}`}
                >
                  <p className="text-sm font-bold">{cond.label}</p>
                  {isCurrent && <p className="text-[9px] mt-0.5 opacity-60">Actual</p>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            Motivo / Observación
            <span className="text-[10px] text-muted-foreground font-normal">Opcional</span>
          </label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ej. Pata rota por uso excesivo, oxidación por humedad..."
            className="rounded-xl text-sm min-h-[70px] resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleSubmit}
            disabled={!newCondition || newCondition === item.condition || saving}
          >
            {saving ? 'Guardando...' : 'Confirmar Cambio'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── History Timeline Modal ──────────────────────────────────
function HistoryTimelineModal({ item, locationMap, onClose }) {
  const history = useLiveQuery(
    () => db.item_history.where('item_id').equals(item.id).reverse().sortBy('created_at'),
    [item.id]
  )

  const isLoading = history === undefined
  const records = history || []

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl z-10 p-5 space-y-4 animate-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            Historial
          </h3>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground font-medium">
          Serie: <span className="font-mono font-bold text-foreground">{item.serial_number || 'Sin serie'}</span>
        </p>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground mt-2">Cargando historial...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Sin movimientos registrados</p>
            <p className="text-xs text-muted-foreground mt-1">Los traspasos y cambios de estado aparecerán aquí.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-0">
            {/* Timeline vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border rounded-full" />

            {records.map((record, i) => {
              const isTransfer = record.action_type === 'transfer'
              const dotColor = isTransfer ? 'bg-blue-500' : conditionMeta(record.new_value).dotColor
              const IconComp = isTransfer ? ArrowRightLeft : Tag

              return (
                <div key={record.id} className="relative pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`absolute -left-6 top-1 w-[22px] h-[22px] rounded-full border-[3px] border-card flex items-center justify-center ${dotColor}`}>
                    <IconComp className="w-2.5 h-2.5 text-white" />
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3 border shadow-2xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTransfer
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {isTransfer ? '🔄 Traspaso' : '🏷️ Cambio de Estado'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{formatDate(record.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="text-muted-foreground line-through">{record.old_label}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-bold text-foreground">{record.new_label}</span>
                    </div>

                    {record.reason && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 italic border-t border-border/50 pt-1.5">
                        💬 {record.reason}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-1">
                      Por: <span className="font-semibold">{record.user_name}</span>
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Button variant="outline" className="w-full h-10 rounded-xl font-bold" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────
export default function AssetGroupDetailModal({
  groupName, groupItems, locations, locationMap, onClose, onEditItem, onBajaItem, onGenerateQR, role,
  searchTerm, user
}) {
  const [expandedLocation, setExpandedLocation] = useState(null)
  const [internalSearch, setInternalSearch] = useState('')

  // Mini-modal states
  const [transferItem, setTransferItem] = useState(null)
  const [stateChangeItem, setStateChangeItem] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)

  const userName = user?.user_metadata?.name || user?.email || 'Sistema'

  // Auto-populate search from parent searchTerm
  useEffect(() => {
    if (searchTerm && searchTerm.trim()) {
      setInternalSearch(searchTerm.trim())
    }
  }, [searchTerm])

  // Compute distribution data
  const detail = useMemo(() => {
    const byLocation = {}

    groupItems.forEach(item => {
      const locId = item.location_id || '__none__'
      const locName = locationMap[locId]?.name || locId || 'Sin aula'
      const responsible = locationMap[locId]?.responsible_name || '—'

      if (!byLocation[locId]) {
        byLocation[locId] = {
          locId, locName, responsible,
          count: 0,
          items: [],
          conditions: {}
        }
      }
      byLocation[locId].count += 1
      byLocation[locId].items.push(item)
      byLocation[locId].conditions[item.condition] = (byLocation[locId].conditions[item.condition] || 0) + 1
    })

    const byCondition = {}
    groupItems.forEach(item => {
      byCondition[item.condition] = (byCondition[item.condition] || 0) + 1
    })

    return {
      total: groupItems.length,
      byLocation: Object.values(byLocation).sort((a, b) => b.count - a.count),
      byCondition
    }
  }, [groupItems, locationMap])

  // Filter items by internal search
  const filterBySearch = (items) => {
    if (!internalSearch.trim()) return items
    const q = internalSearch.toLowerCase()
    return items.filter(item =>
      (item.serial_number || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q)
    )
  }

  // Auto-expand location that contains the searched item
  useEffect(() => {
    if (!internalSearch.trim()) return
    const q = internalSearch.toLowerCase()
    for (const loc of detail.byLocation) {
      const hasMatch = loc.items.some(item =>
        (item.serial_number || '').toLowerCase().includes(q)
      )
      if (hasMatch) {
        setExpandedLocation(loc.locId)
        return
      }
    }
  }, [internalSearch, detail.byLocation])

  // Representative item for photo/category
  const representative = groupItems.find(i => i.photoBase64) || groupItems[0]

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new()
      const rows = groupItems.map(item => ({
        'No. Serie': item.serial_number || '—',
        'Estado': conditionMeta(item.condition).label,
        'Ubicación': locationMap[item.location_id]?.name || item.location_id || '—',
        'Responsable': locationMap[item.location_id]?.responsible_name || '—',
        'Categoría': item.category || '—',
        'Origen': item.origin_provider || '—',
        'Descripción': item.description || '—'
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario Individual')

      // Summary sheet
      const summaryRows = detail.byLocation.map(loc => {
        const row = {
          'Ubicación': loc.locName,
          'Responsable': loc.responsible,
          'Cantidad': loc.count
        }
        CONDITIONS.forEach(c => {
          row[c.label] = loc.conditions[c.value] || 0
        })
        return row
      })
      const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen por Ubicación')

      const dateStr = new Date().toISOString().split('T')[0]
      const safeName = groupName.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').substring(0, 30).trim()
      XLSX.writeFile(wb, `SIGRE_${safeName}_${dateStr}.xlsx`)
    } catch (err) {
      console.error('Error al exportar Excel:', err)
      alert('Hubo un error al generar el archivo Excel.')
    }
  }

  const handleGenerateQR = () => {
    const itemsForQR = expandedLocation
      ? detail.byLocation.find(l => l.locId === expandedLocation)?.items || groupItems
      : groupItems
    onGenerateQR(itemsForQR)
  }

  const toggleLocation = (locId) => {
    setExpandedLocation(prev => prev === locId ? null : locId)
  }

  // Callback when a transfer or state change is done — close mini-modal
  const handleActionDone = () => {
    setTransferItem(null)
    setStateChangeItem(null)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-card rounded-3xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="p-5 md:p-8 space-y-5">

          {/* Header */}
          <div className="flex items-start gap-3">
            {representative?.photoBase64 ? (
              <img src={representative.photoBase64} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground leading-tight">{groupName}</h3>
              {representative?.description && representative.description !== groupName && (
                <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">{representative.description}</p>
              )}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {representative?.category && (
                  <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{representative.category}</span>
                )}
                {representative?.resource_type === 'consumable' && (
                  <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold px-2.5 py-1 rounded-full">
                    🏷️ Consumible
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0 -mt-1" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Total Units Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Info className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium">Total de unidades registradas</p>
              <p className="text-4xl font-black text-primary">{detail.total}</p>
            </div>
          </div>

          {/* Internal Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={internalSearch}
              onChange={e => setInternalSearch(e.target.value)}
              placeholder="Buscar por número de serie..."
              className="pl-9 h-10 rounded-xl text-sm"
            />
            {internalSearch && (
              <button
                onClick={() => setInternalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="flex-1 h-10 rounded-xl font-bold gap-1.5 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/20">
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleGenerateQR} className="flex-1 h-10 rounded-xl font-bold gap-1.5 text-primary border-primary/20 hover:bg-primary/5">
              <QrCode className="w-4 h-4" />
              {expandedLocation ? 'QR de este Salón' : 'QR de Todos'}
            </Button>
          </div>

          {/* Distribution by Location */}
          <div>
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Distribución por Ubicación
            </h4>
            <div className="space-y-2">
              {detail.byLocation.map((loc) => {
                const isExpanded = expandedLocation === loc.locId
                const filteredLocItems = filterBySearch(loc.items)
                const hasSearchResults = !internalSearch.trim() || filteredLocItems.length > 0

                if (internalSearch.trim() && filteredLocItems.length === 0) return null

                return (
                  <div key={loc.locId} className={`rounded-2xl border transition-all duration-300 ${isExpanded ? 'shadow-md border-primary/30' : 'shadow-sm'}`}>
                    {/* Location Row (clickable) */}
                    <button
                      onClick={() => toggleLocation(loc.locId)}
                      className={`w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors text-left ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isExpanded ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{loc.locName}</p>
                          <p className="text-xs text-muted-foreground truncate">{loc.responsible}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-lg font-black text-primary">
                          {internalSearch.trim() ? filteredLocItems.length : loc.count}
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4 space-y-4 rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
                        {/* Condition Bars (only when not filtering) */}
                        {!internalSearch.trim() && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Estado de los {loc.count} productos</p>
                            {CONDITIONS.map(cond => {
                              const count = loc.conditions[cond.value] || 0
                              if (count === 0) return null
                              const pct = Math.round((count / loc.count) * 100)
                              return (
                                <div key={cond.value}>
                                  <div className="flex justify-between text-xs font-medium mb-1">
                                    <span className={`px-2 py-0.5 rounded-full font-bold ${cond.color}`}>{cond.label}</span>
                                    <span className="text-muted-foreground">{count} ({pct}%)</span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${cond.barColor}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Individual Items List */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                            {internalSearch.trim()
                              ? `${filteredLocItems.length} resultado${filteredLocItems.length !== 1 ? 's' : ''}`
                              : 'Productos Individuales'
                            }
                          </p>
                          <div className="space-y-1.5">
                            {filteredLocItems.map(item => {
                              const cm = conditionMeta(item.condition)
                              const isHighlighted = internalSearch.trim() &&
                                (item.serial_number || '').toLowerCase().includes(internalSearch.toLowerCase())
                              return (
                                <div
                                  key={item.id}
                                  className={`flex items-center justify-between bg-background p-2.5 rounded-xl border shadow-2xs transition-all ${
                                    isHighlighted ? 'ring-2 ring-primary/40 border-primary/30' : ''
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono font-bold text-foreground truncate">{item.serial_number || 'Sin serie'}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cm.color}`}>{cm.label}</span>
                                  </div>
                                  <ItemDropdown
                                    item={item}
                                    role={role}
                                    onTransfer={setTransferItem}
                                    onChangeState={setStateChangeItem}
                                    onHistory={setHistoryItem}
                                    onEdit={(it) => onEditItem(it)}
                                    onBaja={(it) => onBajaItem(it)}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Global Condition Summary */}
          {!internalSearch.trim() && (
            <div>
              <h4 className="text-sm font-bold text-foreground mb-2">Resumen Global por Estado</h4>
              <div className="space-y-2">
                {CONDITIONS.map(cond => {
                  const count = detail.byCondition[cond.value] || 0
                  if (count === 0) return null
                  const pct = Math.round((count / detail.total) * 100)
                  return (
                    <div key={cond.value}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${cond.color}`}>{cond.label}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${cond.barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Close */}
          <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {/* ─── Sub-Modals ─── */}
      {transferItem && (
        <TransferModal
          item={transferItem}
          locations={locations}
          locationMap={locationMap}
          userName={userName}
          onClose={() => setTransferItem(null)}
          onDone={handleActionDone}
        />
      )}

      {stateChangeItem && (
        <StateChangeModal
          item={stateChangeItem}
          locationMap={locationMap}
          userName={userName}
          onClose={() => setStateChangeItem(null)}
          onDone={handleActionDone}
        />
      )}

      {historyItem && (
        <HistoryTimelineModal
          item={historyItem}
          locationMap={locationMap}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  )
}

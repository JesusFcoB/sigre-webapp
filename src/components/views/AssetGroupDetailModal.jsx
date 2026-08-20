import React, { useState, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import {
  Package, X, ChevronDown, ChevronRight, QrCode,
  Edit2, Trash2, Info, MapPin, FileSpreadsheet
} from "lucide-react"
import * as XLSX from 'xlsx'

const CONDITIONS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", barColor: "bg-blue-500" },
  { value: "bueno", label: "Bueno", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", barColor: "bg-green-500" },
  { value: "regular", label: "Regular", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", barColor: "bg-yellow-500" },
  { value: "malo", label: "Malo", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", barColor: "bg-red-500" },
]

const conditionMeta = (val) => CONDITIONS.find(c => c.value === val) || { label: val || "—", color: "bg-gray-100 text-gray-600", barColor: "bg-gray-400" }

export default function AssetGroupDetailModal({
  groupName, groupItems, locations, locationMap, onClose, onEditItem, onBajaItem, onGenerateQR, role
}) {
  const [expandedLocation, setExpandedLocation] = useState(null)

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

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-3xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="p-5 space-y-5">

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
                return (
                  <div key={loc.locId} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-md border-primary/30' : 'shadow-sm'}`}>
                    {/* Location Row (clickable) */}
                    <button
                      onClick={() => toggleLocation(loc.locId)}
                      className="w-full flex items-center justify-between p-3.5 hover:bg-muted/50 transition-colors text-left"
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
                        <span className="text-lg font-black text-primary">{loc.count}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Condition Bars */}
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

                        {/* Individual Items List */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Productos Individuales</p>
                          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                            {loc.items.map(item => {
                              const cm = conditionMeta(item.condition)
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-background p-2.5 rounded-xl border shadow-2xs">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-mono font-bold text-foreground truncate">{item.serial_number || 'Sin serie'}</p>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cm.color}`}>{cm.label}</span>
                                  </div>
                                  {role !== 'profesor' && (
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                      <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full" onClick={() => onEditItem(item)} title="Editar">
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      {role === 'director' && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:bg-destructive/10" onClick={() => onBajaItem(item)} title="Dar de Baja">
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
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

          {/* Close */}
          <Button variant="outline" className="w-full h-11 rounded-xl font-bold" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}

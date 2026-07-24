import React, { useState, useMemo, useEffect } from "react"
import { db } from "@/lib/db"
import { syncItemsToSupabase } from "@/lib/sync"
import { useLiveQuery } from "dexie-react-hooks"
import { useStore } from "@/store/useStore"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import BarcodeScanner from "@/components/ui/BarcodeScanner"
import {
  Package, PackagePlus, Search, Filter, X, Edit2, Trash2,
  Camera, ScanBarcode, AlertCircle, CheckCircle2, ChevronDown,
  FileSpreadsheet, FileText, Info, Layers
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

// ─── Constants ────────────────────────────────────────────────
const CONDITIONS = [
  { value: "nuevo",   label: "Nuevo",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "bueno",   label: "Bueno",   color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "regular", label: "Regular", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "malo",    label: "Malo",    color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
]
const CATEGORIES = ["Mobiliario", "Electrónico", "Didáctico", "Otro"]

const conditionMeta = (val) => CONDITIONS.find(c => c.value === val) || { label: val || "—", color: "bg-gray-100 text-gray-600" }

function emptyForm() {
  return { description: "", condition: "", location_id: "", category: "", serial_number: "", photoBase64: "", quantity: 1, maintenance_frequency_months: 0, last_maintenance_date: "" }
}

const getMaintenanceInfo = (item) => {
  if (!item.maintenance_frequency_months || item.maintenance_frequency_months <= 0) return null;
  if (!item.last_maintenance_date) return { status: 'red', text: 'Mantenimiento Pendiente', color: 'bg-red-500' };
  
  const lastDate = new Date(item.last_maintenance_date);
  const nextDate = new Date(lastDate);
  nextDate.setMonth(nextDate.getMonth() + Number(item.maintenance_frequency_months));
  
  const diffDays = (nextDate - new Date()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return { status: 'red', text: 'Mantenimiento Vencido', color: 'bg-red-500' };
  if (diffDays <= 15) return { status: 'yellow', text: 'Mantenimiento Próximo', color: 'bg-yellow-500' };
  return { status: 'green', text: 'Mantenimiento al Día', color: 'bg-green-500' };
};

// ─── Main component ────────────────────────────────────────────
export default function AssetsView() {
  // Filters
  const [search, setSearch]                   = useState("")
  const [filterLocation, setFilterLocation]   = useState("")
  const [filterConditions, setFilterConditions] = useState([])
  const [filterCategory, setFilterCategory]   = useState("")
  const [filtersOpen, setFiltersOpen]         = useState(false)
  
  // Tabs & Bajas
  const [activeTab, setActiveTab] = useState("active")
  const [bajaModalOpen, setBajaModalOpen] = useState(false)
  const [bajaData, setBajaData] = useState({ reason: '', location: '', photoBase64: '' })
  const [itemToBaja, setItemToBaja] = useState(null)

  // CRUD Drawer
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [formData, setFormData]       = useState(emptyForm())
  const [formError, setFormError]     = useState("")
  const [isScanning, setIsScanning]   = useState(false)

  // Detail modal
  const [detailItem, setDetailItem]   = useState(null)

  const allItems  = useLiveQuery(() => db.items.toArray(), []) || []
  const locations = useLiveQuery(() => db.locations.toArray(), []) || []
  const role = useStore((state) => state.role);

  const editingItem = useStore(state => state.editingItem)
  const setEditingItem = useStore(state => state.setEditingItem)

  useEffect(() => {
    if (editingItem) {
      setEditingId(editingItem.id)
      setFormData({
        description: editingItem.description || "",
        condition: editingItem.condition || "",
        location_id: editingItem.location_id || "",
        category: editingItem.category || "",
        serial_number: editingItem.serial_number || "",
        photoBase64: editingItem.photoBase64 || "",
        quantity: editingItem.quantity || 1
      })
      setFormError("")
      setDrawerOpen(true)
      setEditingItem(null)
    }
  }, [editingItem, setEditingItem])

  const handleBajaImageCapture = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setBajaData(p => ({ ...p, photoBase64: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleBajaSubmit = async (e) => {
    e.preventDefault()
    if (!itemToBaja) return
    try {
      await db.items.update(itemToBaja.id, {
        status: 'discarded',
        discard_reason: bajaData.reason,
        discard_location: bajaData.location,
        discard_date: new Date().toISOString(),
        discard_photoBase64: bajaData.photoBase64 || null,
        sync_status: 'pending_update'
      })
      setBajaModalOpen(false)
      setBajaData({ reason: '', location: '', photoBase64: '' })
      setItemToBaja(null)
      if (navigator.onLine) syncItemsToSupabase()
    } catch(err) {
      console.error(err)
    }
  }


  const locationMap = useMemo(() => {
    const m = {}
    locations.forEach(l => { m[l.id] = l })
    return m
  }, [locations])

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      const isDiscarded = item.status === 'discarded'
      if (activeTab === 'active' && isDiscarded) return false
      if (activeTab === 'discarded' && !isDiscarded) return false

      const matchSearch    = !search || (item.description || '').toLowerCase().includes(search.toLowerCase()) || (item.serial_number || '').toLowerCase().includes(search.toLowerCase())
      
      // Permitir que si item.location_id es texto libre (importado de excel) empate con el nombre del salón del filtro
      const locFilterName = locationMap[filterLocation]?.name?.toLowerCase();
      const matchLocation  = !filterLocation || item.location_id === filterLocation || (locFilterName && (item.location_id || '').toLowerCase() === locFilterName);
      
      const matchCondition = filterConditions.length === 0 || filterConditions.includes(item.condition)
      const matchCategory  = !filterCategory || item.category === filterCategory || (!item.category && filterCategory === "Otro")
      return matchSearch && matchLocation && matchCondition && matchCategory
    })
  }, [allItems, search, filterLocation, filterConditions, filterCategory])

  const buildDetail = (item) => {
    const sameDesc = allItems.filter(i => i.description?.toLowerCase() === item.description?.toLowerCase())
    const byLocation = {}
    const byCondition = {}
    sameDesc.forEach(i => {
      const q = i.quantity || 1
      const locName = locationMap[i.location_id]?.name || "Sin aula"
      const resp    = locationMap[i.location_id]?.responsible_name || "—"
      if (!byLocation[locName]) byLocation[locName] = { count: 0, responsible: resp }
      byLocation[locName].count += q
      byCondition[i.condition] = (byCondition[i.condition] || 0) + q
    })
    const totalQty = sameDesc.reduce((acc, i) => acc + (i.quantity || 1), 0)
    return { total: totalQty, byLocation, byCondition }
  }

  const toggleCondition = (val) =>
    setFilterConditions(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val])

  const openCreate = () => { setEditingId(null); setFormData(emptyForm()); setFormError(""); setDrawerOpen(true) }

  const openEdit = (item, e) => {
    e.stopPropagation()
    setEditingId(item.id)
    setFormData({ description: item.description || "", condition: item.condition || "", location_id: item.location_id || "", category: item.category || "", serial_number: item.serial_number || "", photoBase64: item.photoBase64 || "", quantity: item.quantity || 1, maintenance_frequency_months: item.maintenance_frequency_months || 0, last_maintenance_date: item.last_maintenance_date || "" })
    setFormError("")
    setDrawerOpen(true)
  }

  const handleImageCapture = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setFormData(p => ({ ...p, photoBase64: reader.result }))
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    const serial = formData.serial_number?.trim()
    if (serial) {
      const existing = await db.items.filter(i => i.serial_number === serial).first()
      if (existing && existing.id !== editingId) { setFormError("Ya existe un bien con este número de serie."); return }
    }
    try {
      if (editingId) {
        await db.items.update(editingId, { description: formData.description, condition: formData.condition, location_id: formData.location_id, category: formData.category, serial_number: serial || null, photoBase64: formData.photoBase64 || null, quantity: Number(formData.quantity) || 1, maintenance_frequency_months: Number(formData.maintenance_frequency_months) || 0, last_maintenance_date: formData.last_maintenance_date || null })
      } else {
        await db.items.add({ id: crypto.randomUUID(), description: formData.description, condition: formData.condition, location_id: formData.location_id, category: formData.category || null, serial_number: serial || null, photoBase64: formData.photoBase64 || null, sync_status: "pending_create", quantity: Number(formData.quantity) || 1, maintenance_frequency_months: Number(formData.maintenance_frequency_months) || 0, last_maintenance_date: formData.last_maintenance_date || null })
      }
      setDrawerOpen(false)
      if (navigator.onLine) syncItemsToSupabase()
    } catch (err) { console.error(err); setFormError("Error al guardar el bien.") }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (window.confirm("¿Eliminar este bien del registro local?")) await db.items.delete(id)
  }

  const buildFilterLabel = () => {
    const parts = []
    if (search) parts.push(`Búsqueda: "${search}"`)
    if (filterLocation) parts.push(`Salón: ${locationMap[filterLocation]?.name || filterLocation}`)
    if (filterConditions.length) parts.push(`Estado: ${filterConditions.join(", ")}`)
    if (filterCategory) parts.push(`Cat: ${filterCategory}`)
    return parts.length ? parts.join(" | ") : "Sin filtros"
  }

  const exportExcel = () => {
    const wb  = XLSX.utils.book_new()
    const rows = filteredItems.map(i => ({
      "Descripción": i.description || "", "Categoría": i.category || "—",
      "Estado": conditionMeta(i.condition).label, "Salón": locationMap[i.location_id]?.name || "—",
      "Responsable": locationMap[i.location_id]?.responsible_name || "—", "No. Serie": i.serial_number || "—", "Cantidad": i.quantity || 1
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Listado")
    const byState = {}
    filteredItems.forEach(i => { byState[i.condition] = (byState[i.condition] || 0) + 1 })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(byState).map(([k, v]) => ({ Estado: conditionMeta(k).label, Cantidad: v }))), "Por Estado")
    const byLoc = {}
    filteredItems.forEach(i => { const n = locationMap[i.location_id]?.name || "—"; byLoc[n] = (byLoc[n] || 0) + 1 })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(Object.entries(byLoc).map(([k, v]) => ({ Salón: k, Cantidad: v }))), "Por Salón")
    XLSX.writeFile(wb, `SIGRE_Bienes_${new Date().toLocaleDateString("es-MX").replace(/\//g, "-")}.xlsx`)
  }

  const exportPDF = () => {
    const doc  = new jsPDF({ orientation: "landscape" })
    const date = new Date().toLocaleDateString("es-MX")
    doc.setFontSize(16); doc.text("SIGRE — Inventario de Bienes", 14, 14)
    doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generado: ${date}   Filtros: ${buildFilterLabel()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [["Descripción","Categoría","Estado","Salón","Responsable","No. Serie","Cant."]],
      body: filteredItems.map(i => [i.description||"", i.category||"—", conditionMeta(i.condition).label, locationMap[i.location_id]?.name||"—", locationMap[i.location_id]?.responsible_name||"—", i.serial_number||"—", i.quantity||1]),
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [59,130,246] }, alternateRowStyles: { fillColor: [245,247,250] }
    })
    doc.save(`SIGRE_Bienes_${date.replace(/\//g,"-")}.pdf`)
  }

  const activeFiltersCount = [!!search, !!filterLocation, filterConditions.length > 0, !!filterCategory].filter(Boolean).length
  const clearFilters = () => { setSearch(""); setFilterLocation(""); setFilterConditions([]); setFilterCategory("") }

  return (
    <div className="flex flex-col h-full pb-28 space-y-4">

      {isScanning && (
        <BarcodeScanner
          onScan={(data) => { setFormData(p => ({ ...p, serial_number: data })); setIsScanning(false) }}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Bienes
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{filteredItems.length} de {allItems.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={exportExcel} title="Exportar Excel">
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={exportPDF} title="Exportar PDF">
            <FileText className="w-4 h-4 text-red-500" />
          </Button>
          <Button onClick={openCreate} className="h-10 rounded-xl font-bold gap-1.5 bg-primary hover:bg-primary/90">
            <PackagePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Bien</span>
          </Button>
        </div>
      </div>

      {/* Tabs Bajas */}
      <div className="flex bg-muted p-1 rounded-xl">
        <button 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'active' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('active')}
        >
          Bienes Activos
        </button>
        <button 
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'discarded' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          onClick={() => setActiveTab('discarded')}
        >
          Dados de Baja
        </button>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por descripción o No. de serie…" className="pl-9 h-11 rounded-xl" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
        </div>
        <Button variant="outline" onClick={() => setFiltersOpen(p => !p)} className={`h-11 px-3 rounded-xl gap-1.5 transition-all ${activeFiltersCount > 0 ? "border-primary text-primary" : ""}`}>
          <Filter className="w-4 h-4" />
          {activeFiltersCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{activeFiltersCount}</span>}
          <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="bg-card border rounded-2xl p-4 space-y-4 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Salón / Responsable</label>
              <Select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="h-10 rounded-xl">
                <option value="">Todos los salones</option>
                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} — {loc.responsible_name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Categoría</label>
              <Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-10 rounded-xl">
                <option value="">Todas las categorías</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Estado</label>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map(cond => (
                <button key={cond.value} onClick={() => toggleCondition(cond.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${filterConditions.includes(cond.value) ? "border-primary bg-primary text-primary-foreground shadow-md scale-105" : "border-transparent " + cond.color + " hover:scale-105"}`}>
                  {cond.label}
                </button>
              ))}
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground gap-1">
              <X className="w-3 h-3" /> Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {/* Items list */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Layers className="w-12 h-12 opacity-30" />
          <p className="font-medium">No se encontraron bienes</p>
          <p className="text-xs opacity-60">Ajusta los filtros o registra un nuevo bien</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredItems.map(item => {
            const meta = conditionMeta(item.condition)
            const loc  = locationMap[item.location_id]
            return (
              <div key={item.id} onClick={() => setDetailItem(item)}
                className="bg-card border rounded-2xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer active:scale-[0.99] group">
                {item.photoBase64 ? (
                  <img src={item.photoBase64} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground opacity-50" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{item.description}</p>
                    {(() => {
                      const maint = getMaintenanceInfo(item);
                      return maint ? <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${maint.color} shadow-[0_0_5px_rgba(0,0,0,0.2)]`} title={maint.text} /> : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Cant: {item.quantity || 1}</span>
                    {item.category && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.category}</span>}
                    {loc && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">📍 {loc.name}</span>}
                  </div>
                  {item.serial_number && <p className="text-[10px] text-muted-foreground mt-0.5">Serie: {item.serial_number}</p>}
                </div>
                {role === 'director' && (
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => openEdit(item, e)} title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(item.id, e)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{editingId ? "Editar Bien" : "Nuevo Bien"}</h3>
                  <p className="text-muted-foreground text-sm">{editingId ? "Modifica los datos del registro" : "Completa la información del bien"}</p>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setDrawerOpen(false)}><X className="w-5 h-5" /></Button>
              </div>

              {formError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-xl flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Descripción *</label>
                  <Input name="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Ej. Minisplit Mirage 2T…" required className="h-12" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Categoría *</label>
                    <Select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} required>
                      <option value="" disabled>Seleccionar…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Estado *</label>
                    <Select value={formData.condition} onChange={e => setFormData(p => ({ ...p, condition: e.target.value }))} required>
                      <option value="" disabled>Seleccionar…</option>
                      {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Salón / Ubicación *</label>
                    <Select value={formData.location_id} onChange={e => setFormData(p => ({ ...p, location_id: e.target.value }))} required>
                      <option value="" disabled>Seleccionar salón…</option>
                      {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name} — {loc.responsible_name}</option>)}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Cantidad *</label>
                    <Input type="number" name="quantity" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} min="1" required className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Frec. Mant. (meses)</label>
                    <Input type="number" value={formData.maintenance_frequency_months} onChange={e => setFormData(p => ({ ...p, maintenance_frequency_months: e.target.value }))} placeholder="0 = No requiere" min="0" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Último Mant.</label>
                    <Input type="date" value={formData.last_maintenance_date} onChange={e => setFormData(p => ({ ...p, last_maintenance_date: e.target.value }))} className="h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Número de Serie / Etiqueta</label>
                  <div className="flex gap-2">
                    <Input value={formData.serial_number} onChange={e => setFormData(p => ({ ...p, serial_number: e.target.value }))} placeholder="SN-123456789" className="h-12 flex-1" />
                    <Button type="button" variant="outline" className="h-12 w-12 px-0 shrink-0" onClick={() => setIsScanning(true)}><ScanBarcode className="w-5 h-5 text-muted-foreground" /></Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Fotografía (opcional)</label>
                  {formData.photoBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border">
                      <img src={formData.photoBase64} alt="Evidencia" className="w-full h-40 object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={() => setFormData(p => ({ ...p, photoBase64: "" }))}><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-input rounded-xl bg-muted/30 p-5 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                      <Camera className="w-7 h-7 opacity-40" />
                      <p className="text-xs font-medium">Toca para capturar imagen</p>
                      <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageCapture} />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2 pb-1">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setDrawerOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (() => {
        const detail = buildDetail(detailItem)
        const meta   = conditionMeta(detailItem.condition)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDetailItem(null)} />
            <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl z-10 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="p-5 space-y-5">
                <div className="flex items-start gap-3">
                  {detailItem.photoBase64 ? (
                    <img src={detailItem.photoBase64} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg text-foreground leading-tight">{detailItem.description}</h3>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">Cant: {detailItem.quantity || 1}</span>
                      {detailItem.category && <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full">{detailItem.category}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0 -mt-1" onClick={() => setDetailItem(null)}><X className="w-5 h-5" /></Button>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Info className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">Total de unidades registradas</p>
                    <p className="text-4xl font-black text-primary">{detail.total}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2">Distribución por Salón</h4>
                  <div className="rounded-xl border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/60">
                          <th className="text-left px-3 py-2 font-bold text-muted-foreground">Salón</th>
                          <th className="text-left px-3 py-2 font-bold text-muted-foreground">Responsable</th>
                          <th className="text-right px-3 py-2 font-bold text-muted-foreground">Cant.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(detail.byLocation).map(([loc, { count, responsible }]) => (
                          <tr key={loc} className="border-t hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2 font-medium">{loc}</td>
                            <td className="px-3 py-2 text-muted-foreground">{responsible}</td>
                            <td className="px-3 py-2 text-right font-bold text-primary">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-2">Distribución por Estado</h4>
                  <div className="space-y-2">
                    {Object.entries(detail.byCondition).map(([cond, count]) => {
                      const cm  = conditionMeta(cond)
                      const pct = Math.round((count / detail.total) * 100)
                      return (
                        <div key={cond}>
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${cm.color}`}>{cm.label}</span>
                            <span className="text-muted-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {(() => {
                  const maint = getMaintenanceInfo(detailItem);
                  if (!maint) return null;
                  return (
                    <div className="p-4 rounded-xl space-y-2 mt-4 bg-muted/50 border">
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${maint.color} shadow-sm`} />
                        <h4 className="font-bold text-foreground">Estado de Mantenimiento</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">{maint.text}</p>
                      <Button variant="outline" size="sm" className="w-full mt-2 font-bold" onClick={async () => {
                        const today = new Date().toISOString().split('T')[0];
                        await db.items.update(detailItem.id, { last_maintenance_date: today, sync_status: 'pending_update' });
                        setDetailItem({ ...detailItem, last_maintenance_date: today });
                        if (navigator.onLine) syncItemsToSupabase();
                      }}>
                        Registrar Mantenimiento Hoy
                      </Button>
                    </div>
                  );
                })()}

                {detailItem.status === 'discarded' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl space-y-2 mt-4">
                    <h4 className="font-bold text-red-700 dark:text-red-400">Información de Baja</h4>
                    <p className="text-sm text-red-600 dark:text-red-300"><strong>Fecha:</strong> {new Date(detailItem.discard_date).toLocaleDateString()}</p>
                    <p className="text-sm text-red-600 dark:text-red-300"><strong>Motivo:</strong> {detailItem.discard_reason}</p>
                    {detailItem.discard_location && <p className="text-sm text-red-600 dark:text-red-300"><strong>Resguardo:</strong> {detailItem.discard_location}</p>}
                    {detailItem.discard_photoBase64 && (
                      <img src={detailItem.discard_photoBase64} alt="Evidencia" className="w-full h-32 object-cover rounded-lg mt-2" />
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setDetailItem(null)}>Cerrar</Button>
                  {role === 'director' && detailItem.status !== 'discarded' && (
                    <Button variant="destructive" className="flex-1 h-11 rounded-xl font-bold" onClick={() => { setItemToBaja(detailItem); setBajaModalOpen(true); setDetailItem(null); }}>
                      Dar de Baja
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      {/* Baja Modal */}
      {bajaModalOpen && itemToBaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setBajaModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl z-10 p-5">
            <h3 className="text-xl font-bold text-destructive mb-2">Dar de Baja</h3>
            <p className="text-sm text-muted-foreground mb-4">¿Por qué motivo das de baja el bien <strong>{itemToBaja.description}</strong>?</p>
            <form onSubmit={handleBajaSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Motivo (Desgaste, Robo, Daño, etc.) *</label>
                <Input value={bajaData.reason} onChange={e => setBajaData(p => ({ ...p, reason: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Lugar de Resguardo (Opcional)</label>
                <Input value={bajaData.location} onChange={e => setBajaData(p => ({ ...p, location: e.target.value }))} placeholder="Ej. Almacén 2" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Fotografía Evidencia (Opcional)</label>
                {bajaData.photoBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border">
                    <img src={bajaData.photoBase64} alt="Evidencia" className="w-full h-32 object-cover" />
                    <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={() => setBajaData(p => ({ ...p, photoBase64: "" }))}><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-input rounded-xl bg-muted/30 p-4 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Camera className="w-6 h-6 opacity-40" />
                    <p className="text-xs font-medium">Toca para capturar imagen</p>
                    <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleBajaImageCapture} />
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setBajaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" variant="destructive" className="flex-1 h-12 rounded-xl font-bold">Confirmar Baja</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

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
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "bueno", label: "Bueno", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "regular", label: "Regular", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "malo", label: "Malo", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
]
const CATEGORIES = ["Mobiliario", "Electrónico", "Didáctico", "Otro"]

const conditionMeta = (val) => CONDITIONS.find(c => c.value === val) || { label: val || "—", color: "bg-gray-100 text-gray-600" }

function generateAutoPrefix(name) {
  if (!name || !name.trim()) return "BN";
  const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, "");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 4).map(w => w[0]).join("").toUpperCase() || "BN";
  }
  return cleaned.substring(0, 3).toUpperCase() || "BN";
}

function CategoryAutocomplete({ value, onChange, categories }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return categories;
    return categories.filter(c => c.toLowerCase().includes(search.toLowerCase()));
  }, [categories, search]);

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Escribir o seleccionar categoría…"
        required
        className="h-11 w-full rounded-xl"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground rounded-xl border shadow-lg z-50 p-1 space-y-0.5 animate-in fade-in-50 duration-150">
          {filtered.map((cat) => (
            <div
              key={cat}
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch(cat);
                onChange(cat);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between ${value === cat ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted font-medium"
                }`}
            >
              <span>{cat}</span>
              {value === cat && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationAutocomplete({ locations, value, onChange }) {
  const [open, setOpen] = useState(false);
  const selectedLoc = useMemo(() => locations.find(l => l.id === value || l.name === value), [locations, value]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedLoc) {
      setSearch(selectedLoc.name);
    } else if (value && typeof value === "string") {
      setSearch(value);
    } else {
      setSearch("");
    }
  }, [value, selectedLoc]);

  const filtered = useMemo(() => {
    if (!search.trim()) return locations;
    return locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));
  }, [locations, search]);

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setOpen(true);
          const exact = locations.find(l => l.name.toLowerCase() === val.toLowerCase());
          onChange(exact ? exact.id : val);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Buscar nombre del salón o aula…"
        required
        className="h-11 w-full rounded-xl"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground rounded-xl border shadow-lg z-50 p-1 space-y-0.5 animate-in fade-in-50 duration-150">
          {filtered.map((loc) => (
            <div
              key={loc.id}
              onMouseDown={(e) => {
                e.preventDefault();
                setSearch(loc.name);
                onChange(loc.id);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between ${value === loc.id || value === loc.name ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted font-medium"
                }`}
            >
              <span className="truncate">{loc.name}</span>
              {(value === loc.id || value === loc.name) && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function emptyForm() {
  return {
    description: "",
    condition: "nuevo",
    location_id: "",
    category: "",
    serial_number: "",
    serial_prefix: "",
    prefix_edited: false,
    photoBase64: "",
    quantity: 1,
    maintenance_frequency_months: 0,
    last_maintenance_date: "",
    requires_maintenance: false,
    breakdown: [{ condition: "nuevo", quantity: 1 }]
  }
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
  const [search, setSearch] = useState("")
  const [filterLocation, setFilterLocation] = useState("")
  const [filterConditions, setFilterConditions] = useState([])
  const [filterCategory, setFilterCategory] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Tabs & Bajas
  const [activeTab, setActiveTab] = useState("active")
  const [bajaModalOpen, setBajaModalOpen] = useState(false)
  const [bajaData, setBajaData] = useState({ reason: '', location: '', photoBase64: '' })
  const [itemToBaja, setItemToBaja] = useState(null)

  // CRUD Drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(emptyForm())
  const [formError, setFormError] = useState("")
  const [isScanning, setIsScanning] = useState(false)

  // Detail modal
  const [detailItem, setDetailItem] = useState(null)

  const allItems = useLiveQuery(() => db.items.toArray(), []) || []
  const locations = useLiveQuery(() => db.locations.toArray(), []) || []
  const role = useStore((state) => state.role);

  const allCategories = useMemo(() => {
    return Array.from(new Set([...CATEGORIES, ...allItems.map(i => i.category).filter(Boolean)]));
  }, [allItems]);

  const sumBreakdown = useMemo(() => {
    return (formData.breakdown || []).reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  }, [formData.breakdown]);

  const editingItem = useStore(state => state.editingItem)
  const setEditingItem = useStore(state => state.setEditingItem)

  const uniqueDescriptions = useMemo(() => {
    return Array.from(new Set(allItems.map(i => i.description?.trim()).filter(Boolean))).sort();
  }, [allItems]);

  useEffect(() => {
    if (editingItem) {
      const prefix = editingItem.serial_number ? editingItem.serial_number.split('-')[0] : generateAutoPrefix(editingItem.description);
      const reqMaint = (editingItem.maintenance_frequency_months > 0 || !!editingItem.last_maintenance_date);
      setEditingId(editingItem.id)
      setFormData({
        description: editingItem.description || "",
        condition: editingItem.condition || "nuevo",
        location_id: editingItem.location_id || "",
        category: editingItem.category || "",
        serial_number: editingItem.serial_number || "",
        serial_prefix: prefix,
        prefix_edited: !!editingItem.serial_number,
        photoBase64: editingItem.photoBase64 || "",
        quantity: editingItem.quantity || 1,
        maintenance_frequency_months: editingItem.maintenance_frequency_months || 0,
        last_maintenance_date: editingItem.last_maintenance_date || "",
        requires_maintenance: reqMaint,
        breakdown: [{ condition: editingItem.condition || "nuevo", quantity: editingItem.quantity || 1 }]
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
    } catch (err) {
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
      if (item.sync_status === 'pending_delete') return false;
      const isDiscarded = item.status === 'discarded'
      if (activeTab === 'active' && isDiscarded) return false
      if (activeTab === 'discarded' && !isDiscarded) return false

      const matchSearch = !search || (item.description || '').toLowerCase().includes(search.toLowerCase()) || (item.serial_number || '').toLowerCase().includes(search.toLowerCase())

      // Permitir que si item.location_id es texto libre (importado de excel) empate con el nombre del salón del filtro
      const locFilterName = locationMap[filterLocation]?.name?.toLowerCase();
      const matchLocation = !filterLocation || item.location_id === filterLocation || (locFilterName && (item.location_id || '').toLowerCase() === locFilterName);

      const matchCondition = filterConditions.length === 0 || filterConditions.includes(item.condition)
      const matchCategory = !filterCategory || item.category === filterCategory || (!item.category && filterCategory === "Otro")
      return matchSearch && matchLocation && matchCondition && matchCategory
    })
  }, [allItems, search, filterLocation, filterConditions, filterCategory, activeTab])

  const buildDetail = (item) => {
    const sameDesc = allItems.filter(i => i.description?.toLowerCase() === item.description?.toLowerCase())
    const byLocation = {}
    const byCondition = {}
    sameDesc.forEach(i => {
      const q = i.quantity || 1
      const locName = locationMap[i.location_id]?.name || "Sin aula"
      const resp = locationMap[i.location_id]?.responsible_name || "—"
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
    const prefix = item.serial_number ? item.serial_number.split('-')[0] : generateAutoPrefix(item.description);
    const reqMaint = (item.maintenance_frequency_months > 0 || !!item.last_maintenance_date);
    setEditingId(item.id)
    setFormData({
      description: item.description || "",
      condition: item.condition || "nuevo",
      location_id: item.location_id || "",
      category: item.category || "",
      serial_number: item.serial_number || "",
      serial_prefix: prefix,
      prefix_edited: !!item.serial_number,
      photoBase64: item.photoBase64 || "",
      quantity: item.quantity || 1,
      maintenance_frequency_months: item.maintenance_frequency_months || 0,
      last_maintenance_date: item.last_maintenance_date || "",
      requires_maintenance: reqMaint,
      breakdown: [{ condition: item.condition || "nuevo", quantity: item.quantity || 1 }]
    })
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
        const firstRow = formData.breakdown[0] || { condition: "nuevo", quantity: totalQty };
        let currentSerial = formData.serial_number;
        if (!currentSerial || !currentSerial.startsWith(`${prefix}-`)) {
          currentSerial = await generateFolio(prefix, 0);
        }

        await db.items.update(editingId, {
          description: formData.description,
          condition: firstRow.condition,
          location_id: formData.location_id,
          category: formData.category,
          serial_number: currentSerial,
          photoBase64: formData.photoBase64 || null,
          quantity: Number(firstRow.quantity) || 1,
          maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
          last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null,
          sync_status: 'pending_update'
        });

        for (let i = 1; i < formData.breakdown.length; i++) {
          const row = formData.breakdown[i];
          const folio = await generateFolio(prefix, i);
          await db.items.add({
            id: crypto.randomUUID(),
            description: formData.description,
            condition: row.condition,
            location_id: formData.location_id,
            category: formData.category || null,
            serial_number: folio,
            photoBase64: formData.photoBase64 || null,
            sync_status: "pending_create",
            quantity: Number(row.quantity) || 1,
            maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
            last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null
          });
        }
      } else {
        for (let i = 0; i < formData.breakdown.length; i++) {
          const row = formData.breakdown[i];
          const folio = await generateFolio(prefix, i);
          await db.items.add({
            id: crypto.randomUUID(),
            description: formData.description,
            condition: row.condition,
            location_id: formData.location_id,
            category: formData.category || null,
            serial_number: folio,
            photoBase64: formData.photoBase64 || null,
            sync_status: "pending_create",
            quantity: Number(row.quantity) || 1,
            maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
            last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null
          });
        }
      }

      setDrawerOpen(false);
      if (navigator.onLine) syncItemsToSupabase();
    } catch (err) {
      console.error(err);
      setFormError("Error al guardar el bien o lote de bienes.");
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (window.confirm("¿Eliminar este bien del registro local y de la nube?")) {
      const item = await db.items.get(id);
      if (item && item.sync_status === 'pending_create') {
        await db.items.delete(id);
      } else {
        await db.items.update(id, { sync_status: 'pending_delete' });
      }
      if (navigator.onLine) syncItemsToSupabase();
    }
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
    const wb = XLSX.utils.book_new()
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
    const doc = new jsPDF({ orientation: "landscape" })
    const date = new Date().toLocaleDateString("es-MX")
    doc.setFontSize(16); doc.text("SIGRE — Inventario de Bienes", 14, 14)
    doc.setFontSize(9); doc.setTextColor(100); doc.text(`Generado: ${date}   Filtros: ${buildFilterLabel()}`, 14, 22)
    autoTable(doc, {
      startY: 28,
      head: [["Descripción", "Categoría", "Estado", "Salón", "Responsable", "No. Serie", "Cant."]],
      body: filteredItems.map(i => [i.description || "", i.category || "—", conditionMeta(i.condition).label, locationMap[i.location_id]?.name || "—", locationMap[i.location_id]?.responsible_name || "—", i.serial_number || "—", i.quantity || 1]),
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [59, 130, 246] }, alternateRowStyles: { fillColor: [245, 247, 250] }
    })
    doc.save(`SIGRE_Bienes_${date.replace(/\//g, "-")}.pdf`)
  }

  const activeFiltersCount = [!!search, !!filterLocation, filterConditions.length > 0, !!filterCategory].filter(Boolean).length
  const clearFilters = () => { setSearch(""); setFilterLocation(""); setFilterConditions([]); setFilterCategory("") }

  return (
    <div className="flex flex-col h-full pb-28 space-y-4">

      {isScanning && (
        <BarcodeScanner
          onScan={(data) => { setFormData(p => ({ ...p, serial_prefix: data.toUpperCase(), prefix_edited: true })); setIsScanning(false) }}
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

      {/* Resumen de Estados */}
      {activeTab === 'active' && (
        <div className="flex flex-wrap gap-2 py-1">
          {CONDITIONS.map(cond => {
            const count = allItems.filter(i => i.condition === cond.value && i.status !== 'discarded').reduce((acc, i) => acc + (i.quantity || 1), 0);
            if (count === 0) return null;
            return (
              <div key={cond.value} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-card shadow-sm text-xs font-bold animate-in fade-in">
                <span className={`w-2.5 h-2.5 rounded-full ${cond.color.split(' ')[0]}`} />
                <span className="text-foreground capitalize">{cond.label}:</span>
                <span className="text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </div>
      )}

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
            const loc = locationMap[item.location_id]
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
                <div className="flex items-center gap-1.5 shrink-0 transition-opacity">
                  {role !== 'profesor' && (
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={(e) => openEdit(item, e)} title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {role === 'director' && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(item.id, e)} title="Eliminar">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CRUD Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
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

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. NOMBRE (antes Descripción) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Descripción *</label>
                  <Input name="description" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Ej. Minisplit Mirage 2T…" required className="h-12" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 2. CATEGORÍA (Autocompletado Escribible) */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Categoría *</label>
                    <CategoryAutocomplete
                      value={formData.category}
                      onChange={val => setFormData(p => ({ ...p, category: val }))}
                      categories={allCategories}
                    />
                  </div>

                  {/* 3. SALÓN / UBICACIÓN (Minimalista, solo Nombre) */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Salón / Ubicación *</label>
                    <LocationAutocomplete
                      locations={locations}
                      value={formData.location_id}
                      onChange={idOrName => setFormData(p => ({ ...p, location_id: idOrName }))}
                    />
                  </div>
                </div>

                {/* 4. CANTIDAD Y ESTADO (Desglose Dinámico) */}
                <div className="space-y-2.5 pt-1 border-t">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Cantidad *</label>
                    <Input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={e => {
                        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setFormData(p => {
                          if (val === 1) {
                            return {
                              ...p,
                              quantity: 1,
                              breakdown: [{ condition: p.breakdown[0]?.condition || "nuevo", quantity: 1 }]
                            };
                          }
                          if (p.breakdown.length === 1) {
                            return {
                              ...p,
                              quantity: val,
                              breakdown: [{ condition: p.breakdown[0]?.condition || "nuevo", quantity: val }]
                            };
                          }
                          return { ...p, quantity: val };
                        });
                      }}
                      min="1"
                      required
                      className="h-11 font-bold text-base rounded-xl"
                    />
                  </div>

                  <div className="space-y-2 bg-muted/20 p-3 rounded-2xl border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wide">
                        <Layers className="w-3.5 h-3.5 text-primary" /> Desglose por Estado *
                      </label>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${sumBreakdown === Number(formData.quantity)
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}>
                        Suma: {sumBreakdown} de {formData.quantity || 0}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(formData.breakdown || []).map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded-xl border shadow-2xs">
                          <Select
                            value={row.condition}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData(p => ({
                                ...p,
                                breakdown: p.breakdown.map((r, i) => i === idx ? { ...r, condition: val } : r)
                              }));
                            }}
                            className="h-9 text-xs font-semibold flex-1 rounded-lg"
                            required
                          >
                            {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </Select>
                          <div className="w-24 flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-bold">Cant:</span>
                            <Input
                              type="number"
                              min="1"
                              max={formData.quantity}
                              value={row.quantity}
                              disabled={formData.quantity <= 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 0);
                                setFormData(p => ({
                                  ...p,
                                  breakdown: p.breakdown.map((r, i) => i === idx ? { ...r, quantity: val } : r)
                                }));
                              }}
                              className="h-9 text-xs font-bold px-2 text-center rounded-lg"
                              required
                            />
                          </div>
                          {Number(formData.quantity) > 1 && (formData.breakdown || []).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 rounded-lg"
                              onClick={() => {
                                setFormData(p => ({
                                  ...p,
                                  breakdown: p.breakdown.filter((_, i) => i !== idx)
                                }));
                              }}
                              title="Eliminar fila"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {Number(formData.quantity) > 1 && sumBreakdown < Number(formData.quantity) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-9 rounded-xl text-xs font-bold border-dashed border-primary/50 text-primary hover:bg-primary/5"
                        onClick={() => {
                          const remaining = Number(formData.quantity) - sumBreakdown;
                          setFormData(p => ({
                            ...p,
                            breakdown: [
                              ...(p.breakdown || []),
                              { condition: "bueno", quantity: Math.max(1, remaining) }
                            ]
                          }));
                        }}
                      >
                        + Agregar otro estado al lote ({Number(formData.quantity) - sumBreakdown} restantes)
                      </Button>
                    )}

                    {sumBreakdown !== Number(formData.quantity) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        La suma en el desglose ({sumBreakdown}) debe ser exactamente igual a la cantidad total ({formData.quantity || 0}).
                      </p>
                    )}
                  </div>
                </div>

                {/* 5. MANTENIMIENTO (Campos Opcionales con Checkbox) */}
                <div className="space-y-3 bg-muted/20 p-3.5 rounded-2xl border">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="requires_maint"
                      checked={formData.requires_maintenance}
                      onChange={e => {
                        const checked = e.target.checked;
                        setFormData(p => ({
                          ...p,
                          requires_maintenance: checked,
                          maintenance_frequency_months: checked ? (p.maintenance_frequency_months || 6) : 0,
                          last_maintenance_date: checked ? p.last_maintenance_date : ""
                        }));
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <label htmlFor="requires_maint" className="text-sm font-bold text-foreground cursor-pointer select-none">
                      Requiere mantenimiento
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${formData.requires_maintenance ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
                        Frec. Mant. (meses)
                      </label>
                      <Input
                        type="number"
                        value={formData.maintenance_frequency_months}
                        onChange={e => setFormData(p => ({ ...p, maintenance_frequency_months: e.target.value }))}
                        placeholder="Ej. 6"
                        min="1"
                        disabled={!formData.requires_maintenance}
                        required={formData.requires_maintenance}
                        className="h-10 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className={`text-xs font-bold ${formData.requires_maintenance ? "text-foreground" : "text-muted-foreground opacity-50"}`}>
                        Último Mant.
                      </label>
                      <Input
                        type="date"
                        value={formData.last_maintenance_date}
                        onChange={e => setFormData(p => ({ ...p, last_maintenance_date: e.target.value }))}
                        disabled={!formData.requires_maintenance}
                        className="h-10 text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. NÚMERO DE SERIE / ETIQUETA (Prefijo Editable) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Prefijo de Serie</label>
                  <div className="flex gap-2">
                    <Input value={formData.serial_number} onChange={e => setFormData(p => ({ ...p, serial_number: e.target.value }))} placeholder="SN-123456789" className="h-12 flex-1" />
                    <Button type="button" variant="outline" className="h-12 w-12 px-0 shrink-0" onClick={() => setIsScanning(true)}><ScanBarcode className="w-5 h-5 text-muted-foreground" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Los folios se generarán automáticamente al guardar (Ej. {formData.serial_prefix || "PRE"}-DDMMYY-001)
                  </p>
                </div>

                {/* 7. FOTOGRAFÍA (Referencia Única) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-foreground">Foto de Referencia (Única por lote)</label>
                    <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Opcional</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Se aplicará esta misma imagen de referencia a todas las unidades del lote.</p>
                  {formData.photoBase64 ? (
                    <div className="relative rounded-2xl overflow-hidden border bg-black/5">
                      <img src={formData.photoBase64} alt="Evidencia de referencia" className="w-full h-44 object-cover" />
                      <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" /> 1 foto para el lote ({formData.quantity || 1} {Number(formData.quantity) === 1 ? 'unidad' : 'unidades'})
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
                        onClick={() => setFormData(p => ({ ...p, photoBase64: "" }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-input rounded-2xl bg-muted/20 p-6 flex flex-col items-center gap-2 text-muted-foreground hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">Toca para capturar Foto de Referencia</p>
                      <p className="text-xs text-center opacity-70 max-w-xs">Puedes tomar una foto o seleccionar de la galería. Se asociará a todo el lote.</p>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={handleImageCapture}
                      />
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
        const meta = conditionMeta(detailItem.condition)
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
                      const cm = conditionMeta(cond)
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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

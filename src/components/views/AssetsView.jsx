import React, { useState, useMemo, useEffect } from "react"
import HelpTooltip from '@/components/ui/HelpTooltip'
import { db } from "@/lib/db"
import { syncItemsToSupabase } from "@/lib/sync"
import { useLiveQuery } from "dexie-react-hooks"
import { useStore } from "@/store/useStore"
import { compressImage } from '@/lib/imageUtils'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Skeleton } from "@/components/ui/skeleton"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import BarcodeScanner from "@/components/ui/BarcodeScanner"
import LabelGeneratorModal from "@/components/ui/LabelGeneratorModal"
import AssetGroupDetailModal from "@/components/views/AssetGroupDetailModal"
import {
  Package, PackagePlus, Search, Filter, X, Edit2, Trash2,
  Camera, ScanBarcode, AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  FileSpreadsheet, FileText, Info, Layers, HelpCircle, Printer
} from "lucide-react"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  getArticleCatalog,
  addArticleToCatalog,
  RESOURCE_TYPES,
  ORIGIN_PROVIDERS,
  DEFAULT_CATEGORIES
} from "@/lib/catalog"

// ─── Constants ────────────────────────────────────────────────
const CONDITIONS = [
  { value: "nuevo", label: "Nuevo", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "bueno", label: "Bueno", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  { value: "regular", label: "Regular", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  { value: "malo", label: "Malo", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
]
const CATEGORIES = DEFAULT_CATEGORIES

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

function ArticleAutocomplete({ value, onChange, onSelectArticle, catalog }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value || "");

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog.slice(0, 15);
    const query = search.toLowerCase();
    return catalog.filter(a => 
      a.name.toLowerCase().includes(query) || 
      (a.category && a.category.toLowerCase().includes(query))
    );
  }, [catalog, search]);

  const exactMatch = useMemo(() => {
    return catalog.some(a => a.name.toLowerCase() === search.trim().toLowerCase());
  }, [catalog, search]);

  const handleSelect = (art) => {
    setSearch(art.name);
    onChange(art.name);
    if (onSelectArticle) onSelectArticle(art);
    setOpen(false);
  };

  const handleAddNew = () => {
    const clean = search.trim();
    if (!clean) return;
    const newArt = addArticleToCatalog(clean);
    setSearch(clean);
    onChange(clean);
    if (onSelectArticle) onSelectArticle(newArt);
    setOpen(false);
  };

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
        placeholder="Buscar o escribir nombre del artículo (ej. Minisplit, Mesabanco)..."
        required
        className="h-12 w-full rounded-xl pr-9 font-medium"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none">
        <Package className="w-4 h-4" />
      </span>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-popover text-popover-foreground rounded-2xl border shadow-xl z-50 p-1.5 space-y-1 animate-in fade-in-50 duration-150">
          {filtered.map((art) => (
            <div
              key={art.name}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(art);
              }}
              className={`px-3 py-2 text-sm rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                value === art.name ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted font-medium"
              }`}
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{art.name}</span>
                <span className={`text-[10px] ${value === art.name ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  📁 {art.category} {art.resource_type === 'consumable' ? '• 🏷️ Consumible' : '• 🏢 Activo Fijo'}
                </span>
              </div>
              {value === art.name && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </div>
          ))}

          {search.trim() && !exactMatch && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                handleAddNew();
              }}
              className="px-3 py-2.5 text-xs font-bold rounded-xl cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-2 border border-primary/20 mt-1"
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span>+ Agregar "<strong>{search.trim()}</strong>" al Catálogo Maestro</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    return locations.filter(l => (l.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [locations, search]);

  return (
    <div className="relative">
      <Input
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setOpen(true);
          const exact = locations.find(l => (l.name || '').toLowerCase() === val.toLowerCase());
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
    article_name: "",
    description: "",
    condition: "nuevo",
    location_id: "",
    category: "",
    resource_type: "fixed",
    origin_provider: "",
    acquisition_date: new Date().toISOString().split('T')[0],
    serial_number: "",
    serial_prefix: "",
    prefix_edited: false,
    photoBase64: "",
    invoiceBase64: "",
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

  // Detail modal (group-level)
  const [detailGroupName, setDetailGroupName] = useState(null)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [labelModalFilterItems, setLabelModalFilterItems] = useState(null)

  const itemsQuery = useLiveQuery(() => db.items.toArray(), [])
  const isLoadingItems = itemsQuery === undefined
  const allItems = itemsQuery || []
  const locations = useLiveQuery(() => db.locations.toArray(), []) || []
  const allVales = useLiveQuery(() => db.vales.toArray(), []) || []
  const user = useStore((state) => state.user)
  const role = (useStore((state) => state.role) || '').toLowerCase()

  // Dynamic Master Article Catalog
  const articleCatalog = useMemo(() => getArticleCatalog(), [drawerOpen])

  // Map of item_id -> active vale for loan badge display
  const activeValeMap = useMemo(() => {
    const m = {}
    allVales.forEach(v => {
      if (v.vale_status === 'active' && v.item_id) {
        m[v.item_id] = v
      }
    })
    return m
  }, [allVales])

  const allCategories = useMemo(() => {
    return Array.from(new Set([...CATEGORIES, ...allItems.map(i => i.category).filter(Boolean)]));
  }, [allItems]);

  const sumBreakdown = useMemo(() => {
    return (formData.breakdown || []).reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  }, [formData.breakdown]);

  const editingItem = useStore(state => state.editingItem)
  const setEditingItem = useStore(state => state.setEditingItem)

  const uniqueDescriptions = useMemo(() => {
    return Array.from(new Set(allItems.map(i => (i.name || i.description)?.trim()).filter(Boolean))).sort();
  }, [allItems]);

  useEffect(() => {
    if (editingItem) {
      const artName = editingItem.name || editingItem.description || "";
      const prefix = editingItem.serial_number ? editingItem.serial_number.split('-')[0] : generateAutoPrefix(artName);
      const reqMaint = (editingItem.maintenance_frequency_months > 0 || !!editingItem.last_maintenance_date);
      setEditingId(editingItem.id)
      setFormData({
        article_name: artName,
        description: editingItem.description || "",
        condition: editingItem.condition || "nuevo",
        location_id: editingItem.location_id || "",
        category: editingItem.category || "",
        resource_type: editingItem.resource_type || "fixed",
        origin_provider: editingItem.origin_provider || "",
        acquisition_date: editingItem.acquisition_date || "",
        serial_number: editingItem.serial_number || "",
        serial_prefix: prefix,
        prefix_edited: !!editingItem.serial_number,
        photoBase64: editingItem.photoBase64 || "",
        invoiceBase64: editingItem.invoiceBase64 || "",
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

  const teacherName = (user?.user_metadata?.name || '').toLowerCase()
  const teacherEmail = (user?.email || '').toLowerCase()
  const teacherUsername = (user?.email ? user.email.split('@')[0] : '').toLowerCase()

  // Locations assigned to this teacher
  const teacherLocations = useMemo(() => {
    if (role !== 'profesor') return locations;
    return locations.filter(l => {
      const resp = (l.responsible_name || '').toLowerCase()
      if (!resp) return false;
      return (
        (teacherName && (resp.includes(teacherName) || teacherName.includes(resp))) ||
        (teacherEmail && (resp.includes(teacherEmail) || teacherEmail.includes(resp))) ||
        (teacherUsername && (resp.includes(teacherUsername) || teacherUsername.includes(resp)))
      )
    })
  }, [locations, role, teacherName, teacherEmail, teacherUsername])

  const teacherLocationIds = useMemo(() => {
    const ids = new Set()
    teacherLocations.forEach(l => {
      if (l.id) ids.add(l.id)
      if (l.name) ids.add(l.name.toLowerCase())
    })
    return ids
  }, [teacherLocations])

  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (item.sync_status === 'pending_delete') return false;
      const isDiscarded = item.status === 'discarded'
      if (activeTab === 'active' && isDiscarded) return false
      if (activeTab === 'discarded' && !isDiscarded) return false

      // If professor, strictly restrict to items in their assigned classroom(s)
      if (role === 'profesor') {
        if (teacherLocationIds.size === 0) return false;
        const itemLoc = (item.location_id || '').toLowerCase()
        const locName = locationMap[item.location_id]?.name?.toLowerCase()
        const isAssigned = teacherLocationIds.has(item.location_id) || teacherLocationIds.has(itemLoc) || (locName && teacherLocationIds.has(locName))
        if (!isAssigned) return false;
      }

      const matchSearch = !search || 
        (item.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (item.description || '').toLowerCase().includes(search.toLowerCase()) || 
        (item.serial_number || '').toLowerCase().includes(search.toLowerCase())

      // Permitir que si item.location_id es texto libre (importado de excel) empate con el nombre del salón del filtro
      const locFilterName = locationMap[filterLocation]?.name?.toLowerCase();
      const matchLocation = !filterLocation || item.location_id === filterLocation || (locFilterName && (item.location_id || '').toLowerCase() === locFilterName);

      const matchCondition = filterConditions.length === 0 || filterConditions.includes(item.condition)
      const matchCategory = !filterCategory || item.category === filterCategory || (!item.category && filterCategory === "Otro")
      return matchSearch && matchLocation && matchCondition && matchCategory
    })
  }, [allItems, search, filterLocation, filterConditions, filterCategory, activeTab, role, teacherLocationIds, locationMap])

  // Group filtered items by article name for the list view
  const groupedItems = useMemo(() => {
    const groups = {}
    filteredItems.forEach(item => {
      const key = (item.name || item.description || 'Sin nombre').trim().toLowerCase()
      if (!groups[key]) {
        groups[key] = {
          name: item.name || item.description || 'Sin nombre',
          description: item.description,
          category: item.category,
          resource_type: item.resource_type,
          photoBase64: null,
          items: [],
          conditions: {},
          locationIds: new Set()
        }
      }
      const g = groups[key]
      g.items.push(item)
      g.conditions[item.condition] = (g.conditions[item.condition] || 0) + 1
      if (item.location_id) g.locationIds.add(item.location_id)
      if (!g.photoBase64 && item.photoBase64) g.photoBase64 = item.photoBase64
      if (!g.category && item.category) g.category = item.category
    })
    return Object.values(groups).sort((a, b) => b.items.length - a.items.length)
  }, [filteredItems])

  // All items for the selected group, respecting current active filters (except text search)
  const detailGroupItems = useMemo(() => {
    if (!detailGroupName) return []
    const key = detailGroupName.trim().toLowerCase()
    
    return allItems.filter(item => {
      if ((item.name || item.description || '').trim().toLowerCase() !== key) return false
      
      const isDiscarded = item.status === 'discarded'
      if (activeTab === 'active' && isDiscarded) return false
      if (activeTab === 'discarded' && !isDiscarded) return false
      if (item.sync_status === 'pending_delete') return false

      if (role === 'profesor') {
        if (teacherLocationIds.size === 0) return false;
        const itemLoc = (item.location_id || '').toLowerCase()
        const locName = locationMap[item.location_id]?.name?.toLowerCase()
        const isAssigned = teacherLocationIds.has(item.location_id) || teacherLocationIds.has(itemLoc) || (locName && teacherLocationIds.has(locName))
        if (!isAssigned) return false;
      }

      const locFilterName = locationMap[filterLocation]?.name?.toLowerCase();
      const matchLocation = !filterLocation || item.location_id === filterLocation || (locFilterName && (item.location_id || '').toLowerCase() === locFilterName);

      const matchCondition = filterConditions.length === 0 || filterConditions.includes(item.condition)
      const matchCategory = !filterCategory || item.category === filterCategory || (!item.category && filterCategory === "Otro")

      return matchLocation && matchCondition && matchCategory
    })
  }, [detailGroupName, allItems, activeTab, role, teacherLocationIds, locationMap, filterLocation, filterConditions, filterCategory])

  const toggleCondition = (val) =>
    setFilterConditions(prev => prev.includes(val) ? prev.filter(c => c !== val) : [...prev, val])

  const handleMassBaja = async (itemIds) => {
    try {
      const now = new Date().toISOString()
      await Promise.all(itemIds.map(id => db.items.update(id, { 
        status: 'discarded', 
        discarded_at: now, 
        sync_status: 'pending_update' 
      })))
      if (navigator.onLine) syncItemsToSupabase()
    } catch (err) {
      console.error("Error en baja masiva:", err)
    }
  }

  const handleRestoreItem = async (itemId) => {
    try {
      await db.items.update(itemId, { 
        status: 'active', 
        sync_status: 'pending_update' 
      })
      if (navigator.onLine) syncItemsToSupabase()
    } catch (err) {
      console.error("Error al restaurar bien:", err)
    }
  }

  const openCreate = () => { setEditingId(null); setFormData(emptyForm()); setFormError(""); setDrawerOpen(true) }

  const openEdit = (item, e) => {
    e.stopPropagation()
    const artName = item.name || item.description || "";
    const prefix = item.serial_number ? item.serial_number.split('-')[0] : generateAutoPrefix(artName);
    const reqMaint = (item.maintenance_frequency_months > 0 || !!item.last_maintenance_date);
    setEditingId(item.id)
    setFormData({
      article_name: artName,
      description: item.description || "",
      condition: item.condition || "nuevo",
      location_id: item.location_id || "",
      category: item.category || "",
      resource_type: item.resource_type || "fixed",
      origin_provider: item.origin_provider || "",
      acquisition_date: item.acquisition_date || "",
      serial_number: item.serial_number || "",
      serial_prefix: prefix,
      prefix_edited: !!item.serial_number,
      photoBase64: item.photoBase64 || "",
      invoiceBase64: item.invoiceBase64 || "",
      quantity: item.quantity || 1,
      maintenance_frequency_months: item.maintenance_frequency_months || 0,
      last_maintenance_date: item.last_maintenance_date || "",
      requires_maintenance: reqMaint,
      breakdown: [{ condition: item.condition || "nuevo", quantity: item.quantity || 1 }]
    })
    setFormError("")
    setDrawerOpen(true)
  }

  const handleImageCapture = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(p => ({ ...p, photoBase64: compressedBase64 }))
      } catch (err) {
        console.error("Error comprimiendo imagen", err);
      }
    }
  }

  const handleInvoiceCapture = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(p => ({ ...p, invoiceBase64: compressedBase64 }))
      } catch (err) {
        console.error("Error comprimiendo factura", err);
      }
    }
  }

  const generateFolio = (prefixStr, indexOffset = 0) => {
    const existingFolios = allItems.map(i => i.serial_number).filter(s => s && s.startsWith(prefixStr));
    let maxNum = 0;
    existingFolios.forEach(s => {
      const n = parseInt(s.replace(prefixStr, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    return `${prefixStr}${(maxNum + 1 + indexOffset).toString().padStart(4, '0')}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError("")
    
    const artName = formData.article_name?.trim() || formData.description?.trim();
    if (!artName) {
      setFormError("El nombre o tipo de artículo es obligatorio.");
      return;
    }

    // Auto add to catalog if not already there
    addArticleToCatalog(artName, formData.category, formData.resource_type);

    const year = new Date().getFullYear();
    const autoPrefix = generateAutoPrefix(artName);
    const prefix = `SIGRE-${year}-${autoPrefix}-`;
    const userEnteredSerial = formData.serial_number?.trim();
    let serial = userEnteredSerial;
    
    if (!serial) {
      serial = generateFolio(prefix, 0);
    }

    if (serial) {
      const existing = await db.items.filter(i => i.serial_number === serial).first()
      if (existing && existing.id !== editingId) { setFormError("Ya existe un bien con este número de serie o folio."); return }
    }
    try {
      if (editingId) {
        const firstRow = formData.breakdown[0] || { condition: "nuevo", quantity: formData.quantity };
        let currentSerial = userEnteredSerial;
        if (!currentSerial) {
          currentSerial = generateFolio(prefix, 0);
        }

        await db.items.update(editingId, {
          name: artName,
          description: formData.description || artName,
          condition: firstRow.condition,
          location_id: formData.location_id,
          category: formData.category,
          resource_type: formData.resource_type || "fixed",
          origin_provider: formData.origin_provider || null,
          acquisition_date: formData.acquisition_date || null,
          serial_number: currentSerial,
          photoBase64: formData.photoBase64 || null,
          invoiceBase64: formData.invoiceBase64 || null,
          quantity: 1,
          maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
          last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null,
          sync_status: 'pending_update'
        });

        // In individual-item model, editing only updates the single item above
      } else {
        const firstRow = formData.breakdown[0] || { condition: "nuevo", quantity: formData.quantity };
        const isSingleItem = formData.breakdown.length === 1 && (Number(firstRow.quantity) || 1) === 1;

        if (isSingleItem && userEnteredSerial) {
          await db.items.add({
            id: crypto.randomUUID(),
            name: artName,
            description: formData.description || artName,
            condition: firstRow.condition,
            location_id: formData.location_id,
            category: formData.category || null,
            resource_type: formData.resource_type || "fixed",
            origin_provider: formData.origin_provider || null,
            acquisition_date: formData.acquisition_date || null,
            serial_number: userEnteredSerial,
            photoBase64: formData.photoBase64 || null,
            invoiceBase64: formData.invoiceBase64 || null,
            sync_status: "pending_create",
            quantity: 1,
            maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
            last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null
          });
        } else {
          const basePrefix = userEnteredSerial || prefix;
          let globalOffset = 0;
          for (let i = 0; i < formData.breakdown.length; i++) {
            const row = formData.breakdown[i];
            const rowQty = Number(row.quantity) || 1;
            for (let j = 0; j < rowQty; j++) {
              const folio = generateFolio(basePrefix, globalOffset);
              globalOffset++;
              await db.items.add({
                id: crypto.randomUUID(),
                name: artName,
                description: formData.description || artName,
                condition: row.condition,
                location_id: formData.location_id,
                category: formData.category || null,
                resource_type: formData.resource_type || "fixed",
                origin_provider: formData.origin_provider || null,
                acquisition_date: formData.acquisition_date || null,
                serial_number: folio,
                photoBase64: formData.photoBase64 || null,
                invoiceBase64: formData.invoiceBase64 || null,
                sync_status: "pending_create",
                quantity: 1,
                maintenance_frequency_months: formData.requires_maintenance ? (Number(formData.maintenance_frequency_months) || 0) : 0,
                last_maintenance_date: formData.requires_maintenance ? (formData.last_maintenance_date || null) : null
              });
            }
          }
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

  const [scrollEl, setScrollEl] = useState(null)
  useEffect(() => {
    setScrollEl(document.getElementById("scroll-container"))
  }, [])

  const virtualizer = useVirtualizer({
    count: isLoadingItems ? 8 : groupedItems.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => 100,
    overscan: 5,
  })

  return (
    <div className="flex flex-col h-full pb-28 space-y-4">

      {isScanning && (
        <BarcodeScanner
          onScan={(data) => { setFormData(p => ({ ...p, serial_number: data.toUpperCase(), serial_prefix: data.toUpperCase(), prefix_edited: true })); setIsScanning(false) }}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Bienes
            <HelpTooltip 
              title="Inventario de Bienes" 
              text="Inventario completo de bienes muebles del plantel. Puedes registrar, editar, filtrar por estado/ubicación y exportar reportes en Excel o PDF." 
            />
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">{groupedItems.length} tipos • {filteredItems.length} unidades</p>
        </div>
        <div className="flex items-center gap-2">
          {role !== 'profesor' && (
            <Button variant="outline" size="sm" onClick={() => setShowLabelModal(true)} className="h-10 rounded-xl font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10" title="Imprimir Planilla de Etiquetas con Códigos QR">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Etiquetas QR</span>
            </Button>
          )}
          {role === 'director' && (
            <>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={exportExcel} title="Exportar Excel">
                <FileSpreadsheet className="w-4 h-4 text-green-600" />
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={exportPDF} title="Exportar PDF">
                <FileText className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
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
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, descripción o No. de serie..." className="pl-9 h-11 rounded-xl" />
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
                <option value="">{role === 'profesor' ? 'Tus salones asignados' : 'Todos los salones'}</option>
                {(role === 'profesor' ? teacherLocations : locations).map(loc => <option key={loc.id} value={loc.id}>{loc.name} — {loc.responsible_name}</option>)}
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
      {!isLoadingItems && filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/20 border border-dashed rounded-3xl text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <Layers className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="font-bold text-lg text-foreground mb-1">
            {role === 'profesor' && teacherLocations.length === 0 ? "Sin salón asignado" : "No se encontraron bienes"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs mb-5 font-medium">
            {role === 'profesor' && teacherLocations.length === 0
              ? "No tienes un salón vinculado a tu usuario aún. Solicita al Director que asigne tu nombre en la sección de Aulas."
              : "Ajusta los filtros de búsqueda o registra un nuevo bien mueble en el inventario."}
          </p>
          {role !== 'profesor' && (
            <Button onClick={openCreate} size="sm" className="rounded-xl font-bold bg-primary hover:bg-primary/90">
              <PackagePlus className="w-4 h-4 mr-2" />
              Registrar Primer Bien
            </Button>
          )}
        </div>
      ) : (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualItem => {
            if (isLoadingItems) {
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-2"
                >
                  <Skeleton className="w-full h-full rounded-2xl" />
                </div>
              )
            }

            const group = groupedItems[virtualItem.index]
            if (!group) return null

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="pb-2"
              >
                <div onClick={() => setDetailGroupName(group.name)}
                  className="h-full bg-card border rounded-2xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer active:scale-[0.99]">
                  {group.photoBase64 ? (
                    <img src={group.photoBase64} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground opacity-50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{group.name}</p>
                    {group.description && group.description !== group.name && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">{group.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {group.items.length} {group.items.length === 1 ? 'unidad' : 'unidades'}
                      </span>
                      {group.category && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{group.category}</span>}
                      <span className="text-[10px] text-muted-foreground">📍 {group.locationIds.size} {group.locationIds.size === 1 ? 'ubicación' : 'ubicaciones'}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {CONDITIONS.map(c => {
                        const count = group.conditions[c.value] || 0
                        if (count === 0) return null
                        return (
                          <span key={c.value} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${c.color}`}>
                            {c.label}: {count}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
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
                {/* 1. ARTÍCULO / NOMBRE (Catálogo Maestro) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-primary" /> Nombre / Tipo de Artículo *
                    </label>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-bold">
                      Catálogo Normalizado
                    </span>
                  </div>
                  <ArticleAutocomplete
                    value={formData.article_name}
                    catalog={articleCatalog}
                    onChange={val => {
                      setFormData(p => ({
                        ...p,
                        article_name: val,
                        description: p.description || val
                      }))
                    }}
                    onSelectArticle={art => {
                      setFormData(p => ({
                        ...p,
                        article_name: art.name,
                        category: art.category || p.category,
                        resource_type: art.resource_type || p.resource_type || 'fixed',
                        description: p.description && p.description !== p.article_name ? p.description : ''
                      }))
                    }}
                  />
                </div>

                {/* 2. CATEGORÍA Y TIPO DE RECURSO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Categoría *</label>
                    <CategoryAutocomplete
                      value={formData.category}
                      onChange={val => setFormData(p => ({ ...p, category: val }))}
                      categories={allCategories}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Tipo de Recurso *</label>
                    <Select
                      value={formData.resource_type}
                      onChange={e => setFormData(p => ({ ...p, resource_type: e.target.value }))}
                      className="h-11 font-medium text-xs rounded-xl"
                    >
                      {RESOURCE_TYPES.map(rt => (
                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* 3. DESCRIPCIÓN Y DETALLES FÍSICOS (Abierto) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">
                      Detalle Físico / Especificaciones
                    </label>
                    <span className="text-[10px] text-muted-foreground">Color, medidas, modelo, etc.</span>
                  </div>
                  <Input
                    name="description"
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Ej. Madera color miel, patas tubulares con tapón de hule..."
                    className="h-11 text-sm"
                  />
                </div>

                {/* 4. ORIGEN / PROVEEDOR Y FECHA DE ADQUISICIÓN */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Origen / Proveedor</label>
                    <Select
                      value={formData.origin_provider}
                      onChange={e => setFormData(p => ({ ...p, origin_provider: e.target.value }))}
                      className="h-11 font-medium text-xs rounded-xl"
                    >
                      <option value="">— Seleccionar origen —</option>
                      {ORIGIN_PROVIDERS.map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground uppercase tracking-wide">Fecha de Adquisición</label>
                    <Input
                      type="date"
                      value={formData.acquisition_date}
                      onChange={e => setFormData(p => ({ ...p, acquisition_date: e.target.value }))}
                      className="h-11 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* 5. SALÓN / UBICACIÓN (Minimalista, solo Nombre) */}
                <div className="space-y-1.5 pt-1 border-t">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wide">Salón / Ubicación Asignada *</label>
                  <LocationAutocomplete
                    locations={locations}
                    value={formData.location_id}
                    onChange={idOrName => setFormData(p => ({ ...p, location_id: idOrName }))}
                  />
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
                    <Input value={formData.serial_number} onChange={e => setFormData(p => ({ ...p, serial_number: e.target.value }))} placeholder="Automático si se deja en blanco" className="h-12 flex-1" />
                    <Button type="button" variant="outline" className="h-12 w-12 px-0 shrink-0" onClick={() => setIsScanning(true)}><ScanBarcode className="w-5 h-5 text-muted-foreground" /></Button>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Los folios se generarán automáticamente al guardar (Ej. {formData.serial_number || `SIGRE-${new Date().getFullYear()}-`}0001)
                  </p>
                </div>

                {/* 7. FOTOGRAFÍA (Referencia Única) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-foreground">Foto de Referencia</label>
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Opcional</span>
                    </div>
                    {formData.photoBase64 ? (
                      <div className="relative rounded-2xl overflow-hidden border bg-black/5">
                        <img src={formData.photoBase64} alt="Evidencia de referencia" className="w-full h-32 object-cover" />
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
                      <div className="relative border-2 border-dashed border-input rounded-2xl bg-muted/20 p-4 flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer">
                        <Camera className="w-6 h-6 opacity-50" />
                        <p className="text-xs font-bold text-center">Toca para Foto</p>
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

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-foreground">Factura o Ticket</label>
                      <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Opcional</span>
                    </div>
                    {formData.invoiceBase64 ? (
                      <div className="relative rounded-2xl overflow-hidden border bg-black/5">
                        <img src={formData.invoiceBase64} alt="Factura de compra" className="w-full h-32 object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
                          onClick={() => setFormData(p => ({ ...p, invoiceBase64: "" }))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-input rounded-2xl bg-muted/20 p-4 flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground hover:bg-muted/40 transition-all cursor-pointer">
                        <FileText className="w-6 h-6 opacity-50" />
                        <p className="text-xs font-bold text-center">Subir Factura</p>
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={handleInvoiceCapture}
                        />
                      </div>
                    )}
                  </div>
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

      {/* Group Detail Modal */}
      {detailGroupName && detailGroupItems.length > 0 && (
        <AssetGroupDetailModal
          groupName={detailGroupName}
          groupItems={detailGroupItems}
          locations={locations}
          locationMap={locationMap}
          role={role}
          searchTerm={search}
          user={user}
          activeTab={activeTab}
          filterLocation={filterLocation}
          filterConditions={filterConditions}
          onClose={() => setDetailGroupName(null)}
          onEditItem={(item) => {
            setDetailGroupName(null)
            const artName = item.name || item.description || ""
            const reqMaint = (item.maintenance_frequency_months > 0 || !!item.last_maintenance_date)
            setEditingId(item.id)
            setFormData({
              article_name: artName,
              description: item.description || "",
              condition: item.condition || "nuevo",
              location_id: item.location_id || "",
              category: item.category || "",
              resource_type: item.resource_type || "fixed",
              origin_provider: item.origin_provider || "",
              acquisition_date: item.acquisition_date || "",
              serial_number: item.serial_number || "",
              serial_prefix: item.serial_number || "",
              prefix_edited: !!item.serial_number,
              photoBase64: item.photoBase64 || "",
              invoiceBase64: item.invoiceBase64 || "",
              quantity: 1,
              maintenance_frequency_months: item.maintenance_frequency_months || 0,
              last_maintenance_date: item.last_maintenance_date || "",
              requires_maintenance: reqMaint,
              breakdown: [{ condition: item.condition || "nuevo", quantity: 1 }]
            })
            setFormError("")
            setDrawerOpen(true)
          }}
          onBajaItem={(item) => {
            setDetailGroupName(null)
            setItemToBaja(item)
            setBajaModalOpen(true)
          }}
          onGenerateQR={(items) => {
            setLabelModalFilterItems(items)
            setShowLabelModal(true)
          }}
          onMassBaja={handleMassBaja}
          onRestoreItem={handleRestoreItem}
        />
      )}
      {/* Baja Modal */}

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

      {/* Label Generator Modal */}
      {showLabelModal && (
        <LabelGeneratorModal
          items={labelModalFilterItems || allItems}
          locations={locations}
          onClose={() => { setShowLabelModal(false); setLabelModalFilterItems(null); }}
        />
      )}
    </div>
  )
}

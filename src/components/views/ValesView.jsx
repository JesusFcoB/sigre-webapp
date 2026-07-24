import React, { useState, useMemo } from 'react'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FileSignature, Plus, X, FileText, CheckCircle2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { syncValesToSupabase } from '@/lib/sync'

export default function ValesView() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formData, setFormData] = useState({
    person_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    item_id: ''
  })
  
  const vales = useLiveQuery(() => db.vales.toArray()) || []
  const items = useLiveQuery(() => db.items.where('status').notEqual('discarded').toArray()) || []
  const locationMap = useLiveQuery(async () => {
    const locs = await db.locations.toArray()
    const map = {}
    locs.forEach(l => map[l.id] = l)
    return map
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await db.vales.add({
        ...formData,
        sync_status: 'pending_create'
      })
      setDrawerOpen(false)
      setFormData({ person_name: '', start_date: new Date().toISOString().split('T')[0], end_date: '', item_id: '' })
      if (navigator.onLine) syncValesToSupabase()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este vale?")) {
      await db.vales.delete(id)
    }
  }

  const exportVale = (vale) => {
    const item = items.find(i => i.id === vale.item_id)
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
    doc.line(40, finalY + 40, 170, finalY + 40)
    doc.text("Firma de Conformidad", 105, finalY + 50, { align: "center" })
    doc.text(vale.person_name, 105, finalY + 60, { align: "center" })
    
    doc.save(`Vale_${vale.person_name.replace(/\s/g, '_')}_${vale.id.slice(0, 5)}.pdf`)
  }

  return (
    <div className="flex flex-col h-full pb-28 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 pb-2 border-b">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-primary" /> Vales de Resguardo
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Control de préstamos de bienes</p>
        </div>
        <Button onClick={() => setDrawerOpen(true)} className="h-10 rounded-xl font-bold gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nuevo Vale</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        {vales.map(vale => {
          const item = items.find(i => i.id === vale.item_id)
          return (
            <div key={vale.id} className="bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm relative group">
              <div>
                <h3 className="font-bold text-lg text-foreground">{vale.person_name}</h3>
                <p className="text-sm text-muted-foreground">Vigencia: {vale.start_date} al {vale.end_date || 'Sin límite'}</p>
              </div>
              <div className="bg-muted p-3 rounded-xl flex items-start gap-3 border">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{item?.description || 'Artículo no encontrado'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Serie: {item?.serial_number || 'N/A'}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1 h-10 rounded-xl text-primary font-bold border-primary/20 hover:bg-primary/10" onClick={() => exportVale(vale)}>
                  <FileText className="w-4 h-4 mr-2" /> PDF Vale
                </Button>
                <Button variant="ghost" className="h-10 w-10 p-0 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => handleDelete(vale.id)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Generar Vale</h3>
                <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}><X className="w-5 h-5" /></Button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Responsable / Maestro *</label>
                  <Input value={formData.person_name} onChange={e => setFormData(p => ({ ...p, person_name: e.target.value }))} placeholder="Ej. Juan Pérez" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Bien Asignado *</label>
                  <Select value={formData.item_id} onChange={e => setFormData(p => ({ ...p, item_id: e.target.value }))} required>
                    <option value="" disabled>Seleccione un bien...</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.description} {item.serial_number ? `(${item.serial_number})` : ''}</option>
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
    </div>
  )
}

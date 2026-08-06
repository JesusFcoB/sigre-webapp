import React, { useState, useMemo } from 'react'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useStore } from '@/store/useStore'
import { syncTicketsToSupabase } from '@/lib/sync'
import { compressImage } from '@/lib/imageUtils'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Camera, Save, X, Info, AlertCircle, Edit2, Trash2, CheckCircle2, ShieldAlert, FileText, PlusCircle, LayoutList, HelpCircle } from "lucide-react"

export default function ReportView() {
  const [activeTab, setActiveTab] = useState('pending');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    photoBase64: '',
    location_id: '',
    specific_location: ''
  })
  
  const [errorMsg, setErrorMsg] = useState('')
  const editingTicket = useStore((state) => state.editingTicket)
  const setEditingTicket = useStore((state) => state.setEditingTicket)
  const role = useStore((state) => state.role)

  const tickets = useLiveQuery(() => db.tickets.toArray()) || []
  const locations = useLiveQuery(() => db.locations.toArray()) || []
  
  const locationMap = useMemo(() => {
    const m = {}
    locations.forEach(l => { m[l.id] = l })
    return m
  }, [locations])

  // Split tickets by status (default is pending if not set)
  const pendingTickets = tickets.filter(t => t.status !== 'solved' && t.sync_status !== 'pending_delete')
  const solvedTickets = tickets.filter(t => t.status === 'solved' && t.sync_status !== 'pending_delete')

  // Set form data if editing
  React.useEffect(() => {
    if (editingTicket) {
      setFormData({
        issue_type: editingTicket.issue_type || '',
        description: editingTicket.description || '',
        photoBase64: editingTicket.photoBase64 || '',
        location_id: editingTicket.location_id || '',
        specific_location: editingTicket.specific_location || ''
      })
      setDrawerOpen(true);
    }
  }, [editingTicket])

  const handleImageCapture = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormData(prev => ({ ...prev, photoBase64: compressedBase64 }));
      } catch (err) {
        console.error("Error comprimiendo imagen", err);
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      if (editingTicket) {
        await db.tickets.update(editingTicket.id, {
          ...formData,
          sync_status: editingTicket.sync_status === 'synced' ? 'pending_update' : editingTicket.sync_status
        })
        setEditingTicket(null)
      } else {
        await db.tickets.add({
          ...formData,
          reported_at: new Date().toISOString(),
          status: 'pending',
          sync_status: 'pending_create'
        })
      }
      
      setFormData({ issue_type: '', description: '', photoBase64: '', location_id: '', specific_location: '' })
      setDrawerOpen(false)
      
      if (navigator.onLine) {
        syncTicketsToSupabase()
      }
    } catch (err) {
      console.error(err)
      setErrorMsg("Ocurrió un error al guardar el reporte localmente.")
    }
  }

  const cancelEdit = () => {
    setEditingTicket(null)
    setFormData({ issue_type: '', description: '', photoBase64: '', location_id: '', specific_location: '' })
    setDrawerOpen(false)
    setErrorMsg('')
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este reporte?")) {
      const record = await db.tickets.get(id);
      if (record && (record.sync_status === 'pending_create' || record.sync_status === 'pending')) {
        await db.tickets.delete(id);
      } else {
        await db.tickets.update(id, { sync_status: 'pending_delete' });
      }
      if (navigator.onLine) syncTicketsToSupabase();
    }
  }

  const handleMarkSolved = async (id) => {
    if (window.confirm("¿Marcar este reporte como solucionado?")) {
      const record = await db.tickets.get(id);
      await db.tickets.update(id, {
        status: 'solved',
        solved_at: new Date().toISOString(),
        sync_status: record.sync_status === 'synced' ? 'pending_update' : record.sync_status
      });
      if (navigator.onLine) syncTicketsToSupabase();
    }
  }

  return (
    <div className="flex flex-col h-full pb-24 gap-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold flex items-center gap-3 text-foreground tracking-tight">
          <ShieldAlert className="w-8 h-8 text-primary" />
          Reportes de Falla
          <span className="relative group/tip">
            <HelpCircle className="w-5 h-5 text-muted-foreground/50 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-foreground text-background text-[11px] leading-relaxed rounded-xl shadow-lg opacity-0 group-hover/tip:opacity-100 pointer-events-none transition-opacity z-50">
              Registra incidencias de infraestructura escolar (fallas eléctricas, plomería, mobiliario dañado, etc.) con evidencia fotográfica para dar seguimiento a su resolución.
            </span>
          </span>
        </h2>
        <p className="text-muted-foreground font-medium">Gestiona incidencias e infraestructura.</p>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div className="flex bg-muted p-1 rounded-xl w-full max-w-sm">
          <button 
            className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'pending' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('pending')}
          >
            Pendientes
          </button>
          <button 
            className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'solved' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('solved')}
          >
            Solucionados
          </button>
        </div>
        
        <Button onClick={() => setDrawerOpen(true)} className="h-10 rounded-xl whitespace-nowrap">
          <PlusCircle className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Reporte</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {activeTab === 'pending' && (
          <div className="flex flex-col gap-3">
            {pendingTickets.length === 0 ? (
              <div className="bg-card border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center gap-3">
                <CheckCircle2 className="w-12 h-12 text-success opacity-50" />
                <p className="text-muted-foreground font-medium">No hay incidencias pendientes.</p>
              </div>
            ) : (
              pendingTickets.map((ticket) => (
                <div key={ticket.id} className="bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 overflow-hidden">
                      {ticket.photoBase64 ? (
                        <img src={ticket.photoBase64} alt="Evidencia" className="w-16 h-16 rounded-xl object-cover shrink-0 border" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border">
                          <FileText className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <p className="font-bold text-base truncate capitalize">{ticket.issue_type}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {locationMap[ticket.location_id]?.name || "Sin Ubicación"} 
                          {ticket.specific_location ? ` (${ticket.specific_location})` : ''}
                        </p>
                        <Badge variant="outline" className="w-fit mt-1 text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
                          {new Date(ticket.reported_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingTicket(ticket)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {role === 'director' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(ticket.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-3 rounded-xl">
                    <p className="text-sm font-medium leading-relaxed">{ticket.description}</p>
                  </div>
                  
                  <div className="flex justify-end pt-1">
                    <Button variant="outline" size="sm" className="text-success border-success/30 hover:bg-success/10 hover:text-success gap-2" onClick={() => handleMarkSolved(ticket.id)}>
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar Solucionado
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'solved' && (
          <div className="flex flex-col gap-3">
            {solvedTickets.length === 0 ? (
              <div className="bg-card border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center gap-3">
                <LayoutList className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-medium">No hay histórico de soluciones.</p>
              </div>
            ) : (
              solvedTickets.map((ticket) => (
                <div key={ticket.id} className="bg-card border rounded-2xl p-4 flex flex-col gap-3 shadow-sm opacity-80">
                  <div className="flex gap-3 overflow-hidden">
                    <div className="flex flex-col overflow-hidden w-full">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-base truncate capitalize line-through text-muted-foreground">{ticket.issue_type}</p>
                        {role === 'director' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => handleDelete(ticket.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {locationMap[ticket.location_id]?.name || "Sin Ubicación"} 
                        {ticket.specific_location ? ` (${ticket.specific_location})` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-xl">
                    <p className="text-sm font-medium leading-relaxed">{ticket.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                    <span>Reportado: {new Date(ticket.reported_at).toLocaleDateString()}</span>
                    {ticket.solved_at && <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Solución: {new Date(ticket.solved_at).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelEdit} />
          <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="font-bold text-xl">{editingTicket ? 'Editar Reporte' : 'Nuevo Reporte'}</h3>
              <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 rounded-full bg-muted hover:bg-muted/80">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 mb-4 border border-red-100">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{errorMsg}</p>
                </div>
              )}
              
              <form id="report-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Tipo de Falla *</label>
                  <Select required name="issue_type" value={formData.issue_type} onChange={handleInputChange}>
                    <option value="" disabled>Selecciona una categoría...</option>
                    <option value="electrica">Falla Eléctrica (Contactos, Focos)</option>
                    <option value="plomeria">Plomería (Fugas, Baños)</option>
                    <option value="aire">Aire Acondicionado (No enfría, Ruidos)</option>
                    <option value="mobiliario">Mobiliario (Bancos rotos, Pizarrón)</option>
                    <option value="otro">Otro</option>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Salón / Área *</label>
                    <Select name="location_id" value={formData.location_id} onChange={handleInputChange} required>
                      <option value="" disabled>Seleccionar...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-foreground">Lugar Específico</label>
                    <Input 
                      name="specific_location" 
                      value={formData.specific_location} 
                      onChange={handleInputChange} 
                      placeholder="Ej. Esquina derecha" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Descripción del Problema *</label>
                  <Textarea 
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe detalladamente cuál es la falla..." 
                    className="min-h-[80px] text-sm resize-none rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-foreground">Evidencia (Opcional)</label>
                  {formData.photoBase64 ? (
                    <div className="relative rounded-xl overflow-hidden border">
                      <img src={formData.photoBase64} alt="Evidencia" className="w-full h-32 object-cover" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8" onClick={() => setFormData(prev => ({ ...prev, photoBase64: '' }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative border-2 border-dashed border-input rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-muted/70 transition-colors cursor-pointer">
                      <Camera className="w-8 h-8 mb-1 opacity-50" />
                      <p className="text-sm font-medium">Toca para abrir la cámara</p>
                      <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageCapture} />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> 
                    {editingTicket ? 'Actualizar' : 'Guardar'}
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

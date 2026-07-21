import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { syncTicketsToSupabase } from '@/lib/sync'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Camera, Save, CloudOff, Info, Edit2, Trash2, AlertCircle, X } from "lucide-react"

export default function ReportView() {
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const isOnline = useStore((state) => state.isOnline);

  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    issue_type: '',
    description: '',
    photoBase64: ''
  });

  const recentReports = useLiveQuery(
    () => db.tickets.where('sync_status').equals('pending').reverse().sortBy('id')
  );

  const editingTicket = useStore(state => state.editingTicket);
  const setEditingTicket = useStore(state => state.setEditingTicket);

  useEffect(() => {
    if (editingTicket) {
      handleEdit(editingTicket);
      setEditingTicket(null);
    }
  }, [editingTicket, setEditingTicket]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photoBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const description = formData.description.trim();

      // Duplicate Check
      if (description) {
        const existing = await db.tickets
          .where('issue_type').equals(formData.issue_type)
          .toArray();
        
        const isDuplicate = existing.some(t => t.description === description && t.id !== editingId);
        if (isDuplicate) {
          setErrorMsg("Ya existe un reporte idéntico pendiente de envío.");
          return;
        }
      }

      if (editingId) {
        await db.tickets.update(editingId, {
          issue_type: formData.issue_type,
          description: description,
          photoBase64: formData.photoBase64 || null,
          reported_at: new Date().toISOString()
        });
      } else {
        const newTicket = {
          issue_type: formData.issue_type,
          description: description,
          location_id: 'temp-location-id',
          photoBase64: formData.photoBase64 || null,
          sync_status: 'pending',
          reported_at: new Date().toISOString()
        };
        await db.tickets.add(newTicket);
      }

      setSubmitted(true);
      
      // Cleanup
      setEditingId(null);
      setFormData({ issue_type: '', description: '', photoBase64: '' });

      if (navigator.onLine) {
        await syncTicketsToSupabase();
      }
    } catch (error) {
      console.error("Error guardando el reporte:", error);
      setErrorMsg("Ocurrió un error al guardar el reporte.");
    }
  };

  const handleEdit = (ticket) => {
    setEditingId(ticket.id);
    setFormData({
      issue_type: ticket.issue_type || '',
      description: ticket.description || '',
      photoBase64: ticket.photoBase64 || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas cancelar este reporte local?")) {
      await db.tickets.delete(id);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ issue_type: '', description: '', photoBase64: '' });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Save className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Reporte {editingId ? 'Actualizado' : 'Guardado'}</h2>
        <p className="text-muted-foreground text-lg">
          Tu reporte de incidencia ha sido registrado.
        </p>
        {!isOnline && (
          <div className="bg-warning/20 border border-warning/50 text-warning-foreground p-4 rounded-xl flex items-start gap-3 mt-4 text-left">
            <CloudOff className="w-6 h-6 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">
              Estás en modo offline. El reporte se sincronizará automáticamente cuando te conectes al WiFi de la escuela.
            </p>
          </div>
        )}
        <Button 
          size="lg" 
          variant="outline" 
          className="mt-8 w-full h-14 rounded-xl text-lg font-bold"
          onClick={() => {
            setSubmitted(false);
            setEditingId(null);
          }}
        >
          {editingId ? 'Volver a Reportes' : 'Crear otro reporte'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-24 space-y-8">
      
      {/* Form Section */}
      <section>
        <div className="py-4 mb-2">
          <h2 className="text-2xl font-bold text-foreground">
            {editingId ? "Editar Reporte" : "Reportar Incidencia"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {editingId ? "Actualiza los detalles de la falla" : "Registra daños o fallas en el aula"}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <form 
          className="flex flex-col gap-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-3">
            <label className="text-base font-bold text-foreground">Tipo de Falla</label>
            <Select 
              required 
              name="issue_type"
              value={formData.issue_type}
              onChange={handleInputChange}
            >
              <option value="" disabled>Selecciona una categoría...</option>
              <option value="electrica">Falla Eléctrica (Contactos, Focos)</option>
              <option value="plomeria">Plomería (Fugas, Baños)</option>
              <option value="aire">Aire Acondicionado (No enfría, Ruidos)</option>
              <option value="mobiliario">Mobiliario (Bancos rotos, Pizarrón)</option>
              <option value="otro">Otro</option>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-base font-bold text-foreground">Descripción del Problema</label>
            <Textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe detalladamente cuál es la falla o el daño..." 
              className="min-h-[120px] text-base resize-none rounded-xl"
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-base font-bold text-foreground">Evidencia Fotográfica (Opcional)</label>
            {formData.photoBase64 ? (
              <div className="relative rounded-xl overflow-hidden border">
                <img src={formData.photoBase64} alt="Evidencia" className="w-full h-48 object-cover" />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute top-2 right-2 rounded-full h-8 w-8"
                  onClick={() => setFormData(prev => ({ ...prev, photoBase64: '' }))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-input rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:bg-muted/70 transition-colors cursor-pointer">
                <Camera className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm font-medium">Toca para abrir la cámara</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleImageCapture}
                />
              </div>
            )}
          </div>

          {!editingId && (
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
              <p className="text-xs font-medium leading-relaxed">
                Si no tienes internet, este reporte se guardará localmente y se enviará automáticamente al conectarse.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <Button type="submit" size="lg" className="w-full h-16 text-xl rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90">
              <Save className="w-6 h-6 mr-3" />
              {editingId ? 'Actualizar Reporte' : 'Guardar Reporte'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" size="lg" className="w-full h-14 rounded-xl text-lg font-bold" onClick={cancelEdit}>
                Cancelar Edición
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* Recent Reports Section */}
      <section className="pt-6 border-t">
        <h3 className="text-lg font-bold text-foreground mb-4">Reportes Pendientes de Envío</h3>
        
        {(!recentReports || recentReports.length === 0) ? (
          <p className="text-muted-foreground text-sm text-center py-6">No hay reportes locales pendientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentReports.map((ticket) => (
              <div key={ticket.id} className="bg-card border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  {ticket.photoBase64 && (
                    <img src={ticket.photoBase64} alt="Thumb" className="w-10 h-10 rounded-md object-cover shrink-0" />
                  )}
                  <div className="overflow-hidden pr-3">
                    <p className="font-bold text-sm truncate">{ticket.issue_type.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {ticket.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(ticket)}>
                    <Edit2 className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50" onClick={() => handleDelete(ticket.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

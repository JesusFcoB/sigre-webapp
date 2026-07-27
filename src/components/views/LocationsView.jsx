import React, { useState, useRef } from 'react'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, School, User, PlusCircle, Trash2, Edit2, Save, X, AlertCircle, QrCode, Download, Check } from "lucide-react"
import { QRCodeCanvas } from 'qrcode.react'

export default function LocationsView({ navigateTo }) {
  const [formData, setFormData] = useState({
    name: '',
    responsible_name: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [qrLocation, setQrLocation] = useState(null);

  const locations = useLiveQuery(() => db.locations.toArray()) || [];

  const downloadQR = (loc) => {
    const canvas = document.getElementById(`qr-canvas-${loc.id}`);
    if (!canvas) return;
    
    // Create a high-quality sign canvas with background, text and QR combined
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = 600;
    finalCanvas.height = 800;
    const ctx = finalCanvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Outer border
    ctx.strokeStyle = '#3b82f6'; // primary theme color
    ctx.lineWidth = 15;
    ctx.strokeRect(20, 20, finalCanvas.width - 40, finalCanvas.height - 40);
    
    // Inner border
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 2;
    ctx.strokeRect(35, 35, finalCanvas.width - 70, finalCanvas.height - 70);
    
    // Header text
    ctx.fillStyle = '#1e3a8a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('S I G R E', finalCanvas.width / 2, 90);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SISTEMA INTEGRAL DE GESTIÓN DE RECURSOS ESCOLARES', finalCanvas.width / 2, 125);
    
    // Decorative divider line
    ctx.beginPath();
    ctx.moveTo(80, 155);
    ctx.lineTo(finalCanvas.width - 80, 155);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Classroom Name
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(loc.name.toUpperCase(), finalCanvas.width / 2, 220);
    
    // Responsible Teacher Title
    ctx.fillStyle = '#4b5563';
    ctx.font = 'normal 18px sans-serif';
    ctx.fillText('Docente Responsable:', finalCanvas.width / 2, 275);
    
    // Responsible Teacher Name
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(loc.responsible_name, finalCanvas.width / 2, 310);
    
    // Draw the QR Code canvas onto our final canvas
    ctx.drawImage(canvas, (finalCanvas.width - 320) / 2, 360, 320, 320);
    
    // Footer scan instructions
    ctx.fillStyle = '#6b7280';
    ctx.font = 'italic 14px sans-serif';
    ctx.fillText('Escanee este código QR para registrar incidencias o verificar inventario', finalCanvas.width / 2, 730);
    
    // Create download link
    const url = finalCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `SIGRE_QR_${loc.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const name = formData.name.trim();
    const responsible_name = formData.responsible_name.trim();

    if (!name || !responsible_name) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }

    // Auto-generar id a partir de nombre (slug)
    const generatedId = editingId || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_-+$)/g, '');

    try {
      if (editingId) {
        // Modo Edición
        await db.locations.update(editingId, {
          name,
          responsible_name
        });
        setEditingId(null);
      } else {
        // Modo Registro - Verificación de duplicado
        const existing = await db.locations.get(generatedId);
        if (existing) {
          setErrorMsg("Ya existe un aula con un nombre similar.");
          return;
        }

        await db.locations.add({
          id: generatedId,
          name,
          responsible_name
        });
      }

      setFormData({ name: '', responsible_name: '' });
    } catch (error) {
      console.error("Error guardando ubicación:", error);
      setErrorMsg("Ocurrió un error al guardar la ubicación.");
    }
  };

  const handleEdit = (loc) => {
    setEditingId(loc.id);
    setFormData({
      name: loc.name,
      responsible_name: loc.responsible_name
    });
  };

  const handleDelete = async (id) => {
    // Validar si hay bienes asociados a esta ubicación antes de eliminar
    const itemsCount = await db.items.where('location_id').equals(id).count();
    if (itemsCount > 0) {
      alert(`No se puede eliminar esta ubicación porque tiene ${itemsCount} bienes asignados.`);
      return;
    }

    if (window.confirm("¿Seguro que deseas eliminar esta ubicación permanentemente?")) {
      const record = await db.locations.get(id);
      if (record && (record.sync_status === 'pending_create' || record.sync_status === 'pending')) {
        await db.locations.delete(id);
      } else {
        await db.locations.update(id, { sync_status: 'pending_delete' });
      }
      
      if (navigator.onLine) {
        import('@/lib/sync').then(s => s.syncAll());
      }
      
      // Limpiar edición si se elimina el que se estaba editando
      if (editingId === id) {
        setEditingId(null);
        setFormData({ name: '', responsible_name: '' });
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', responsible_name: '' });
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col h-full pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 py-2 border-b pb-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigateTo('dashboard')} 
          className="h-10 w-10 shrink-0 rounded-full bg-muted/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestión de Aulas</h2>
          <p className="text-muted-foreground text-sm">Administra los espacios escolares y sus docentes responsables</p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/50">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Formulario */}
      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="font-bold text-base text-foreground">
              {editingId ? "Editar Aula" : "Nueva Aula"}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nombre del Aula</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                    <School className="w-4 h-4" />
                  </span>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej. Aula 2B o Laboratorio"
                    required
                    className="pl-10 h-11"
                    disabled={!!editingId} // No permitir cambiar el ID/Nombre original en edición para no romper las relaciones
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase">Docente Responsable</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                    <User className="w-4 h-4" />
                  </span>
                  <Input
                    name="responsible_name"
                    value={formData.responsible_name}
                    onChange={handleInputChange}
                    placeholder="Ej. Prof. Carlos Gómez"
                    required
                    className="pl-10 h-11"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              {editingId && (
                <Button type="button" variant="ghost" className="h-11 px-6 rounded-xl" onClick={cancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/90 flex items-center">
                {editingId ? (
                  <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>
                ) : (
                  <><PlusCircle className="w-4 h-4 mr-2" /> Agregar Aula</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Listado */}
      <section className="flex-1 space-y-3">
        <h3 className="text-lg font-bold text-foreground">Aulas Registradas ({locations.length})</h3>
        
        {locations.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No hay aulas registradas en el sistema.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {locations.map((loc) => (
              <div 
                key={loc.id} 
                className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="bg-primary/10 text-primary p-2.5 rounded-xl shrink-0">
                    <School className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-base truncate text-foreground">{loc.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{loc.responsible_name}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg border-primary/20 text-primary hover:bg-primary/5" 
                    onClick={() => setQrLocation(loc)}
                    title="Ver Código QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleEdit(loc)}>
                    <Edit2 className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="h-9 w-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:hover:bg-red-900/50" 
                    onClick={() => handleDelete(loc.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Elementos ocultos para poder capturar el canvas del QR en alta calidad al descargar */}
      <div style={{ display: 'none' }}>
        {locations.map(loc => (
          <QRCodeCanvas
            key={loc.id}
            id={`qr-canvas-${loc.id}`}
            value={loc.id}
            size={320}
            level="H"
          />
        ))}
      </div>

      {/* Modal para visualizar el QR y descargar el letrero */}
      {qrLocation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setQrLocation(null)} />
          
          {/* Card */}
          <div className="relative w-full max-w-sm bg-card border rounded-3xl shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" /> Letrero QR
                </h4>
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setQrLocation(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Door sign preview */}
              <div className="border-4 border-primary rounded-2xl p-5 bg-white text-black flex flex-col items-center text-center shadow-md">
                <span className="text-primary font-bold text-sm tracking-widest">S I G R E</span>
                <span className="text-gray-500 font-bold text-[9px] uppercase tracking-wider block mt-0.5">Control de Recursos Escolares</span>
                
                <div className="w-full h-px bg-gray-200 my-3" />
                
                <h5 className="font-black text-2xl tracking-tight text-gray-900">{qrLocation.name.toUpperCase()}</h5>
                <p className="text-xs text-gray-500 mt-1">Docente Responsable:</p>
                <p className="font-bold text-sm text-gray-800">{qrLocation.responsible_name}</p>
                
                <div className="mt-4 p-2 bg-white border-2 border-gray-100 rounded-xl">
                  {/* Visual QR shown inside the modal preview */}
                  <QRCodeCanvas 
                    value={qrLocation.id} 
                    size={160}
                    level="H"
                  />
                </div>
                
                <p className="text-[9px] text-gray-400 italic mt-4 px-2">Escanee este código QR para registrar incidencias o verificar inventario</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => downloadQR(qrLocation)} 
                  className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 text-primary-foreground"
                >
                  <Download className="w-4 h-4" />
                  Descargar Letrero Oficial
                </Button>
                <Button variant="outline" className="w-full h-11 rounded-xl" onClick={() => setQrLocation(null)}>
                  Cerrar
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

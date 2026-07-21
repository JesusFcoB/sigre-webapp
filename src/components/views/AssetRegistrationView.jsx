import React, { useState, useEffect } from 'react'
import { db } from '@/lib/db'
import { syncItemsToSupabase } from '@/lib/sync'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { PackagePlus, Camera, CheckCircle2, ScanBarcode, Edit2, Trash2, AlertCircle, X } from "lucide-react"
import BarcodeScanner from '@/components/ui/BarcodeScanner'

export default function AssetRegistrationView() {
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  
  // Edit mode state
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    condition: '',
    location_id: '',
    serial_number: '',
    photoBase64: ''
  });

  // Fetch pending items to show in the list
  const recentItems = useLiveQuery(
    () => db.items.where('sync_status').equals('pending_create').reverse().sortBy('id')
  );

  const editingItem = useStore(state => state.editingItem);
  const setEditingItem = useStore(state => state.setEditingItem);

  useEffect(() => {
    if (editingItem) {
      handleEdit(editingItem);
      setEditingItem(null);
    }
  }, [editingItem, setEditingItem]);

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
      const serialNumber = formData.serial_number?.trim();
      
      // Duplicate check
      if (serialNumber) {
        const existing = await db.items.filter(i => i.serial_number === serialNumber).first();
        if (existing && existing.id !== editingId) {
          setErrorMsg("Ya existe un bien registrado con este número de serie.");
          return;
        }
      }

      if (editingId) {
        await db.items.update(editingId, {
          description: formData.description,
          condition: formData.condition,
          location_id: formData.location_id,
          serial_number: serialNumber || null,
          photoBase64: formData.photoBase64 || null
        });
      } else {
        const newItem = {
          id: crypto.randomUUID(),
          description: formData.description,
          condition: formData.condition,
          location_id: formData.location_id,
          serial_number: serialNumber || null,
          photoBase64: formData.photoBase64 || null,
          sync_status: 'pending_create'
        };
        await db.items.add(newItem);
      }

      setSubmitted(true);
      
      // Reset form
      setEditingId(null);
      setFormData({
        description: '',
        condition: '',
        location_id: '',
        serial_number: '',
        photoBase64: ''
      });

      if (navigator.onLine) {
        await syncItemsToSupabase();
      }

    } catch (error) {
      console.error("Error guardando el bien:", error);
      setErrorMsg("Ocurrió un error al intentar guardar.");
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      description: item.description || '',
      condition: item.condition || '',
      location_id: item.location_id || '',
      serial_number: item.serial_number || '',
      photoBase64: item.photoBase64 || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro local?")) {
      await db.items.delete(id);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ description: '', condition: '', location_id: '', serial_number: '', photoBase64: '' });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-6 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Bien {editingId ? 'Actualizado' : 'Registrado'}</h2>
        <p className="text-muted-foreground text-lg">
          El artículo ha sido guardado exitosamente en la base de datos local.
        </p>
        <Button 
          size="lg" 
          variant="outline" 
          className="mt-8 w-full h-14 rounded-xl text-lg font-bold"
          onClick={() => {
            setSubmitted(false);
            setEditingId(null);
          }}
        >
          {editingId ? 'Volver' : 'Registrar otro bien'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-24 space-y-8">
      {isScanning && (
        <BarcodeScanner 
          onScan={(data) => {
            setFormData(prev => ({ ...prev, serial_number: data }));
            setIsScanning(false);
          }} 
          onClose={() => setIsScanning(false)} 
        />
      )}

      {/* Form Section */}
      <section>
        <div className="py-4 mb-2">
          <h2 className="text-2xl font-bold text-foreground">
            {editingId ? "Editar Registro" : "Alta de Bienes"}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {editingId ? "Corrige los datos del bien antes de enviarlo" : "Registra nuevo mobiliario o equipo"}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-xl flex items-center gap-2 mb-4 border border-red-100 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        <form 
          className="flex flex-col gap-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Descripción del Artículo</label>
            <Input 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Ej. Minisplit Mirage 2T..." 
              required 
              className="h-12" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Condición</label>
              <Select 
                name="condition" 
                value={formData.condition} 
                onChange={handleInputChange} 
                required
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="nuevo">Nuevo</option>
                <option value="bueno">Bueno</option>
                <option value="regular">Regular</option>
                <option value="malo">Malo</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Ubicación Asignada</label>
              <Select 
                name="location_id" 
                value={formData.location_id} 
                onChange={handleInputChange} 
                required
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="aula_1a">Aula 1A</option>
                <option value="aula_medios">Aula de Medios</option>
                <option value="direccion">Dirección</option>
                <option value="almacen">Almacén</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Número de Serie / Etiqueta</label>
            <div className="flex gap-2">
              <Input 
                name="serial_number" 
                value={formData.serial_number} 
                onChange={handleInputChange} 
                placeholder="SN-123456789" 
                className="h-12 flex-1" 
              />
              <Button type="button" variant="outline" className="h-12 w-12 px-0 shrink-0" onClick={() => setIsScanning(true)}>
                <ScanBarcode className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Fotografía del Bien (Opcional)</label>
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
              <div className="relative border-2 border-dashed border-input rounded-xl bg-muted/30 p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/50 transition-colors">
                <Camera className="w-8 h-8 mb-1 opacity-50" />
                <p className="text-xs font-medium">Toca para capturar imagen</p>
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

          <div className="flex flex-col gap-3 mt-4">
            <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90">
              <PackagePlus className="w-5 h-5 mr-3" />
              {editingId ? 'Actualizar Registro' : 'Guardar Registro'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" size="lg" className="w-full h-14 rounded-xl" onClick={cancelEdit}>
                Cancelar Edición
              </Button>
            )}
          </div>
        </form>
      </section>

      {/* Recent Records Section */}
      <section className="pt-6 border-t">
        <h3 className="text-lg font-bold text-foreground mb-4">Registros Recientes (Sin Sincronizar)</h3>
        
        {(!recentItems || recentItems.length === 0) ? (
          <p className="text-muted-foreground text-sm text-center py-6">No hay registros locales pendientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recentItems.map((item) => (
              <div key={item.id} className="bg-card border rounded-xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  {item.photoBase64 && (
                    <img src={item.photoBase64} alt="Thumb" className="w-10 h-10 rounded-md object-cover shrink-0" />
                  )}
                  <div className="overflow-hidden pr-3">
                    <p className="font-bold text-sm truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.serial_number || 'Sin serie'} • {item.condition}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleEdit(item)}>
                    <Edit2 className="w-4 h-4 text-foreground" />
                  </Button>
                  <Button variant="destructive" size="icon" className="h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50" onClick={() => handleDelete(item.id)}>
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

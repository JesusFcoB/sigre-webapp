import React, { useState } from 'react'
import { db } from '@/lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, School, User, PlusCircle, Trash2, Edit2, Save, X, AlertCircle } from "lucide-react"

export default function LocationsView({ navigateTo }) {
  const [formData, setFormData] = useState({
    name: '',
    responsible_name: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const locations = useLiveQuery(() => db.locations.toArray()) || [];

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
      await db.locations.delete(id);
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
    </div>
  )
}

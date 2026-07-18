import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { PackagePlus, Camera, Save, CheckCircle2, ScanBarcode } from "lucide-react"

export default function AssetRegistrationView() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Bien Registrado</h2>
        <p className="text-muted-foreground text-lg">
          El artículo ha sido dado de alta exitosamente en la base de datos local.
        </p>
        <Button 
          size="lg" 
          variant="outline" 
          className="mt-8 w-full h-14 rounded-xl text-lg font-bold"
          onClick={() => setSubmitted(false)}
        >
          Registrar otro bien
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="py-4 mb-2">
        <h2 className="text-2xl font-bold text-foreground">Alta de Bienes</h2>
        <p className="text-muted-foreground mt-1 text-sm">Registra nuevo mobiliario o equipo</p>
      </div>

      <form 
        className="flex flex-col gap-5 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Descripción del Artículo</label>
          <Input placeholder="Ej. Minisplit Mirage 2T..." required className="h-12" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Condición</label>
            <Select required defaultValue="">
              <option value="" disabled>Seleccionar...</option>
              <option value="nuevo">Nuevo</option>
              <option value="bueno">Bueno</option>
              <option value="regular">Regular</option>
              <option value="malo">Malo</option>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-foreground">Ubicación Asignada</label>
            <Select required defaultValue="">
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
            <Input placeholder="SN-123456789" className="h-12 flex-1" />
            <Button type="button" variant="outline" className="h-12 w-12 px-0 shrink-0">
              <ScanBarcode className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-foreground">Fotografía del Bien (Opcional)</label>
          <div className="border-2 border-dashed border-input rounded-xl bg-muted/30 p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
            <Camera className="w-8 h-8 mb-1 opacity-50" />
            <p className="text-xs font-medium">Toca para capturar imagen</p>
          </div>
        </div>

        <div className="flex-1" />

        <Button type="submit" size="lg" className="w-full h-16 text-xl rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90 mt-4">
          <PackagePlus className="w-6 h-6 mr-3" />
          Guardar Registro
        </Button>
      </form>
    </div>
  )
}

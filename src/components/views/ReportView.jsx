import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Camera, Save, CloudOff, Info } from "lucide-react"

export default function ReportView() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center animate-in zoom-in duration-300">
        <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-4">
          <Save className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Reporte Guardado</h2>
        <p className="text-muted-foreground text-lg">
          Tu reporte de incidencia ha sido registrado.
        </p>
        <div className="bg-warning/20 border border-warning/50 text-warning-foreground p-4 rounded-xl flex items-start gap-3 mt-4 text-left">
          <CloudOff className="w-6 h-6 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            Estás en modo offline. El reporte se sincronizará automáticamente cuando te conectes al WiFi de la escuela.
          </p>
        </div>
        <Button 
          size="lg" 
          variant="outline" 
          className="mt-8 w-full h-14 rounded-xl text-lg font-bold"
          onClick={() => setSubmitted(false)}
        >
          Crear otro reporte
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Header */}
      <div className="py-4 mb-2">
        <h2 className="text-2xl font-bold text-foreground">Reportar Incidencia</h2>
        <p className="text-muted-foreground mt-1 text-sm">Registra daños o fallas en el aula</p>
      </div>

      <form 
        className="flex flex-col gap-6 flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="space-y-3">
          <label className="text-base font-bold text-foreground">Tipo de Falla</label>
          <Select required defaultValue="">
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
            placeholder="Describe detalladamente cuál es la falla o el daño..." 
            className="min-h-[120px] text-base resize-none rounded-xl"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="text-base font-bold text-foreground">Evidencia Fotográfica (Opcional)</label>
          <div className="border-2 border-dashed border-input rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Camera className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No se han seleccionado fotos</p>
            <Button type="button" variant="secondary" className="rounded-full shadow-sm mt-2">
              <Camera className="w-4 h-4 mr-2" />
              Tomar Fotografía
            </Button>
          </div>
        </div>

        {/* Spacer to push button to bottom if screen is tall */}
        <div className="flex-1" />

        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
          <p className="text-xs font-medium leading-relaxed">
            Si no tienes internet, este reporte se guardará en tu celular y se enviará automáticamente al conectarse al WiFi.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full h-16 text-xl rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90">
          <Save className="w-6 h-6 mr-3" />
          Guardar Reporte
        </Button>
      </form>
    </div>
  )
}

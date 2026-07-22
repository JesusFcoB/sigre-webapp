import React, { useState } from 'react'
import { db } from '@/lib/db'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Box, FileText, CheckCircle2, AlertTriangle, PenTool, ArrowLeft } from "lucide-react"
import SignatureModal from '@/components/ui/SignatureModal'

export default function ClassroomInventoryView({ navigateTo }) {
  const selectedLocation = useStore(state => state.selectedLocation);
  const [showSignature, setShowSignature] = useState(false);
  
  // Si no hay locación seleccionada, regresamos al escáner
  if (!selectedLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4 px-6 text-center">
        <AlertTriangle className="w-16 h-16 text-warning" />
        <h2 className="text-xl font-bold">Ningún aula seleccionada</h2>
        <Button onClick={() => navigateTo('scanner')} className="mt-4">
          Volver al Escáner
        </Button>
      </div>
    );
  }

  const items = useLiveQuery(
    () => db.items.where('location_id').equals(selectedLocation).toArray()
  ) || [];

  const existingVale = useLiveQuery(
    () => db.vales.where('location_id').equals(selectedLocation).last()
  );

  const locationInfo = useLiveQuery(
    () => db.locations.get(selectedLocation),
    [selectedLocation]
  );

  const handleSign = async (signatureBase64) => {
    try {
      await db.vales.add({
        location_id: selectedLocation,
        signatureBase64,
        signed_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      setShowSignature(false);
    } catch (error) {
      console.error("Error guardando el vale:", error);
      alert("Hubo un error al guardar la firma.");
    }
  };

  const hasSigned = !!existingVale;

  return (
    <div className="flex flex-col h-full pb-32 space-y-6">
      
      {showSignature && (
        <SignatureModal 
          title="Firma del Responsable"
          onClose={() => setShowSignature(false)}
          onSign={handleSign}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 py-2 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={() => navigateTo('scanner')} className="h-10 w-10 shrink-0 rounded-full bg-muted/50">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground capitalize">Inventario: {locationInfo ? locationInfo.name : selectedLocation.replace('_', ' ')}</h2>
          <p className="text-muted-foreground text-sm">Responsable: {locationInfo ? locationInfo.responsible_name : 'No Asignado'}</p>
        </div>
      </div>

      {/* Items List */}
      <section className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Bienes Registrados ({items.length})</h3>
        </div>

        {items.length === 0 ? (
          <div className="bg-muted/30 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center text-center gap-3">
            <Box className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">No se encontraron bienes asignados a este espacio.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <div key={item.id} className="bg-card border rounded-xl p-4 shadow-sm flex gap-4 items-center">
                {item.photoBase64 ? (
                  <img src={item.photoBase64} className="w-14 h-14 rounded-lg object-cover" alt="Item" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Box className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-base truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-muted text-muted-foreground">
                      {item.serial_number || 'S/N'}
                    </Badge>
                    <span className="text-xs font-medium uppercase text-muted-foreground">• {item.condition}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Fixed Bottom Action for Signature */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-10">
        <div className="max-w-md mx-auto">
          {hasSigned ? (
            <div className="bg-success/10 border border-success/30 rounded-2xl p-4 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-success font-bold text-lg">
                <CheckCircle2 className="w-6 h-6" />
                Vale Firmado
              </div>
              <div className="bg-white rounded-xl p-2 w-full border border-success/20 flex justify-center">
                <img src={existingVale.signatureBase64} alt="Firma" className="h-16 object-contain mix-blend-multiply" />
              </div>
              <p className="text-xs text-success-foreground font-medium">
                Resguardo aceptado el {new Date(existingVale.signed_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-center text-muted-foreground font-medium px-4">
                Al firmar este vale, aceptas el resguardo de los {items.length} bienes listados anteriormente.
              </p>
              <Button 
                size="lg" 
                className="w-full h-16 text-xl rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90"
                onClick={() => setShowSignature(true)}
                disabled={items.length === 0}
              >
                <PenTool className="w-6 h-6 mr-3" />
                Firmar Vale de Resguardo
              </Button>
            </div>
          )}
        </div>
      </div>
      
    </div>
  )
}

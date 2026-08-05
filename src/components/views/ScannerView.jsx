import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { QrCode, Camera, AlertCircle, FileText, CheckCircle2, MapPin, UserCircle, FileSignature, X, PenTool } from "lucide-react"
import BarcodeScanner from '@/components/ui/BarcodeScanner'
import SignatureModal from '@/components/ui/SignatureModal'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { syncValesToSupabase } from '@/lib/sync'

export default function ScannerView({ navigateTo }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const setSelectedLocation = useStore(state => state.setSelectedLocation);
  const user = useStore(state => state.user);
  const role = (useStore(state => state.role) || '').toLowerCase();

  // Vale request state
  const [valeRequestOpen, setValeRequestOpen] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [valeSubmitted, setValeSubmitted] = useState(false);
  const [valeForm, setValeForm] = useState({
    end_date: '',
    signatureBase64: null
  });

  const locationInfo = useLiveQuery(
    () => scannedData ? db.locations.get(scannedData) : null,
    [scannedData]
  );

  const itemInfo = useLiveQuery(
    () => scannedData ? db.items.filter(i => i.serial_number === scannedData).first() : null,
    [scannedData]
  );

  // Check if item already has an active or pending vale
  const existingVale = useLiveQuery(
    () => itemInfo ? db.vales.filter(v => v.item_id === itemInfo.id && (v.vale_status === 'active' || v.vale_status === 'pending_approval')).first() : null,
    [itemInfo]
  );

  const handleScan = (data) => {
    setScannedData(data);
    setIsScanning(false);
    setValeSubmitted(false);
  };

  const handleValeRequest = async (e) => {
    e.preventDefault();
    if (!itemInfo || !user) return;

    try {
      const userName = user.user_metadata?.name || user.email || 'Profesor';
      await db.vales.add({
        person_name: userName,
        start_date: new Date().toISOString().split('T')[0],
        end_date: valeForm.end_date || null,
        item_id: itemInfo.id,
        signatureBase64: valeForm.signatureBase64 || null,
        vale_status: 'pending_approval',
        requested_by: user.email || userName,
        requested_at: new Date().toISOString(),
        sync_status: 'pending_create'
      });

      setValeRequestOpen(false);
      setValeForm({ end_date: '', signatureBase64: null });
      setValeSubmitted(true);

      if (navigator.onLine) syncValesToSupabase();
    } catch (err) {
      console.error('Error al solicitar vale:', err);
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setValeSubmitted(false);
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-24">
      {isScanning && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setIsScanning(false)}
        />
      )}

      {/* Header */}
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground">Escáner de Aulas</h2>
        <p className="text-muted-foreground mt-1 text-sm">Ubica el QR en el marco de la puerta</p>
      </div>

      {!scannedData ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-8 animate-in fade-in duration-500">
          <div className="relative w-64 h-64 bg-black/5 rounded-3xl border-4 border-dashed border-primary/40 flex items-center justify-center overflow-hidden shadow-inner cursor-pointer" onClick={() => setIsScanning(true)}>
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary m-4 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary m-4 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary m-4 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary m-4 rounded-br-lg" />
            
            <div className="flex flex-col items-center gap-3 text-primary/60">
              <QrCode className="w-16 h-16 animate-pulse" />
              <span className="font-medium text-sm">Tocar para Escanear</span>
            </div>
          </div>

          <div className="text-center px-8">
            <p className="text-sm text-muted-foreground mb-6 font-medium">
              Apunta al código QR ubicado en el marco de la puerta del salón.
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
              <Button size="lg" className="h-14 text-lg rounded-xl shadow-md w-full" onClick={() => setIsScanning(true)}>
                <Camera className="mr-2 h-5 w-5" />
                Activar Cámara
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500">
          
          <div className="w-full flex justify-center">
            <div className="bg-success/10 text-success px-4 py-2 rounded-full flex items-center gap-2 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              ¡QR Detectado!
            </div>
          </div>

          {/* Vale submitted success */}
          {valeSubmitted && (
            <div className="w-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-start gap-3 animate-in zoom-in-95 duration-300">
              <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 dark:text-green-300">¡Solicitud Enviada!</p>
                <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">Tu solicitud de préstamo ha sido enviada al Directivo para aprobación. Recibirás respuesta pronto.</p>
              </div>
            </div>
          )}

          <Card className="w-full border-primary/20 shadow-lg overflow-hidden">
            <div className={`p-4 text-white flex justify-between items-center ${locationInfo ? 'bg-primary' : itemInfo ? 'bg-indigo-600' : 'bg-slate-600'}`}>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-bold text-lg">
                  {locationInfo ? locationInfo.name : itemInfo ? itemInfo.description : scannedData}
                </span>
              </div>
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                {locationInfo ? 'Aula / Espacio' : itemInfo ? 'Bien / Artículo' : 'Código Leído'}
              </Badge>
            </div>
            
            {locationInfo && (
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                  <div className="bg-primary/10 p-3 rounded-full text-primary">
                    <UserCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Responsable del Espacio</p>
                    <p className="font-bold text-foreground text-lg">{locationInfo.responsible_name || 'No Asignado'}</p>
                  </div>
                </div>
              </CardContent>
            )}

            {itemInfo && (
              <CardContent className="p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm font-medium">Estado:</span>
                    <Badge>{itemInfo.condition}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm font-medium">Número de Serie:</span>
                    <span className="font-bold">{itemInfo.serial_number}</span>
                  </div>
                  {existingVale && (
                    <div className="mt-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                        {existingVale.vale_status === 'active' 
                          ? `⚠️ Prestado a: ${existingVale.person_name}` 
                          : `⏳ Solicitud pendiente de: ${existingVale.person_name}`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <div className="flex flex-col gap-4 w-full mt-2">
            {(locationInfo || (!locationInfo && !itemInfo)) && (
              <Button 
                size="lg" 
                className="h-16 text-xl rounded-2xl shadow-lg w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setSelectedLocation(scannedData);
                  navigateTo('classroom_inventory');
                }}
              >
                <FileText className="mr-3 h-6 w-6" />
                Ver Inventario de Aula
              </Button>
            )}

            {itemInfo && (
              <Button 
                size="lg" 
                className="h-16 text-xl rounded-2xl shadow-lg w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  useStore.getState().setEditingItem(itemInfo);
                  navigateTo('assets');
                }}
              >
                <FileText className="mr-3 h-6 w-6" />
                Ver Detalles del Bien
              </Button>
            )}

            {/* Vale Request Button — visible for ALL roles including professors */}
            {itemInfo && !existingVale && !valeSubmitted && (
              <Button 
                size="lg" 
                className="h-16 text-xl rounded-2xl shadow-lg w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setValeRequestOpen(true)}
              >
                <FileSignature className="mr-3 h-6 w-6" />
                Solicitar Préstamo
              </Button>
            )}
            
            <Button 
              size="lg" 
              variant="destructive" 
              className="h-16 text-xl rounded-2xl shadow-lg w-full"
              onClick={() => {
                if (locationInfo) setSelectedLocation(scannedData);
                navigateTo('report');
              }}
            >
              <AlertCircle className="mr-3 h-6 w-6" />
              Reportar Incidencia
            </Button>
            
            <Button variant="ghost" className="mt-2" onClick={resetScanner}>
              Escanear otro código
            </Button>
          </div>
        </div>
      )}

      {/* Vale Request Modal */}
      {valeRequestOpen && itemInfo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setValeRequestOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-primary" />
                  Solicitar Préstamo
                </h3>
                <Button variant="ghost" size="icon" onClick={() => setValeRequestOpen(false)}><X className="w-5 h-5" /></Button>
              </div>

              {/* Item preview */}
              <div className="bg-muted/50 border rounded-xl p-3 mb-4">
                <p className="font-bold text-sm">{itemInfo.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Serie: {itemInfo.serial_number || 'N/A'} • Estado: {itemInfo.condition}</p>
              </div>

              <form onSubmit={handleValeRequest} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Solicitante</label>
                  <Input value={user?.user_metadata?.name || user?.email || 'Profesor'} disabled className="h-11 bg-muted/30" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Fecha Estimada de Devolución *</label>
                  <Input 
                    type="date" 
                    value={valeForm.end_date} 
                    onChange={e => setValeForm(p => ({ ...p, end_date: e.target.value }))} 
                    required 
                    min={new Date().toISOString().split('T')[0]}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold">Firma Digital (Opcional)</label>
                  {valeForm.signatureBase64 ? (
                    <div className="relative border rounded-xl p-2 bg-muted/30">
                      <img src={valeForm.signatureBase64} alt="Firma" className="h-20 w-auto mx-auto" />
                      <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-destructive" onClick={() => setValeForm(p => ({ ...p, signatureBase64: null }))}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="w-full h-12 border-dashed border-2" onClick={() => setShowSignatureModal(true)}>
                      <PenTool className="w-4 h-4 mr-2" />
                      Agregar Firma Digital
                    </Button>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setValeRequestOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Enviar Solicitud
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          onClose={() => setShowSignatureModal(false)}
          onSign={(dataUrl) => {
            setValeForm(p => ({ ...p, signatureBase64: dataUrl }));
            setShowSignatureModal(false);
          }}
        />
      )}
    </div>
  )
}

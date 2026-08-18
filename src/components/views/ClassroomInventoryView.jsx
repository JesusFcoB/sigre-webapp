import React, { useState, useMemo } from 'react'
import { db } from '@/lib/db'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Box, FileText, CheckCircle2, AlertTriangle, PenTool, ArrowLeft,
  Camera, CheckSquare, Square, RotateCcw, ShieldCheck, QrCode,
  ScanBarcode, Layers, Download, Check, HelpCircle, XCircle
} from "lucide-react"
import SignatureModal from '@/components/ui/SignatureModal'
import BarcodeScanner from '@/components/ui/BarcodeScanner'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ClassroomInventoryView({ navigateTo }) {
  const selectedLocation = useStore(state => state.selectedLocation);
  const user = useStore(state => state.user);
  const role = (useStore(state => state.role) || '').toLowerCase();

  const [activeTab, setActiveTab] = useState('audit'); // 'audit' | 'list'
  const [showSignature, setShowSignature] = useState(false);
  const [isScanningAudit, setIsScanningAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState('all'); // 'all' | 'pending' | 'verified'
  const [verifiedIds, setVerifiedIds] = useState(new Set());
  const [lastScanFeedback, setLastScanFeedback] = useState(null);

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

  const allItems = useLiveQuery(() => db.items.toArray()) || [];
  const locations = useLiveQuery(() => db.locations.toArray()) || [];
  const vales = useLiveQuery(() => db.vales.toArray()) || [];

  const locationInfo = useMemo(() => {
    return locations.find(l => l.id === selectedLocation || l.name?.toLowerCase() === String(selectedLocation).toLowerCase());
  }, [locations, selectedLocation]);

  const locationMap = useMemo(() => {
    const m = {};
    locations.forEach(l => { m[l.id] = l; });
    return m;
  }, [locations]);

  // Items assigned to this specific classroom / area
  const items = useMemo(() => {
    const locId = locationInfo ? locationInfo.id : selectedLocation;
    const locName = locationInfo?.name?.toLowerCase();
    return allItems.filter(item => {
      if (item.status === 'discarded' || item.sync_status === 'pending_delete') return false;
      const iLoc = (item.location_id || '').toLowerCase();
      return item.location_id === locId || iLoc === locId?.toLowerCase() || (locName && iLoc === locName);
    });
  }, [allItems, locationInfo, selectedLocation]);

  const existingVale = useMemo(() => {
    const locId = locationInfo ? locationInfo.id : selectedLocation;
    return vales.filter(v => v.location_id === locId && v.sync_status !== 'pending_delete').pop();
  }, [vales, locationInfo, selectedLocation]);

  // Audit Calculations
  const totalItemsCount = useMemo(() => {
    return items.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  }, [items]);

  const verifiedItemsCount = useMemo(() => {
    let count = 0;
    items.forEach(item => {
      if (verifiedIds.has(item.id)) {
        count += (Number(item.quantity) || 1);
      }
    });
    return count;
  }, [items, verifiedIds]);

  const pendingItemsCount = Math.max(0, totalItemsCount - verifiedItemsCount);
  const progressPercent = totalItemsCount > 0 ? Math.round((verifiedItemsCount / totalItemsCount) * 100) : 100;

  // Toggle single item manual verification
  const toggleVerification = (itemId) => {
    setVerifiedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Handle continuous barcode / serial scan during audit
  const handleAuditScan = (scannedCode) => {
    if (!scannedCode) return;
    const code = scannedCode.trim().toLowerCase();

    // 1. Search in current classroom items
    const matchInRoom = items.find(i => 
      (i.serial_number && i.serial_number.toLowerCase() === code) ||
      (i.id && i.id.toLowerCase() === code) ||
      (i.official_inventory_number && i.official_inventory_number.toLowerCase() === code)
    );

    if (matchInRoom) {
      const already = verifiedIds.has(matchInRoom.id);
      if (already) {
        setLastScanFeedback(
          <div className="bg-blue-600/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Ya estaba verificado: <strong>{matchInRoom.name || matchInRoom.description}</strong> ({matchInRoom.serial_number || 'S/N'})</span>
          </div>
        );
      } else {
        setVerifiedIds(prev => new Set(prev).add(matchInRoom.id));
        setLastScanFeedback(
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>✅ Verificado: <strong>{matchInRoom.name || matchInRoom.description}</strong> ({matchInRoom.serial_number || 'S/N'})</span>
          </div>
        );
      }
      return;
    }

    // 2. Search in all other items across the school
    const matchInOther = allItems.find(i => 
      (i.serial_number && i.serial_number.toLowerCase() === code) ||
      (i.id && i.id.toLowerCase() === code) ||
      (i.official_inventory_number && i.official_inventory_number.toLowerCase() === code)
    );

    if (matchInOther) {
      const otherLocName = locationMap[matchInOther.location_id]?.name || matchInOther.location_id || 'Otro espacio';
      setLastScanFeedback(
        <div className="bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>⚠️ Bien ajeno: <strong>{matchInOther.name || matchInOther.description}</strong> pertenece a <strong>{otherLocName}</strong></span>
        </div>
      );
      return;
    }

    // 3. Not found in database
    setLastScanFeedback(
      <div className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2">
        <XCircle className="w-4 h-4 shrink-0" />
        <span>❓ Código no registrado: {scannedCode}</span>
      </div>
    );
  };

  const handleSign = async (signatureBase64) => {
    try {
      const locId = locationInfo ? locationInfo.id : selectedLocation;
      const userName = user?.user_metadata?.name || user?.email || 'Responsable';

      await db.vales.add({
        location_id: locId,
        person_name: userName,
        signatureBase64,
        signed_at: new Date().toISOString(),
        start_date: new Date().toISOString().split('T')[0],
        vale_status: 'active',
        audit_percentage: progressPercent,
        verified_count: verifiedItemsCount,
        total_items: totalItemsCount,
        sync_status: 'pending_create'
      });
      setShowSignature(false);
    } catch (error) {
      console.error("Error guardando el acta de auditoría:", error);
      alert("Hubo un error al guardar la firma.");
    }
  };

  const exportAuditPDF = () => {
    const doc = new jsPDF();
    const locName = locationInfo ? locationInfo.name : selectedLocation;
    const respName = locationInfo?.responsible_name || 'No Asignado';
    const dateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFontSize(16);
    doc.text(`SIGRE — Acta de Auditoría de Aula: ${locName}`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Responsable del espacio: ${respName}   |   Fecha de auditoría: ${dateStr}`, 14, 22);
    doc.text(`Resultado: ${verifiedItemsCount} de ${totalItemsCount} unidades verificadas físicamente (${progressPercent}% de avance)`, 14, 28);

    const tableRows = items.map((i, idx) => {
      const isVer = verifiedIds.has(i.id);
      return [
        idx + 1,
        i.name || i.description,
        i.description && i.description !== i.name ? i.description : '—',
        i.serial_number || 'S/N',
        i.category || 'General',
        i.quantity || 1,
        i.condition?.toUpperCase() || 'BUENO',
        isVer ? 'VERIFICADO EN SITIO' : 'PENDIENTE / FALTANTE'
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: [['#', 'Artículo', 'Detalle Físico', 'No. Serie', 'Categoría', 'Cant.', 'Estado', 'Estatus Auditoría']],
      body: tableRows,
      theme: 'striped',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
      columnStyles: {
        7: { fontStyle: 'bold' }
      }
    });

    doc.save(`SIGRE_Auditoria_${locName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Filtered items in audit tab
  const displayedItems = useMemo(() => {
    if (auditFilter === 'verified') return items.filter(i => verifiedIds.has(i.id));
    if (auditFilter === 'pending') return items.filter(i => !verifiedIds.has(i.id));
    return items;
  }, [items, auditFilter, verifiedIds]);

  const hasSigned = !!existingVale;

  return (
    <div className="flex flex-col h-full pb-36 space-y-5">
      {/* Continuous Audit Scanner Modal */}
      {isScanningAudit && (
        <BarcodeScanner
          continuous={true}
          title={`Auditoría: ${locationInfo?.name || selectedLocation}`}
          subtitle="Enfoca los códigos de barra o QR de cada bien mueble dentro del aula"
          onScan={handleAuditScan}
          onClose={() => {
            setIsScanningAudit(false);
            setLastScanFeedback(null);
          }}
          statusBadge={
            <span className="bg-emerald-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full shadow">
              {verifiedItemsCount} de {totalItemsCount} ({progressPercent}%)
            </span>
          }
          lastScanFeedback={lastScanFeedback}
        />
      )}

      {showSignature && (
        <SignatureModal 
          title="Firma de Conformidad de Inventario"
          onClose={() => setShowSignature(false)}
          onSign={handleSign}
        />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 py-2 border-b pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigateTo('scanner')} className="h-10 w-10 shrink-0 rounded-full bg-muted/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground capitalize truncate">
              {locationInfo ? locationInfo.name : String(selectedLocation).replace('_', ' ')}
            </h2>
            <p className="text-muted-foreground text-xs truncate">
              Responsable: <span className="font-semibold text-foreground">{locationInfo ? locationInfo.responsible_name : 'No Asignado'}</span>
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={exportAuditPDF} className="h-9 gap-1.5 text-xs font-bold shrink-0 rounded-xl" disabled={items.length === 0}>
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Descargar Acta</span>
        </Button>
      </div>

      {/* Mode Tabs */}
      <div className="flex p-1 bg-muted rounded-2xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ScanBarcode className="w-4 h-4 text-primary" />
          <span>Modo Auditoría Física</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'list' 
              ? 'bg-card text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Lista General ({items.length})</span>
        </button>
      </div>

      {/* ─── TAB 1: AUDIT MODE ────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Progress Card */}
          <div className="bg-card border rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Avance del Conteo Físico</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-primary">{verifiedItemsCount}</span>
                  <span className="text-sm font-bold text-muted-foreground">de {totalItemsCount} bienes verificados</span>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-lg font-black px-3 py-1 rounded-2xl ${
                  progressPercent === 100 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  progressPercent === 100 ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button 
                className="flex-1 h-12 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-sm shadow-md gap-2"
                onClick={() => setIsScanningAudit(true)}
                disabled={items.length === 0}
              >
                <Camera className="w-5 h-5" />
                <span>Escanear Códigos Continuo</span>
              </Button>
              {verifiedIds.size > 0 && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-12 w-12 rounded-2xl text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (window.confirm("¿Deseas reiniciar el conteo de auditoría de esta aula?")) {
                      setVerifiedIds(new Set());
                    }
                  }}
                  title="Reiniciar Conteo"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAuditFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  auditFilter === 'all' ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
                }`}
              >
                Todos ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('pending')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  auditFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Pendientes ({pendingItemsCount})
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter('verified')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  auditFilter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                Verificados ({verifiedIds.size})
              </button>
            </div>
          </div>

          {/* Checklist Items */}
          {items.length === 0 ? (
            <div className="bg-muted/20 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <Box className="w-12 h-12 text-muted-foreground opacity-40 mb-2" />
              <h3 className="font-bold text-base text-foreground">Sin bienes asignados</h3>
              <p className="text-xs text-muted-foreground">No hay bienes vinculados a esta aula para auditar.</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="p-8 text-center bg-card border rounded-2xl text-muted-foreground text-sm font-medium">
              No hay artículos en esta categoría.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {displayedItems.map(item => {
                const isVer = verifiedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleVerification(item.id)}
                    className={`border rounded-2xl p-3.5 flex items-center gap-3 transition-all cursor-pointer select-none active:scale-[0.99] ${
                      isVer 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' 
                        : 'bg-card hover:border-primary/40 shadow-xs'
                    }`}
                  >
                    {/* Checkbox Icon */}
                    <div className="shrink-0">
                      {isVer ? (
                        <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-xl border-2 border-muted-foreground/40 flex items-center justify-center bg-background" />
                      )}
                    </div>

                    {/* Image / Icon */}
                    {item.photoBase64 ? (
                      <img src={item.photoBase64} className="w-11 h-11 rounded-xl object-cover shrink-0" alt="" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Box className="w-5 h-5 text-muted-foreground opacity-50" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isVer ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.name || item.description}
                      </p>
                      {item.name && item.description && item.description !== item.name && (
                        <p className="text-[11px] text-muted-foreground truncate italic">{item.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px]">
                        <span className="font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Serie: {item.serial_number || 'S/N'}
                        </span>
                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Cant: {item.quantity || 1}
                        </span>
                        {item.condition && (
                          <span className="text-muted-foreground capitalize">
                            • {item.condition}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Verification Status Badge */}
                    <div className="shrink-0 text-right">
                      {isVer ? (
                        <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-1 rounded-full">
                          Encontrado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded-full">
                          Pendiente
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: LIST GENERAL VIEW ─────────────────────────────── */}
      {activeTab === 'list' && (
        <section className="flex-1 space-y-3">
          {items.length === 0 ? (
            <div className="bg-muted/20 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center">
              <Box className="w-12 h-12 text-muted-foreground opacity-40 mb-2" />
              <h3 className="font-bold text-base text-foreground">Sin bienes asignados</h3>
              <p className="text-xs text-muted-foreground">No se han vinculado bienes muebles a este salón o espacio aún.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map(item => (
                <div key={item.id} className="bg-card border rounded-2xl p-4 shadow-sm flex gap-3.5 items-center">
                  {item.photoBase64 ? (
                    <img src={item.photoBase64} className="w-12 h-12 rounded-xl object-cover shrink-0" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Box className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{item.name || item.description}</p>
                    {item.name && item.description && item.description !== item.name && (
                      <p className="text-xs text-muted-foreground truncate italic">{item.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span>Serie: {item.serial_number || 'S/N'}</span>
                      <span>• {item.condition}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Cant: {item.quantity || 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Fixed Bottom Action for Signature / Resguardo */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] z-10">
        <div className="max-w-md mx-auto">
          {hasSigned ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p>Resguardo Firmado</p>
                  <p className="text-[10px] text-muted-foreground font-normal">
                    {new Date(existingVale.signed_at || existingVale.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowSignature(true)} className="h-9 text-xs rounded-xl font-bold">
                Actualizar Firma
              </Button>
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full h-14 text-base rounded-2xl shadow-xl font-bold bg-primary hover:bg-primary/90 flex items-center justify-center gap-2"
              onClick={() => setShowSignature(true)}
              disabled={items.length === 0}
            >
              <PenTool className="w-5 h-5" />
              <span>Firmar Acta de Conformidad / Resguardo</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

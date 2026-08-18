import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, X, CheckSquare, Square, Download, Filter, 
  Package, QrCode, Tag, Sparkles, Layers, FileText
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export default function LabelGeneratorModal({ items, locations, onClose }) {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState(new Set(items.map(i => i.id)));
  const [labelFormat, setLabelFormat] = useState('medium'); // 'small' (30/sheet) | 'medium' (10/sheet) | 'qr_card' (6/sheet)
  const [isGenerating, setIsGenerating] = useState(false);
  const [schoolName, setSchoolName] = useState('ESCUELA PRIMARIA OFICIAL');

  const locationMap = useMemo(() => {
    const m = {};
    locations.forEach(l => { m[l.id] = l; });
    return m;
  }, [locations]);

  const categories = useMemo(() => {
    return Array.from(new Set(items.map(i => i.category).filter(Boolean))).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (item.status === 'discarded' || item.sync_status === 'pending_delete') return false;
      const matchLoc = !selectedLocation || item.location_id === selectedLocation;
      const matchCat = !selectedCategory || item.category === selectedCategory;
      return matchLoc && matchCat;
    });
  }, [items, selectedLocation, selectedCategory]);

  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const toggleItem = (id) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedCount = useMemo(() => {
    return filteredItems.filter(i => selectedItemIds.has(i.id)).length;
  }, [filteredItems, selectedItemIds]);

  const generatePDFLabels = async () => {
    const targetItems = filteredItems.filter(i => selectedItemIds.has(i.id));
    if (targetItems.length === 0) return;

    setIsGenerating(true);

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
      const pageWidth = 215.9; // Letter width in mm
      const pageHeight = 279.4; // Letter height in mm

      if (labelFormat === 'small') {
        // 3 cols x 10 rows (30 per page - approx Avery 5160: 66.7mm x 25.4mm)
        const cols = 3;
        const rows = 10;
        const colWidth = 64;
        const rowHeight = 25;
        const marginLeft = 10;
        const marginTop = 12;
        const gapX = 3;
        const gapY = 2;

        let col = 0;
        let row = 0;
        let pageCount = 0;

        for (let i = 0; i < targetItems.length; i++) {
          const item = targetItems[i];
          const x = marginLeft + col * (colWidth + gapX);
          const y = marginTop + row * (rowHeight + gapY);

          // Generate QR code data URL
          const qrData = item.serial_number || item.id;
          const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });

          // Draw label box
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.roundedRect(x, y, colWidth, rowHeight, 1.5, 1.5);

          // Header
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 58, 138);
          doc.text('SIGRE — ACTIVO ESCOLAR', x + 2, y + 3.5);

          // QR Code Image
          doc.addImage(qrDataUrl, 'PNG', x + 2, y + 4.5, 18, 18);

          // Item Info
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(20, 20, 20);
          const title = item.name || item.description || 'Bien Mueble';
          const splitTitle = doc.splitTextToSize(title, colWidth - 23);
          doc.text(splitTitle.slice(0, 2), x + 21, y + 7);

          // Serial Number
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(70, 70, 70);
          doc.text(`Serie: ${item.serial_number || 'S/N'}`, x + 21, y + 14);

          // Location
          const locName = locationMap[item.location_id]?.name || 'Plantel General';
          doc.text(`Salón: ${locName.slice(0, 20)}`, x + 21, y + 18);

          // Next position
          col++;
          if (col >= cols) {
            col = 0;
            row++;
            if (row >= rows && i < targetItems.length - 1) {
              doc.addPage();
              pageCount++;
              row = 0;
            }
          }
        }
      } else {
        // Medium Labels (2 cols x 5 rows = 10 per page - 90mm x 48mm) - Heavy Duty
        const cols = 2;
        const rows = 5;
        const colWidth = 94;
        const rowHeight = 48;
        const marginLeft = 11;
        const marginTop = 15;
        const gapX = 6;
        const gapY = 4;

        let col = 0;
        let row = 0;

        for (let i = 0; i < targetItems.length; i++) {
          const item = targetItems[i];
          const x = marginLeft + col * (colWidth + gapX);
          const y = marginTop + row * (rowHeight + gapY);

          const qrData = item.serial_number || item.id;
          const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 0, width: 120 });

          // Outer card
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(0.4);
          doc.roundedRect(x, y, colWidth, rowHeight, 2.5, 2.5);

          // Header band
          doc.setFillColor(30, 58, 138);
          doc.roundedRect(x, y, colWidth, 9, 2.5, 2.5, 'F');
          doc.rect(x, y + 6, colWidth, 3, 'F'); // square bottom of header

          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(schoolName.toUpperCase(), x + 4, y + 4.5);
          doc.text('SIGRE — INVENTARIO', x + colWidth - 4, y + 4.5, { align: 'right' });

          // QR Code
          doc.addImage(qrDataUrl, 'PNG', x + 4, y + 12, 30, 30);

          // Content
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          const title = item.name || item.description || 'Bien Mueble';
          const splitTitle = doc.splitTextToSize(title, colWidth - 38);
          doc.text(splitTitle.slice(0, 2), x + 36, y + 16);

          // Detail / Specs
          if (item.name && item.description && item.description !== item.name) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(100, 116, 139);
            const splitDesc = doc.splitTextToSize(item.description, colWidth - 38);
            doc.text(splitDesc.slice(0, 1), x + 36, y + 23);
          }

          // Serial badge
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(x + 36, y + 26, colWidth - 40, 7, 1.5, 1.5, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(30, 58, 138);
          doc.text(`SERIE: ${item.serial_number || 'S/N'}`, x + 38, y + 31);

          // Category & Location footer
          doc.setFontSize(7);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          const locName = locationMap[item.location_id]?.name || 'Plantel General';
          doc.text(`Ubicación: ${locName}`, x + 36, y + 38);
          if (item.origin_provider) {
            doc.text(`Origen: ${item.origin_provider.slice(0, 22)}`, x + 36, y + 42);
          }

          col++;
          if (col >= cols) {
            col = 0;
            row++;
            if (row >= rows && i < targetItems.length - 1) {
              doc.addPage();
              row = 0;
            }
          }
        }
      }

      doc.save(`SIGRE_Planilla_Etiquetas_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Error generando etiquetas PDF:", err);
      alert("Ocurrió un error al generar las etiquetas.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b shrink-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Generador Masivo de Etiquetas</h2>
              <p className="text-xs text-muted-foreground">Genera planillas PDF con códigos QR y series para imprimir y pegar en bienes</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Filters & Configuration */}
        <div className="p-5 border-b bg-muted/10 space-y-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Filtrar por Aula</label>
              <Select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="h-9 text-xs">
                <option value="">— Todas las aulas ({items.length}) —</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Filtrar Categoría</label>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="h-9 text-xs">
                <option value="">— Todas ({categories.length}) —</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Formato de Etiqueta</label>
              <Select value={labelFormat} onChange={e => setLabelFormat(e.target.value)} className="h-9 text-xs">
                <option value="medium">🔖 Placa Institucional (10 por hoja)</option>
                <option value="small">🏷️ Compacta Estándar (30 por hoja)</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Encabezado Escolar en Etiqueta</label>
            <Input 
              value={schoolName} 
              onChange={e => setSchoolName(e.target.value)} 
              placeholder="Nombre del plantel escolar..."
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Item Selection List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              {selectedItemIds.size === filteredItems.length ? (
                <><CheckSquare className="w-4 h-4" /> Deseleccionar todos</>
              ) : (
                <><Square className="w-4 h-4" /> Seleccionar todos ({filteredItems.length})</>
              )}
            </button>
            <span className="text-xs font-semibold text-muted-foreground">
              {selectedCount} de {filteredItems.length} bienes seleccionados
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-muted/20 border border-dashed rounded-2xl text-muted-foreground text-xs font-medium">
              No hay bienes que coincidan con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredItems.map(item => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`border rounded-xl p-3 flex items-center gap-3 transition-all cursor-pointer select-none text-xs ${
                      isSelected ? 'bg-primary/5 border-primary/40 shadow-2xs' : 'bg-card opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="shrink-0 text-primary">
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{item.name || item.description}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Serie: <span className="font-semibold">{item.serial_number || 'S/N'}</span> • 📍 {locationMap[item.location_id]?.name || 'General'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t bg-card flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            className="flex-1 rounded-xl font-bold bg-primary hover:bg-primary/90 h-11 text-xs shadow-md gap-2"
            onClick={generatePDFLabels}
            disabled={selectedCount === 0 || isGenerating}
          >
            <Printer className="w-4 h-4" />
            {isGenerating ? "Generando Planilla PDF..." : `Descargar Planilla (${selectedCount} etiquetas)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

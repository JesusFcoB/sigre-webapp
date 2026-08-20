import React, { useState } from 'react'
import HelpTooltip from '@/components/ui/HelpTooltip'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, AlertCircle, Loader2, Download, DatabaseZap, X, HelpCircle } from "lucide-react"
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'

export default function ConciliationView() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState(null);
  
  // States for algorithm results
  const [coincidencias, setCoincidencias] = useState([]);
  const [faltantes, setFaltantes] = useState([]);
  const [sobrantes, setSobrantes] = useState([]);

  // States for Conflict Resolution
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictIndex, setConflictIndex] = useState(0);
  const [importing, setImporting] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      if (json.length === 0) {
        alert("El archivo Excel está vacío.");
        setIsProcessing(false);
        return;
      }

      const firstRowKeys = Object.keys(json[0]).map(k => k.trim());
      
      const requiredColumns = ['AULA', 'DESCRIPCIÓN', 'CANTIDAD', 'CONDICIÓN', 'NÚMERO DE SERIE', 'NÚMERO DE INVENTARIO'];
      
      const hasAllColumns = requiredColumns.every(col => 
        firstRowKeys.some(k => k.toUpperCase() === col)
      );
      
      if (!hasAllColumns) {
        alert("El archivo Excel no tiene el formato oficial de la SEP. Faltan columnas requeridas o tienen un nombre incorrecto (ej. AULA, DESCRIPCIÓN, NÚMERO DE INVENTARIO).");
        setIsProcessing(false);
        return;
      }

      const localItems = await db.items.toArray();
      
      const match = [];
      const missing = [];
      const surplus = [];

      const localItemsMap = new Map();
      localItems.forEach(item => {
        if (item.serial_number) {
          localItemsMap.set(item.serial_number.toString().trim().toLowerCase(), item);
        }
      });

      json.forEach((row) => {
        // Find exact keys disregarding case differences strictly on the known columns
        const getVal = (colName) => {
          const key = Object.keys(row).find(k => k.trim().toUpperCase() === colName);
          return key ? row[key] : undefined;
        };

        const folioStr = getVal('NÚMERO DE INVENTARIO') || getVal('NÚMERO DE SERIE');
        const articuloStr = getVal('DESCRIPCIÓN');
        const ubicacionStr = getVal('AULA');
        const cantidadVal = parseInt(getVal('CANTIDAD') || 1, 10);
        const condicionStr = getVal('CONDICIÓN') || 'nuevo';

        if (!folioStr) return; 
        
        const folioNormalizado = folioStr.toString().trim().toLowerCase();
        const localMatch = localItemsMap.get(folioNormalizado);

        if (localMatch) {
          match.push({
            folio: folioStr.toString(),
            articulo: articuloStr || localMatch.description,
            uEsperada: ubicacionStr || 'N/A',
            uReal: localMatch.location_id || 'Sin Asignar',
            cantidadExcel: cantidadVal,
            condicionExcel: condicionStr.toLowerCase(),
            localItem: localMatch,
            status: 'OK'
          });
          localItemsMap.delete(folioNormalizado);
        } else {
          missing.push({
            folio: folioStr.toString(),
            articulo: articuloStr || 'Desconocido',
            uEsperada: ubicacionStr || 'N/A',
            uReal: 'NO LOCALIZADO',
            cantidadExcel: cantidadVal,
            condicionExcel: condicionStr.toLowerCase(),
            status: 'FALTANTE'
          });
        }
      });

      localItemsMap.forEach((localItem, key) => {
        surplus.push({
          folio: localItem.serial_number || 'N/A',
          articulo: localItem.description,
          uEsperada: 'NO REGISTRADO EN SEC',
          uReal: localItem.location_id || 'Sin Asignar',
          status: 'SOBRANTE'
        });
      });

      setCoincidencias(match);
      setFaltantes(missing);
      setSobrantes(surplus);
      
      setFileData({
        name: file.name,
        total: json.length
      });

    } catch (error) {
      console.error("Error al procesar el archivo:", error);
      alert("Hubo un error al leer el archivo Excel. Asegúrate de que no esté dañado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetConciliation = () => {
    setFileData(null);
    setCoincidencias([]);
    setFaltantes([]);
    setSobrantes([]);
  };

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const formatDataForExcel = (list) => {
        return list.map(item => ({
          'Folio / Serie': item.folio,
          'Artículo': item.articulo,
          'Ubicación Esperada': item.uEsperada,
          'Ubicación Real': item.uReal,
          'Estatus': item.status
        }));
      };

      const wsCoincidencias = XLSX.utils.json_to_sheet(formatDataForExcel(coincidencias));
      const wsFaltantes = XLSX.utils.json_to_sheet(formatDataForExcel(faltantes));
      const wsSobrantes = XLSX.utils.json_to_sheet(formatDataForExcel(sobrantes));

      XLSX.utils.book_append_sheet(wb, wsCoincidencias, 'Coinciden');
      XLSX.utils.book_append_sheet(wb, wsFaltantes, 'Faltan');
      XLSX.utils.book_append_sheet(wb, wsSobrantes, 'Sobran');

      const dateStr = new Date().toISOString().split('T')[0];
      const baseName = fileData.name.replace(/\.[^/.]+$/, "");
      const fileName = `Conciliacion_${baseName}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  const handleStartImport = async () => {
    setImporting(true);
    
    // 1. Añadir automáticamente todos los FALTANTES (están en Excel pero no en BD)
    if (faltantes.length > 0) {
      const itemsToAdd = faltantes.map(f => ({
        id: crypto.randomUUID(),
        description: f.articulo,
        condition: ['nuevo', 'bueno', 'regular', 'malo'].includes(f.condicionExcel) ? f.condicionExcel : 'bueno',
        location_id: f.uEsperada,
        serial_number: f.folio,
        photoBase64: null,
        sync_status: 'pending_create',
        quantity: isNaN(f.cantidadExcel) ? 1 : f.cantidadExcel
      }));
      
      await db.items.bulkAdd(itemsToAdd);
    }

    // 2. Si hay coincidencias, abrimos el modal de conflictos para iterar
    if (coincidencias.length > 0) {
      setConflictIndex(0);
      setShowConflictModal(true);
    } else {
      finishImport();
    }
  };

  const finishImport = () => {
    setImporting(false);
    setShowConflictModal(false);
    alert("¡Importación Finalizada Exitosamente!");
    resetConciliation();
  };

  const resolveConflict = async (decision) => {
    const currentConflict = coincidencias[conflictIndex];
    const localItem = currentConflict.localItem;
    
    if (decision === 'sumar') {
      const newQuantity = (Number(localItem.quantity) || 1) + (Number(currentConflict.cantidadExcel) || 1);
      await db.items.update(localItem.id, {
        quantity: newQuantity,
        sync_status: 'pending_update'
      });
    } else if (decision === 'sobrescribir') {
      await db.items.update(localItem.id, {
        description: currentConflict.articulo,
        location_id: currentConflict.uEsperada,
        quantity: Number(currentConflict.cantidadExcel) || 1,
        sync_status: 'pending_update'
      });
    }
    // Si la decisión es 'conservar', no hacemos nada.

    if (conflictIndex + 1 < coincidencias.length) {
      setConflictIndex(conflictIndex + 1);
    } else {
      finishImport();
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24 relative">
      {/* Header */}
      <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            Módulo de Conciliación con Padrón Oficial SEC
            <HelpTooltip 
              title="Conciliación de Inventario" 
              text="Compara el archivo Excel oficial de la SEC (Secretaría de Educación) con los bienes registrados en tu dispositivo. Identifica coincidencias, faltantes y sobrantes para mantener tu inventario actualizado." 
            />
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Sincroniza e importa el padrón de la SEC</p>
        </div>
        {fileData && (
          <Button 
            onClick={handleStartImport} 
            disabled={importing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg shadow-primary/20"
          >
            <DatabaseZap className="w-5 h-5 mr-2" />
            Importar al Sistema
          </Button>
        )}
      </div>

      {!fileData ? (
        <div className="space-y-6">
          <Card className="border-dashed border-2 border-primary/40 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                {isProcessing ? (
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-primary" />
                )}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                {isProcessing ? "Analizando Padrón..." : "Sube el Padrón Oficial"}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-8">
                Sube el archivo Excel para compararlo automáticamente con tu base de datos e importarlo masivamente.
              </p>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Button size="lg" className="rounded-xl h-14 px-8 font-bold text-lg shadow-md pointer-events-none" disabled={isProcessing}>
                  <FileSpreadsheet className="w-5 h-5 mr-3" />
                  {isProcessing ? "Procesando..." : "Seleccionar Archivo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Excel Format Guide */}
          <Card className="shadow-sm border-t-4 border-t-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                Formato Requerido del Excel
              </CardTitle>
              <CardDescription>
                Para que el sistema acepte y procese correctamente tu archivo, debe contener <strong>exactamente</strong> las siguientes columnas en la primera fila (encabezados):
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-950/30 border-b">
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">AULA</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">DESCRIPCIÓN</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">CANTIDAD</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">CONDICIÓN</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">NÚMERO DE SERIE</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 dark:text-blue-400">NÚMERO DE INVENTARIO</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2 text-muted-foreground">Aula 1A</td>
                      <td className="px-3 py-2 text-muted-foreground">Escritorio tipo secretarial</td>
                      <td className="px-3 py-2 text-muted-foreground">1</td>
                      <td className="px-3 py-2 text-muted-foreground">Bueno</td>
                      <td className="px-3 py-2 text-muted-foreground">SN-00123</td>
                      <td className="px-3 py-2 text-muted-foreground">INV-2024-001</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground">Dirección</td>
                      <td className="px-3 py-2 text-muted-foreground">Minisplit 1 tonelada</td>
                      <td className="px-3 py-2 text-muted-foreground">1</td>
                      <td className="px-3 py-2 text-muted-foreground">Regular</td>
                      <td className="px-3 py-2 text-muted-foreground">MS-456789</td>
                      <td className="px-3 py-2 text-muted-foreground">INV-2024-002</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground">
                <p>• Los nombres de las columnas <strong>no</strong> distinguen mayúsculas de minúsculas.</p>
                <p>• La columna <strong>CONDICIÓN</strong> acepta: Nuevo, Bueno, Regular o Malo.</p>
                <p>• El sistema cruza los registros usando el <strong>NÚMERO DE INVENTARIO</strong> o <strong>NÚMERO DE SERIE</strong> como identificador principal.</p>
                <p>• Formatos aceptados: <strong>.xlsx</strong>, <strong>.xls</strong> y <strong>.csv</strong></p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-card border rounded-xl p-4 shadow-sm gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-2 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-bold text-sm">{fileData.name}</p>
                <p className="text-xs text-muted-foreground">Procesado con éxito • {fileData.total} registros evaluados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel} 
                className="text-primary border-primary/20 hover:bg-primary/10 font-bold"
              >
                <Download className="w-4 h-4 mr-2" />
                Reporte Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={resetConciliation} className="text-muted-foreground">
                <X className="w-4 h-4 mr-1" /> Limpiar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="coincidencias" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/80 p-1 overflow-hidden">
              <TabsTrigger value="coincidencias" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 truncate px-1">
                Conciliados (Match) ({coincidencias.length})
              </TabsTrigger>
              <TabsTrigger value="sobrantes" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-yellow-50 text-yellow-600 dark:data-[state=active]:bg-yellow-950 truncate px-1">
                Sobrantes en Escuela ({sobrantes.length})
              </TabsTrigger>
              <TabsTrigger value="faltantes" className="rounded-lg font-bold text-xs sm:text-sm data-[state=active]:bg-red-50 text-red-600 dark:data-[state=active]:bg-red-950 truncate px-1">
                Faltantes Oficiales ({faltantes.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 bg-card rounded-xl border shadow-sm overflow-hidden">
              <TabsContent value="coincidencias" className="m-0">
                <div className="p-4 bg-success/10 border-b flex items-start gap-2 text-success font-medium text-sm">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" />
                  Bienes que coinciden en el padrón estatal y en la existencia física local.
                </div>
                <DataTable data={coincidencias} />
              </TabsContent>
              
              <TabsContent value="sobrantes" className="m-0">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-100 dark:border-yellow-900/50 flex items-start gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  Equipos presentes en el plantel adquiridos por medios propios, donaciones o programas federales no reflejados en el sistema estatal.
                </div>
                <DataTable data={sobrantes} />
              </TabsContent>

              <TabsContent value="faltantes" className="m-0">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50 flex items-start gap-2 text-red-600 dark:text-red-400 font-medium text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  Bienes exigidos por el inventario estatal que no se encuentran registrados físicamente en la escuela.
                </div>
                <DataTable data={faltantes} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* Conflict Resolution Modal */}
      {showConflictModal && coincidencias.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border">
            <div className="bg-muted/50 p-4 border-b">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-primary" />
                Resolución de Conflictos
              </h3>
              <p className="text-xs text-muted-foreground">Registro {conflictIndex + 1} de {coincidencias.length}</p>
            </div>
            
            <div className="p-6">
              <p className="text-sm font-medium mb-4">El siguiente registro existe tanto en tu dispositivo como en el Excel. ¿Qué deseas hacer?</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-muted p-3 rounded-xl border">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Base Local</span>
                  <p className="font-bold mt-1 text-sm">{coincidencias[conflictIndex].localItem.description}</p>
                  <p className="text-xs mt-1">Ubicación: {coincidencias[conflictIndex].localItem.location_id}</p>
                  <p className="text-xs mt-1">Cantidad: {coincidencias[conflictIndex].localItem.quantity || 1}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl border border-primary/20">
                  <span className="text-xs font-bold text-primary uppercase">Datos de Excel</span>
                  <p className="font-bold mt-1 text-sm">{coincidencias[conflictIndex].articulo}</p>
                  <p className="text-xs mt-1">Ubicación: {coincidencias[conflictIndex].uEsperada}</p>
                  <p className="text-xs mt-1">Cantidad: {coincidencias[conflictIndex].cantidadExcel || 1}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button variant="default" className="w-full justify-start h-12 text-left bg-primary hover:bg-primary/90" onClick={() => resolveConflict('sobrescribir')}>
                  <DatabaseZap className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-bold">Sobrescribir con Excel</div>
                    <div className="text-[10px] opacity-80">Reemplazar los datos locales con la información del archivo</div>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-start h-12 text-left" onClick={() => resolveConflict('sumar')}>
                  <Check className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-bold">Sumar Cantidades</div>
                    <div className="text-[10px] opacity-80">Conservar el registro local pero sumar ambas cantidades</div>
                  </div>
                </Button>
                <Button variant="secondary" className="w-full justify-start h-12 text-left" onClick={() => resolveConflict('conservar')}>
                  <X className="w-4 h-4 mr-2 text-destructive" />
                  <div>
                    <div className="font-bold">Conservar Local (Ignorar Excel)</div>
                    <div className="text-[10px] opacity-80">No hacer ningún cambio en este registro</div>
                  </div>
                </Button>
              </div>
            </div>
            <div className="bg-muted p-3 flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Folio: {coincidencias[conflictIndex].folio}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DataTable({ data }) {
  if (data.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">No hay registros en esta categoría.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="font-bold">Folio / Serie</TableHead>
          <TableHead className="font-bold">Artículo</TableHead>
          <TableHead className="font-bold">Ubic. Esperada</TableHead>
          <TableHead className="font-bold">Ubic. Real</TableHead>
          <TableHead className="font-bold text-right">Estatus</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium text-xs">{row.folio}</TableCell>
            <TableCell>{row.articulo}</TableCell>
            <TableCell className="text-muted-foreground">{row.uEsperada}</TableCell>
            <TableCell className="font-medium">{row.uReal}</TableCell>
            <TableCell className="text-right">
              <Badge variant={
                row.status === 'OK' ? 'success' : 
                row.status === 'FALTANTE' ? 'destructive' : 'warning'
              }>
                {row.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

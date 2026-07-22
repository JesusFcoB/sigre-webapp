import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, AlertCircle, Loader2, Download } from "lucide-react"
import * as XLSX from 'xlsx'
import { db } from '@/lib/db'

export default function ConciliationView() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState(null);
  
  // States for algorithm results
  const [coincidencias, setCoincidencias] = useState([]);
  const [faltantes, setFaltantes] = useState([]);
  const [sobrantes, setSobrantes] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      // 1. Leer el archivo Excel
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convertir a JSON asumiendo que la fila 1 tiene los encabezados
      const json = XLSX.utils.sheet_to_json(worksheet);
      
      // 2. Traer los datos locales de Dexie
      const localItems = await db.items.toArray();
      
      // 3. Variables para agrupar resultados
      const match = [];
      const missing = [];
      const surplus = [];

      // Mapeo rápido de locales por número de serie/folio
      const localItemsMap = new Map();
      localItems.forEach(item => {
        if (item.serial_number) {
          localItemsMap.set(item.serial_number.toString().trim().toLowerCase(), item);
        }
      });

      // 4. Cruzar Excel contra Local
      json.forEach((row) => {
        // Adaptabilidad: buscar columnas probables
        const folioStr = row['Folio'] || row['folio'] || row['Folio Oficial'] || row['numero_inventario'] || row['No. Serie'] || row['serial_number'];
        const articuloStr = row['Articulo'] || row['articulo'] || row['Descripción'] || row['descripcion'];
        const ubicacionStr = row['Ubicacion'] || row['ubicacion'] || row['Lugar'];

        if (!folioStr) return; // Si no hay folio, saltar fila
        
        const folioNormalizado = folioStr.toString().trim().toLowerCase();
        const localMatch = localItemsMap.get(folioNormalizado);

        if (localMatch) {
          // Existe en ambos lados
          match.push({
            folio: folioStr,
            articulo: articuloStr || localMatch.description,
            uEsperada: ubicacionStr || 'N/A',
            uReal: localMatch.location_id || 'Sin Asignar',
            status: 'OK'
          });
          // Marcar como procesado para detectar sobrantes después
          localItemsMap.delete(folioNormalizado);
        } else {
          // En Excel pero NO localmente
          missing.push({
            folio: folioStr,
            articulo: articuloStr || 'Desconocido',
            uEsperada: ubicacionStr || 'N/A',
            uReal: 'NO LOCALIZADO',
            status: 'FALTANTE'
          });
        }
      });

      // 5. Los que quedaron en localItemsMap son sobrantes (Locales que no están en Excel)
      localItemsMap.forEach((localItem, key) => {
        surplus.push({
          folio: localItem.serial_number || 'N/A',
          articulo: localItem.description,
          uEsperada: 'NO REGISTRADO EN SEC',
          uReal: localItem.location_id || 'Sin Asignar',
          status: 'SOBRANTE'
        });
      });

      // Actualizar estados
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

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="py-4">
        <h2 className="text-2xl font-bold text-foreground">Módulo de Conciliación</h2>
        <p className="text-muted-foreground mt-1 text-sm">Sincroniza el inventario físico con el padrón de la SEC</p>
      </div>

      {!fileData ? (
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
              Sube el archivo Excel proporcionado por la SEC para compararlo automáticamente con tu base de datos física local.
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
            <p className="text-xs text-muted-foreground mt-4">Solo archivos .xlsx, .xls o .csv</p>
          </CardContent>
        </Card>
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
                className="text-primary border-primary/20 hover:bg-primary/10 font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Descargar Resultados
              </Button>
              <Button variant="ghost" size="sm" onClick={resetConciliation} className="text-muted-foreground">
                Limpiar
              </Button>
            </div>
          </div>

          <Tabs defaultValue="coincidencias" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/80 p-1">
              <TabsTrigger value="coincidencias" className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                Coinciden ({coincidencias.length})
              </TabsTrigger>
              <TabsTrigger value="faltantes" className="rounded-lg font-bold data-[state=active]:bg-red-50 text-red-600 dark:data-[state=active]:bg-red-950">
                Faltan ({faltantes.length})
              </TabsTrigger>
              <TabsTrigger value="sobrantes" className="rounded-lg font-bold data-[state=active]:bg-yellow-50 text-yellow-600 dark:data-[state=active]:bg-yellow-950">
                Sobran ({sobrantes.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 bg-card rounded-xl border shadow-sm overflow-hidden">
              <TabsContent value="coincidencias" className="m-0">
                <div className="p-4 bg-success/10 border-b flex items-center gap-2 text-success font-medium text-sm">
                  <Check className="w-5 h-5" />
                  Estos bienes coinciden entre lo escaneado y el padrón de la SEC.
                </div>
                <DataTable data={coincidencias} />
              </TabsContent>
              
              <TabsContent value="faltantes" className="m-0">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  Bienes reportados por la SEC que NO hemos encontrado físicamente.
                </div>
                <DataTable data={faltantes} />
              </TabsContent>
              
              <TabsContent value="sobrantes" className="m-0">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-100 dark:border-yellow-900/50 flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                  <AlertCircle className="w-5 h-5" />
                  Bienes escaneados localmente que NO aparecen en el Excel de la SEC.
                </div>
                <DataTable data={sobrantes} />
              </TabsContent>
            </div>
          </Tabs>
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

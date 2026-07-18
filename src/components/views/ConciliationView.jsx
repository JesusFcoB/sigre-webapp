import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UploadCloud, FileSpreadsheet, Check, AlertTriangle, AlertCircle } from "lucide-react"

const mockData = {
  coincidencias: [
    { folio: 'SEC-2026-001', articulo: 'Laptop HP ProBook', uEsperada: 'Aula 3A', uReal: 'Aula 3A', status: 'OK' },
    { folio: 'SEC-2026-042', articulo: 'Proyector Epson', uEsperada: 'Aula Medios', uReal: 'Aula Medios', status: 'OK' },
    { folio: 'SEC-2026-089', articulo: 'Minisplit Mirage 2T', uEsperada: 'Dirección', uReal: 'Dirección', status: 'OK' },
  ],
  faltantes: [
    { folio: 'SEC-2026-012', articulo: 'Impresora Brother', uEsperada: 'Sala Maestros', uReal: 'NO LOCALIZADO', status: 'FALTANTE' },
    { folio: 'SEC-2026-105', articulo: 'Archivero Metálico', uEsperada: 'Aula 1B', uReal: 'NO LOCALIZADO', status: 'FALTANTE' },
  ],
  sobrantes: [
    { folio: 'N/A', articulo: 'Escritorio Madera', uEsperada: 'N/A', uReal: 'Aula 3A', status: 'SOBRANTE' },
    { folio: 'N/A', articulo: 'Bocina Bluetooth', uEsperada: 'N/A', uReal: 'Canchas', status: 'SOBRANTE' },
  ]
}

export default function ConciliationView() {
  const [isUploaded, setIsUploaded] = useState(false);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="py-4">
        <h2 className="text-2xl font-bold text-foreground">Módulo de Conciliación</h2>
        <p className="text-muted-foreground mt-1 text-sm">Sincroniza el inventario físico con el padrón de la SEC</p>
      </div>

      {!isUploaded ? (
        <Card className="border-dashed border-2 border-primary/40 bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Sube el Padrón Oficial</h3>
            <p className="text-muted-foreground max-w-sm mb-8">
              Arrastra y suelta el archivo Excel (.xlsx) o CSV proporcionado por la SEC para compararlo con la base de datos interna de SIGRE.
            </p>
            <Button size="lg" className="rounded-xl h-14 px-8 font-bold text-lg shadow-md" onClick={() => setIsUploaded(true)}>
              <FileSpreadsheet className="w-5 h-5 mr-3" />
              Seleccionar Archivo
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Solo archivos .xlsx, .xls o .csv (Max 10MB)</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex items-center justify-between bg-card border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-success/20 p-2 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="font-bold text-sm">padron_sec_julio_2026.xlsx</p>
                <p className="text-xs text-muted-foreground">Procesado con éxito • 482 registros</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsUploaded(false)} className="text-muted-foreground">
              Cambiar
            </Button>
          </div>

          <Tabs defaultValue="coincidencias" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12 rounded-xl bg-muted/80 p-1">
              <TabsTrigger value="coincidencias" className="rounded-lg font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                Coincidencias (450)
              </TabsTrigger>
              <TabsTrigger value="faltantes" className="rounded-lg font-bold data-[state=active]:bg-red-50 text-red-600 dark:data-[state=active]:bg-red-950">
                Faltantes (12)
              </TabsTrigger>
              <TabsTrigger value="sobrantes" className="rounded-lg font-bold data-[state=active]:bg-yellow-50 text-yellow-600 dark:data-[state=active]:bg-yellow-950">
                Sobrantes (20)
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-4 bg-card rounded-xl border shadow-sm overflow-hidden">
              <TabsContent value="coincidencias" className="m-0">
                <div className="p-4 bg-success/10 border-b flex items-center gap-2 text-success font-medium text-sm">
                  <Check className="w-5 h-5" />
                  Estos bienes se encuentran exactamente donde el padrón oficial indica.
                </div>
                <DataTable data={mockData.coincidencias} />
              </TabsContent>
              
              <TabsContent value="faltantes" className="m-0">
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/50 flex items-center gap-2 text-red-600 dark:text-red-400 font-medium text-sm">
                  <AlertTriangle className="w-5 h-5" />
                  Bienes registrados en SEC pero no encontrados físicamente (¡Alerta Roja!).
                </div>
                <DataTable data={mockData.faltantes} />
              </TabsContent>
              
              <TabsContent value="sobrantes" className="m-0">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-100 dark:border-yellow-900/50 flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                  <AlertCircle className="w-5 h-5" />
                  Bienes encontrados físicamente pero que no aparecen en el padrón de la SEC.
                </div>
                <DataTable data={mockData.sobrantes} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  )
}

function DataTable({ data }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="font-bold">Folio Oficial</TableHead>
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

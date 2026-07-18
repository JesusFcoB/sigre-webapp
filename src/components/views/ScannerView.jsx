import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Camera, AlertCircle, FileText, CheckCircle2, MapPin, UserCircle } from "lucide-react"

export default function ScannerView({ navigateTo }) {
  const [scanned, setScanned] = useState(false);

  return (
    <div className="flex flex-col h-full gap-6 pb-24">
      {/* Header */}
      <div className="text-center py-4">
        <h2 className="text-2xl font-bold text-foreground">Escáner de Aulas</h2>
        <p className="text-muted-foreground mt-1 text-sm">Ubica el QR en el marco de la puerta</p>
      </div>

      {!scanned ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-8 animate-in fade-in duration-500">
          {/* Camera Viewfinder Simulation */}
          <div className="relative w-64 h-64 bg-black/5 rounded-3xl border-4 border-dashed border-primary/40 flex items-center justify-center overflow-hidden shadow-inner">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary m-4 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary m-4 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary m-4 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary m-4 rounded-br-lg" />
            
            <div className="flex flex-col items-center gap-3 text-primary/60">
              <QrCode className="w-16 h-16 animate-pulse" />
              <span className="font-medium text-sm">Escaneando...</span>
            </div>
            
            {/* Scanning line animation */}
            <div className="absolute top-0 w-full h-1 bg-primary/80 blur-[2px] animate-[scan_2s_ease-in-out_infinite]" 
                 style={{ animation: 'scan 2.5s ease-in-out infinite alternate' }} />
          </div>

          <div className="text-center px-8">
            <p className="text-sm text-muted-foreground mb-6 font-medium">
              Apunta al código QR ubicado en el marco de la puerta del salón.
            </p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
              <Button size="lg" className="h-14 text-lg rounded-xl shadow-md w-full" onClick={() => setScanned(true)}>
                <Camera className="mr-2 h-5 w-5" />
                Simular Escaneo
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-lg rounded-xl w-full border-primary/20 text-primary">
                Ingresar Manualmente
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500">
          
          <div className="w-full flex justify-center">
            <div className="bg-success/10 text-success px-4 py-2 rounded-full flex items-center gap-2 font-bold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              ¡QR Detectado con Éxito!
            </div>
          </div>

          <Card className="w-full border-primary/20 shadow-lg overflow-hidden">
            <div className="bg-primary p-4 text-primary-foreground flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-bold text-lg">Aula 3A</span>
              </div>
              <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0">
                Edificio B
              </Badge>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <UserCircle className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Responsable del Espacio</p>
                  <p className="font-bold text-foreground text-lg">Prof. Juan Pérez</p>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Total de Artículos:</span>
                <span className="font-bold text-lg">42</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border/50">
                <span className="text-muted-foreground">Última Auditoría:</span>
                <span className="font-semibold">Hace 15 días</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4 w-full mt-2">
            <Button size="lg" className="h-16 text-xl rounded-2xl shadow-lg w-full bg-blue-600 hover:bg-blue-700">
              <FileText className="mr-3 h-6 w-6" />
              Ver Inventario de Aula
            </Button>
            
            {/* The user requested to navigate to the report view */}
            <Button 
              size="lg" 
              variant="destructive" 
              className="h-16 text-xl rounded-2xl shadow-lg w-full"
              onClick={() => navigateTo('report')}
            >
              <AlertCircle className="mr-3 h-6 w-6" />
              Reportar Incidencia
            </Button>
            
            <Button variant="ghost" className="mt-2" onClick={() => setScanned(false)}>
              Escanear otro código
            </Button>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}} />
    </div>
  )
}

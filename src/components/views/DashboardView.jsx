import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Wifi, WifiOff, Box, AlertTriangle, CheckCircle2 } from "lucide-react"

const data = [
  { name: 'Nuevos', value: 120, color: '#3b82f6' }, // blue-500
  { name: 'Buenos', value: 350, color: '#22c55e' }, // green-500
  { name: 'Regulares', value: 80, color: '#eab308' }, // yellow-500
  { name: 'Malos', value: 25, color: '#ef4444' }, // red-500
];

export default function DashboardView() {
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-md -mx-4 -mt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">SIGRE</h1>
          <p className="text-primary-foreground/80 text-sm font-medium">Panel Directivo</p>
        </div>
        <button 
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
            isOnline ? 'bg-success text-success-foreground' : 'bg-warning text-warning-foreground'
          }`}
        >
          {isOnline ? (
            <><Wifi className="w-4 h-4" /> Conectado</>
          ) : (
            <><WifiOff className="w-4 h-4" /> Modo Offline</>
          )}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Bienes</CardTitle>
            <Box className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">575</div>
            <p className="text-xs text-muted-foreground mt-1">+12 registrados este mes</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Incidencias Pendientes</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">8</div>
            <p className="text-xs text-red-500/80 mt-1 font-medium">3 involucran Aires Acondicionados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Conciliación</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">94.2%</div>
            <p className="text-xs text-muted-foreground mt-1">Última revisión: Hace 2 días</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Estado Físico del Inventario</CardTitle>
          <CardDescription>Distribución de los bienes según su condición actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

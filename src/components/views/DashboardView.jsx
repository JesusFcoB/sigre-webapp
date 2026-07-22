import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Wifi, WifiOff, Box, AlertTriangle, CheckCircle2, List, X, ExternalLink, Edit2, Trash2, Moon, Sun, MonitorSmartphone, School, Users } from "lucide-react"

const data = [
  { name: 'Nuevos', value: 120, color: '#3b82f6' },
  { name: 'Buenos', value: 350, color: '#22c55e' },
  { name: 'Regulares', value: 80, color: '#eab308' },
  { name: 'Malos', value: 25, color: '#ef4444' },
];

export default function DashboardView({ navigateTo }) {
  const isOnline = useStore((state) => state.isOnline)
  const setOnlineStatus = useStore((state) => state.setOnlineStatus)
  const setEditingItem = useStore((state) => state.setEditingItem)
  const setEditingTicket = useStore((state) => state.setEditingTicket)
  const theme = useStore((state) => state.theme)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const role = useStore((state) => state.role)

  // Consultas en vivo a Dexie
  const totalItemsCount = useLiveQuery(() => db.items.count()) || 0;
  const pendingItemsCount = useLiveQuery(() => db.items.where('sync_status').equals('pending_create').count()) || 0;
  
  const totalTicketsCount = useLiveQuery(() => db.tickets.count()) || 0;
  const pendingTicketsCount = useLiveQuery(() => db.tickets.where('sync_status').equals('pending').count()) || 0;

  const totalLocationsCount = useLiveQuery(() => db.locations.count()) || 0;

  const allItems = useLiveQuery(() => db.items.reverse().sortBy('id')) || [];
  const allTickets = useLiveQuery(() => db.tickets.reverse().sortBy('id')) || [];

  const handleEditItem = (item) => {
    setEditingItem(item);
    navigateTo('assets');
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro local permanentemente?")) {
      await db.items.delete(id);
    }
  };

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    navigateTo('report');
  };

  const handleDeleteTicket = async (id) => {
    if (window.confirm("¿Seguro que deseas cancelar este reporte local permanentemente?")) {
      await db.tickets.delete(id);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24 relative">
      
      {/* Header */}
      <div className="flex flex-col gap-4 bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-md -mx-4 -mt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SIGRE</h1>
            <p className="text-primary-foreground/80 text-sm font-medium">Panel Directivo</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary-foreground hover:bg-white/20" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <div 
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold transition-colors cursor-pointer ${
                isOnline ? 'bg-success text-success-foreground hover:bg-success/90' : 'bg-warning text-warning-foreground hover:bg-warning/90'
              }`}
              onClick={() => setOnlineStatus(!isOnline)}
              title="Clic para simular pérdida de conexión"
            >
              {isOnline ? (
                <><Wifi className="w-4 h-4" /> Conectado</>
              ) : (
                <><WifiOff className="w-4 h-4" /> Modo Offline</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Bienes</CardTitle>
            <Box className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalItemsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingItemsCount > 0 ? (
                <span className="text-warning-foreground font-semibold">({pendingItemsCount} sin sincronizar)</span>
              ) : (
                "Sincronizado"
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm bg-red-50/50 dark:bg-red-950/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Incidencias Pendientes</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{totalTicketsCount}</div>
            <p className="text-xs text-red-500/80 mt-1 font-medium">
              {pendingTicketsCount > 0 ? `${pendingTicketsCount} pendientes de envío` : "Todos enviados a la nube"}
            </p>
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

        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:border-purple-600 transition-all cursor-pointer hover:shadow-md" onClick={() => navigateTo('locations')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gestión de Aulas</CardTitle>
            <School className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalLocationsCount}</div>
            <p className="text-xs text-purple-500 font-bold mt-1 hover:underline flex items-center gap-1">
              Administrar aulas <ExternalLink className="w-3 h-3" />
            </p>
          </CardContent>
        </Card>

        {role === 'director' && (
          <Card className="border-l-4 border-l-orange-500 shadow-sm hover:border-orange-600 transition-all cursor-pointer hover:shadow-md" onClick={() => navigateTo('users')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Usuarios Locales</CardTitle>
              <Users className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">Gestión</div>
              <p className="text-xs text-orange-500 font-bold mt-1 hover:underline flex items-center gap-1">
                Altas y bajas <ExternalLink className="w-3 h-3" />
              </p>
            </CardContent>
          </Card>
        )}
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
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}
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

      {/* Bitacora Global Inline Table */}
      <Card className="shadow-sm border-t-4 border-t-primary mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <List className="w-5 h-5 text-primary" />
            Bitácora Global
          </CardTitle>
          <CardDescription>Visualiza y administra todos los registros guardados en tu dispositivo local.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bienes" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6 h-12 bg-muted/50 rounded-xl p-1">
              <TabsTrigger value="bienes" className="rounded-lg text-sm font-bold data-[state=active]:shadow-sm">
                Bienes ({allItems.length})
              </TabsTrigger>
              <TabsTrigger value="incidencias" className="rounded-lg text-sm font-bold data-[state=active]:shadow-sm">
                Incidencias ({allTickets.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="bienes" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col gap-3">
                {allItems.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No hay bienes registrados.</p>
                ) : (
                  allItems.map(item => (
                    <div key={item.id} className="bg-card border rounded-xl p-4 shadow-sm flex gap-4 items-center transition-all hover:border-primary/30">
                      {item.photoBase64 ? (
                        <img src={item.photoBase64} className="w-14 h-14 rounded-xl object-cover shrink-0 border" alt="Item" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 border border-dashed">
                          <Box className="w-6 h-6 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-base truncate text-foreground">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground font-medium">
                            {item.serial_number || 'S/N'} • {item.condition}
                          </p>
                          {item.quantity && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Cant: {item.quantity}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={item.sync_status === 'synced' ? 'success' : 'outline'} className="text-[10px] font-bold">
                          {item.sync_status === 'synced' ? 'En Nube' : 'Pendiente'}
                        </Badge>
                        <div className="flex gap-1.5 mt-1">
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => handleEditItem(item)}>
                            <Edit2 className="w-3.5 h-3.5 text-foreground" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 shadow-sm dark:bg-red-950/30 dark:hover:bg-red-900/50" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="incidencias" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex flex-col gap-3">
                {allTickets.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No hay tickets registrados.</p>
                ) : (
                  allTickets.map(ticket => (
                    <div key={ticket.id} className="bg-card border rounded-xl p-4 shadow-sm flex gap-4 items-center transition-all hover:border-red-500/30">
                      {ticket.photoBase64 ? (
                        <img src={ticket.photoBase64} className="w-14 h-14 rounded-xl object-cover shrink-0 border" alt="Ticket" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center shrink-0 border border-dashed border-red-200 dark:border-red-900/30">
                          <AlertTriangle className="w-6 h-6 text-red-500/50" />
                        </div>
                      )}
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm truncate uppercase text-red-600 dark:text-red-400">{ticket.issue_type}</p>
                        <p className="text-sm text-foreground truncate mt-0.5 font-medium">{ticket.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={ticket.sync_status === 'synced' ? 'success' : 'outline'} className="text-[10px] font-bold">
                          {ticket.sync_status === 'synced' ? 'En Nube' : 'Pendiente'}
                        </Badge>
                        <div className="flex gap-1.5 mt-1">
                          <Button variant="secondary" size="icon" className="h-8 w-8 rounded-lg shadow-sm" onClick={() => handleEditTicket(ticket)}>
                            <Edit2 className="w-3.5 h-3.5 text-foreground" />
                          </Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 shadow-sm dark:bg-red-950/30 dark:hover:bg-red-900/50" onClick={() => handleDeleteTicket(ticket.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

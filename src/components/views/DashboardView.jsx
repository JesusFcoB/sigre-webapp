import React, { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Wifi, WifiOff, Box, AlertTriangle, CheckCircle2, List, Edit2, Trash2, Moon, Sun, HelpCircle } from "lucide-react"

import HelpTooltip from '@/components/ui/HelpTooltip'

export default function DashboardView({ navigateTo }) {
  const isOnline = useStore((state) => state.isOnline)
  const setOnlineStatus = useStore((state) => state.setOnlineStatus)
  const setEditingItem = useStore((state) => state.setEditingItem)
  const setEditingTicket = useStore((state) => state.setEditingTicket)
  const theme = useStore((state) => state.theme)
  const toggleTheme = useStore((state) => state.toggleTheme)
  const role = (useStore((state) => state.role) || '').toLowerCase()

  const totalItemsCount = useLiveQuery(() => db.items.count()) || 0;
  const pendingItemsCount = useLiveQuery(() => db.items.where('sync_status').equals('pending_create').count()) || 0;
  const totalTicketsCount = useLiveQuery(() => db.tickets.count()) || 0;
  const pendingTicketsCount = useLiveQuery(() => db.tickets.where('sync_status').equals('pending').count()) || 0;

  const syncedItemsCount = useLiveQuery(() => db.items.where('sync_status').equals('synced').count()) || 0;
  const conciliationRate = totalItemsCount > 0 ? Math.round((syncedItemsCount / totalItemsCount) * 100) : 0;

  const allItems = useLiveQuery(() => db.items.orderBy('id').reverse().toArray()) || [];
  const allTickets = useLiveQuery(() => db.tickets.orderBy('id').reverse().toArray()) || [];

  const data = [
    { name: 'Nuevos', value: allItems.filter(i => (i.condition || '').toLowerCase() === 'nuevo').length, color: '#3b82f6' },
    { name: 'Buenos', value: allItems.filter(i => (i.condition || '').toLowerCase() === 'bueno').length, color: '#22c55e' },
    { name: 'Regulares', value: allItems.filter(i => (i.condition || '').toLowerCase() === 'regular').length, color: '#eab308' },
    { name: 'Malos', value: allItems.filter(i => (i.condition || '').toLowerCase() === 'malo').length, color: '#ef4444' },
  ];

  const handleEditItem = (item) => {
    setEditingItem(item);
    navigateTo('assets');
  };

  const handleDeleteItem = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este registro permanente?")) {
      const record = await db.items.get(id);
      if (record && (record.sync_status === 'pending_create' || record.sync_status === 'pending')) {
        await db.items.delete(id);
      } else {
        await db.items.update(id, { sync_status: 'pending_delete' });
      }
      if (navigator.onLine) { import('@/lib/sync').then(s => s.syncAll()); }
    }
  };

  const handleEditTicket = (ticket) => {
    setEditingTicket(ticket);
    navigateTo('report');
  };

  const handleDeleteTicket = async (id) => {
    if (window.confirm("¿Seguro que deseas cancelar este reporte permanente?")) {
      const record = await db.tickets.get(id);
      if (record && (record.sync_status === 'pending_create' || record.sync_status === 'pending')) {
        await db.tickets.delete(id);
      } else {
        await db.tickets.update(id, { sync_status: 'pending_delete' });
      }
      if (navigator.onLine) { import('@/lib/sync').then(s => s.syncAll()); }
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-6 relative">
      
      {/* Header */}
      <div className="flex flex-col gap-4 bg-primary text-primary-foreground p-6 rounded-b-3xl shadow-md -mx-4 -mt-4 md:rounded-2xl md:mx-0 md:mt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              SIGRE
              <HelpTooltip 
                inverted={true}
                title="Panel Principal de Control" 
                text="Vista ejecutiva del inventario escolar. Visualiza métricas generales, estado físico del equipo registrado y la bitácora local de registros en tiempo real." 
              />
            </h1>
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

      {/* Desktop: 2 columns | Mobile: stacked */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Left Column: Metrics + Chart */}
        <div className="flex flex-col gap-6 lg:w-[400px] lg:shrink-0">
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="border-l-4 border-l-blue-500 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Bienes</CardTitle>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500">
                  <Box className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-foreground tracking-tight">{totalItemsCount}</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  {pendingItemsCount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
                      {pendingItemsCount} sin sincronizar
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ Todo sincronizado</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-2xs bg-red-50/40 dark:bg-red-950/20 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Incidencias Pendientes</CardTitle>
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tight">{totalTicketsCount}</div>
                <p className="text-xs text-red-500/90 mt-1 font-semibold">
                  {pendingTicketsCount > 0 ? `${pendingTicketsCount} pendientes de envío` : "Todos enviados a la nube"}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Tasa de Conciliación
                  <HelpTooltip 
                    title="Tasa de Sincronización" 
                    text="Porcentaje de bienes sincronizados con la nube respecto al total registrado. 100% indica que todo tu inventario está respaldado." 
                  />
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-black tracking-tight ${conciliationRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : conciliationRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{conciliationRate}%</div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">{syncedItemsCount} de {totalItemsCount} bienes sincronizados</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card className="shadow-2xs border-t-2 border-t-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Estado Físico del Inventario</CardTitle>
              <CardDescription className="text-xs">Distribución por condición actual.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="barGradNuevo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barGradBueno" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#047857" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barGradRegular" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#b45309" stopOpacity={0.8} />
                      </linearGradient>
                      <linearGradient id="barGradMalo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: theme === 'dark' ? '#0f172a' : '#fff', color: theme === 'dark' ? '#f8fafc' : '#0f172a' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={36}>
                      {data.map((entry, index) => {
                        const gradId = entry.name === 'Nuevo' ? 'url(#barGradNuevo)' : entry.name === 'Bueno' ? 'url(#barGradBueno)' : entry.name === 'Regular' ? 'url(#barGradRegular)' : 'url(#barGradMalo)';
                        return <Cell key={`cell-${index}`} fill={gradId} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Bitácora Global */}
        <div className="flex-1 min-w-0">
          <Card className="shadow-sm border-t-4 border-t-primary h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <List className="w-5 h-5 text-primary" />
                Bitácora Global
              </CardTitle>
              <CardDescription>Registros guardados en tu dispositivo local.</CardDescription>
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
                  <div className="flex flex-col gap-3 max-h-[60vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
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
                              {role === 'director' && (
                                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 shadow-sm dark:bg-red-950/30 dark:hover:bg-red-900/50" onClick={() => handleDeleteItem(item.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="incidencias" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-col gap-3 max-h-[60vh] lg:max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
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
                              {role === 'director' && (
                                <Button variant="destructive" size="icon" className="h-8 w-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 shadow-sm dark:bg-red-950/30 dark:hover:bg-red-900/50" onClick={() => handleDeleteTicket(ticket.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
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
      </div>
    </div>
  )
}

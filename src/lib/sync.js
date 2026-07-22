import { db } from './db'
import { supabase } from './supabase'

// Función auxiliar para saber si estamos usando el placeholder
const isMocking = supabase.supabaseUrl.includes('placeholder');

export async function syncTicketsToSupabase() {
  console.log("Iniciando sincronización de tickets...")
  
  try {
    const pendingTickets = await db.tickets.where('sync_status').equals('pending').toArray()
    
    if (pendingTickets.length === 0) {
      return 0; 
    }

    console.log(`Encontrados ${pendingTickets.length} tickets pendientes.`)

    for (const ticket of pendingTickets) {
      const { id, sync_status, ...ticketData } = ticket;

      if (isMocking) {
        // Simular latencia de red de 1 segundo para el prototipo
        await new Promise(resolve => setTimeout(resolve, 800));
        await db.tickets.update(ticket.id, { sync_status: 'synced' });
        console.log(`[MOCK] Ticket ${ticket.id} sincronizado exitosamente.`);
      } else {
        // Conexión real a Supabase
        const { error } = await supabase.from('tickets').insert([ticketData])
        if (error) {
          console.error("Error al sincronizar ticket a Supabase:", error)
        } else {
          await db.tickets.update(ticket.id, { sync_status: 'synced' })
        }
      }
    }
    
    return pendingTickets.length;
  } catch (error) {
    console.error("Error crítico durante la sincronización:", error)
    return 0;
  }
}

export async function syncItemsToSupabase() {
  console.log("Iniciando sincronización de bienes (items)...")
  
  try {
    const pendingItems = await db.items.where('sync_status').equals('pending_create').toArray()
    
    if (pendingItems.length === 0) {
      return 0; 
    }

    console.log(`Encontrados ${pendingItems.length} bienes pendientes.`)

    for (const item of pendingItems) {
      const { id, sync_status, ...itemData } = item;

      if (isMocking) {
        await new Promise(resolve => setTimeout(resolve, 800));
        await db.items.update(item.id, { sync_status: 'synced' });
        console.log(`[MOCK] Bien ${item.id} sincronizado exitosamente.`);
      } else {
        const { error } = await supabase.from('items').insert([itemData])
        if (error) {
          console.error("Error al sincronizar bien a Supabase:", error)
        } else {
          await db.items.update(item.id, { sync_status: 'synced' })
        }
      }
    }
    
    return pendingItems.length;
  } catch (error) {
    console.error("Error crítico durante la sincronización de bienes:", error)
    return 0;
  }
}

export async function syncValesToSupabase() {
  console.log("Iniciando sincronización de vales de resguardo...")
  
  try {
    const pendingVales = await db.vales.where('sync_status').equals('pending').toArray()
    
    if (pendingVales.length === 0) {
      return 0; 
    }

    console.log(`Encontrados ${pendingVales.length} vales pendientes.`)

    for (const vale of pendingVales) {
      const { id, sync_status, ...valeData } = vale;

      if (isMocking) {
        await new Promise(resolve => setTimeout(resolve, 800));
        await db.vales.update(vale.id, { sync_status: 'synced' });
        console.log(`[MOCK] Vale ${vale.id} sincronizado exitosamente.`);
      } else {
        const { error } = await supabase.from('vales').insert([valeData])
        if (error) {
          console.error("Error al sincronizar vale a Supabase:", error)
        } else {
          await db.vales.update(vale.id, { sync_status: 'synced' })
        }
      }
    }
    
    return pendingVales.length;
  } catch (error) {
    console.error("Error crítico durante la sincronización de vales:", error)
    return 0;
  }
}

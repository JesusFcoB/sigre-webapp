import { db } from './db'
import { supabase } from './supabase'

// Función auxiliar para saber si estamos usando el placeholder
const isMocking = supabase.supabaseUrl.includes('placeholder');

export async function syncAll() {
  console.log("Iniciando sincronización bidireccional...");
  if (isMocking) {
    console.log("[MOCK] Sincronización omitida (Credenciales de Supabase no configuradas).");
    return { success: false, message: "Modo Local" };
  }

  if (!navigator.onLine) {
    return { success: false, message: "Sin conexión" };
  }

  try {
    // 1. PUSH local changes to Supabase
    await pushTable('locations');
    await pushTable('items');
    await pushTable('tickets');
    await pushTable('vales');

    // 2. PULL remote changes from Supabase
    await pullTable('locations');
    await pullTable('items');
    await pullTable('tickets');
    await pullTable('vales');

    console.log("Sincronización completada exitosamente.");
    return { success: true, message: "Sincronizado" };
  } catch (error) {
    console.error("Error crítico durante la sincronización:", error);
    return { success: false, message: "Error al sincronizar" };
  }
}

async function pushTable(tableName) {
  const table = db[tableName];
  if (!table) return;

  // Push Creates
  const pendingCreates = await table.where('sync_status').equals('pending_create').or('sync_status').equals('pending').toArray();
  for (const record of pendingCreates) {
    const { id, sync_status, ...data } = record;
    
    // For tickets and vales (SERIAL), omit ID so Supabase generates it. 
    // For items and locations (UUID), include the ID.
    const insertData = (tableName === 'tickets' || tableName === 'vales') ? data : { id, ...data };
    
    const { data: insertedData, error } = await supabase.from(tableName).insert([insertData]).select();
    
    if (!error && insertedData && insertedData.length > 0) {
      if (tableName === 'tickets' || tableName === 'vales') {
        await table.delete(id); // Borrar ID local temporal
        await table.put({ ...insertedData[0], sync_status: 'synced' }); // Guardar ID real de Supabase
      } else {
        await table.update(id, { sync_status: 'synced' });
      }
    } else {
      console.error(`Error push create ${tableName}:`, error);
    }
  }

  // Push Updates
  const pendingUpdates = await table.where('sync_status').equals('pending_update').toArray();
  for (const record of pendingUpdates) {
    const { id, sync_status, ...data } = record;
    const { error } = await supabase.from(tableName).update(data).eq('id', id);
    if (!error) {
      await table.update(id, { sync_status: 'synced' });
    } else {
      console.error(`Error push update ${tableName}:`, error);
    }
  }

  // Push Deletes
  const pendingDeletes = await table.where('sync_status').equals('pending_delete').toArray();
  for (const record of pendingDeletes) {
    const { error } = await supabase.from(tableName).delete().eq('id', record.id);
    if (!error) {
      await table.delete(record.id); // Borrar localmente de Dexie
    } else {
      console.error(`Error push delete ${tableName}:`, error);
    }
  }
}

async function pullTable(tableName) {
  const table = db[tableName];
  if (!table) return;

  const { data, error } = await supabase.from(tableName).select('*');
  if (error) {
    console.error(`Error pull ${tableName}:`, error);
    return;
  }

  if (data) {
    const localRecordsMap = new Map();
    await table.each(record => {
      localRecordsMap.set(record.id, record);
    });

    const toPut = [];
    for (const remoteRecord of data) {
      const localRecord = localRecordsMap.get(remoteRecord.id);
      // Solo sobrescribimos si no hay cambios locales pendientes
      if (!localRecord || localRecord.sync_status === 'synced') {
        toPut.push({ ...remoteRecord, sync_status: 'synced' });
      }
    }

    if (toPut.length > 0) {
      await table.bulkPut(toPut);
    }
    
    // Si hay un registro local 'synced' que ya no existe en la nube, lo borramos localmente
    const remoteIds = new Set(data.map(r => r.id));
    const toDelete = [];
    localRecordsMap.forEach((localRecord, id) => {
      if (localRecord.sync_status === 'synced' && !remoteIds.has(id)) {
        toDelete.push(id);
      }
    });
    if (toDelete.length > 0) {
      await table.bulkDelete(toDelete);
    }
  }
}

// Mantener compatibilidad con llamadas viejas
export const syncItemsToSupabase = syncAll;
export const syncTicketsToSupabase = syncAll;
export const syncValesToSupabase = syncAll;

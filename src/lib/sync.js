import { db } from './db'
import { supabase } from './supabase'

const isMocking = supabase.supabaseUrl.includes('placeholder');

function mapLocalToRemote(tableName, data) {
  const mapped = { ...data };
  if (tableName === 'items') {
    if ('serial_number' in mapped) { mapped.official_inventory_number = mapped.serial_number; delete mapped.serial_number; }
    if ('photoBase64' in mapped) { mapped.image = mapped.photoBase64; delete mapped.photoBase64; }
    if ('discard_reason' in mapped) { mapped.disposal_reason = mapped.discard_reason; delete mapped.discard_reason; }
    if ('discard_date' in mapped) { mapped.disposal_date = mapped.discard_date; delete mapped.discard_date; }
    delete mapped.discard_location;
    delete mapped.discard_photoBase64;
    delete mapped.invoiceBase64;
  } else if (tableName === 'tickets') {
    if ('photoBase64' in mapped) { mapped.image = mapped.photoBase64; delete mapped.photoBase64; }
    if (mapped.location_id === 'temp-location-id') mapped.location_id = null;
  } else if (tableName === 'vales') {
    if ('signatureBase64' in mapped) { mapped.signature_base64 = mapped.signatureBase64; delete mapped.signatureBase64; }
    // En local vales usan item_id, en remote la DB usa un JSONB de items, adaptémoslo si es necesario:
    if ('item_id' in mapped) {
       mapped.items = [mapped.item_id]; // Convertir al schema de Supabase (espera un array)
       delete mapped.item_id;
    }
  }
  return mapped;
}

function mapRemoteToLocal(tableName, data) {
  const mapped = { ...data };
  if (tableName === 'items') {
    if ('official_inventory_number' in mapped) { mapped.serial_number = mapped.official_inventory_number; delete mapped.official_inventory_number; }
    if ('image' in mapped) { mapped.photoBase64 = mapped.image; delete mapped.image; }
    if ('disposal_reason' in mapped) { mapped.discard_reason = mapped.disposal_reason; delete mapped.disposal_reason; }
    if ('disposal_date' in mapped) { mapped.discard_date = mapped.disposal_date; delete mapped.disposal_date; }
  } else if (tableName === 'tickets') {
    if ('image' in mapped) { mapped.photoBase64 = mapped.image; delete mapped.image; }
  } else if (tableName === 'vales') {
    if ('signature_base64' in mapped) { mapped.signatureBase64 = mapped.signature_base64; delete mapped.signature_base64; }
    if (mapped.items && Array.isArray(mapped.items) && mapped.items.length > 0) {
       mapped.item_id = mapped.items[0];
       delete mapped.items;
    }
  }
  return mapped;
}

async function uploadBase64(bucket, fileName, base64Str) {
  if (!base64Str || !base64Str.startsWith('data:image')) return base64Str;
  try {
    const arr = base64Str.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return base64Str;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    const { error } = await supabase.storage.from(bucket).upload(fileName, blob, { upsert: true, contentType: mime });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image to storage:', error);
    return base64Str; // Fallback
  }
}

export async function syncAll() {
  console.log("Iniciando sincronización bidireccional...");
  if (isMocking) return { success: false, message: "Modo Local" };
  if (!navigator.onLine) return { success: false, message: "Sin conexión" };

  try {
    await pushTable('locations');
    await pushTable('items');
    await pushTable('tickets');
    await pushTable('vales');

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

  const allRecords = await table.toArray();
  for (const record of allRecords) {
    if (!record.sync_status) {
      await table.update(record.id, { sync_status: 'pending_create' });
    }
  }

  const pendingCreates = await table.where('sync_status').equals('pending_create').or('sync_status').equals('pending').toArray();
  for (const record of pendingCreates) {
    const { id, sync_status, ...data } = record;
    
    if (data.photoBase64 && data.photoBase64.startsWith('data:image')) {
      data.photoBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_photo.webp`, data.photoBase64);
    }
    if (data.invoiceBase64 && data.invoiceBase64.startsWith('data:image')) {
      data.invoiceBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_invoice.webp`, data.invoiceBase64);
    }
    if (data.signatureBase64 && data.signatureBase64.startsWith('data:image')) {
      data.signatureBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_signature.png`, data.signatureBase64);
    }

    const insertData = (tableName === 'tickets' || tableName === 'vales') ? data : { id, ...data };
    const remoteData = mapLocalToRemote(tableName, insertData);
    
    const { data: insertedData, error } = await supabase.from(tableName).insert([remoteData]).select();
    
    if (!error && insertedData && insertedData.length > 0) {
      if (tableName === 'tickets' || tableName === 'vales') {
        await table.delete(id); 
        await table.put({ ...mapRemoteToLocal(tableName, insertedData[0]), sync_status: 'synced' }); 
      } else {
        await table.update(id, { sync_status: 'synced' });
      }
    } else {
      console.error(`Error push create ${tableName}:`, error);
    }
  }

  const pendingUpdates = await table.where('sync_status').equals('pending_update').toArray();
  for (const record of pendingUpdates) {
    const { id, sync_status, ...data } = record;
    
    if (data.photoBase64 && data.photoBase64.startsWith('data:image')) {
      data.photoBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_photo.webp`, data.photoBase64);
    }
    if (data.invoiceBase64 && data.invoiceBase64.startsWith('data:image')) {
      data.invoiceBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_invoice.webp`, data.invoiceBase64);
    }
    if (data.signatureBase64 && data.signatureBase64.startsWith('data:image')) {
      data.signatureBase64 = await uploadBase64('sigre-images', `${tableName}/${id}_signature.png`, data.signatureBase64);
    }

    const remoteData = mapLocalToRemote(tableName, data);
    const { error } = await supabase.from(tableName).update(remoteData).eq('id', id);
    if (!error) {
      await table.update(id, { sync_status: 'synced' });
    } else {
      console.error(`Error push update ${tableName}:`, error);
    }
  }

  const pendingDeletes = await table.where('sync_status').equals('pending_delete').toArray();
  for (const record of pendingDeletes) {
    const { error } = await supabase.from(tableName).delete().eq('id', record.id);
    if (!error) {
      await table.delete(record.id); 
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
      const localData = mapRemoteToLocal(tableName, remoteRecord);
      const localRecord = localRecordsMap.get(localData.id);
      if (!localRecord || localRecord.sync_status === 'synced') {
        toPut.push({ ...localData, sync_status: 'synced' });
      }
    }

    if (toPut.length > 0) {
      await table.bulkPut(toPut);
    }
    
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

export const syncItemsToSupabase = syncAll;
export const syncTicketsToSupabase = syncAll;
export const syncValesToSupabase = syncAll;

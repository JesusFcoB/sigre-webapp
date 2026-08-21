import Dexie from 'dexie';

export const db = new Dexie('SigreLocalDB');

// Define the local database schema
db.version(2).stores({
  items: 'id, official_inventory_number, description, condition, location_id, sync_status, quantity', // sync_status: 'synced', 'pending_create', 'pending_update'
  locations: 'id, name, responsible_name',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at',
  vales: '++id, location_id, signatureBase64, signed_at, sync_status'
});

// v3: Add category field to items
db.version(3).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status',
  locations: 'id, name, responsible_name',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at',
  vales: '++id, location_id, signatureBase64, signed_at, sync_status'
});

// v4: Add status for items and update vales schema
db.version(4).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at',
  vales: '++id, person_name, start_date, end_date, sync_status'
});

// v5: Add sync_status index to locations for bidirectional sync
db.version(5).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at',
  vales: '++id, person_name, start_date, end_date, sync_status'
});

// v6: Add status and solved_at to tickets
db.version(6).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at, status, solved_at',
  vales: '++id, person_name, start_date, end_date, sync_status'
});
// v7: Add specific_location to tickets
db.version(7).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, specific_location, sync_status, reported_at, status, solved_at',
  vales: '++id, person_name, start_date, end_date, sync_status'
});

// v8: Enhanced vales with loan request workflow (vale_status, requested_by, item_id index)
// vale_status: 'pending_approval' | 'active' | 'completed' | 'rejected'
db.version(8).stores({
  items: 'id, official_inventory_number, description, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, specific_location, sync_status, reported_at, status, solved_at',
  vales: '++id, person_name, start_date, end_date, sync_status, vale_status, requested_by, item_id'
});

// v9: Add name index for grouping, enforce individual records (quantity=1 per row)
db.version(9).stores({
  items: 'id, official_inventory_number, description, name, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, specific_location, sync_status, reported_at, status, solved_at',
  vales: '++id, person_name, start_date, end_date, sync_status, vale_status, requested_by, item_id'
});

// v10: Add item_history table for traceability (transfers & state changes)
db.version(10).stores({
  items: 'id, official_inventory_number, description, name, condition, location_id, category, sync_status, status',
  locations: 'id, name, responsible_name, sync_status',
  tickets: '++id, issue_type, description, location_id, specific_location, sync_status, reported_at, status, solved_at',
  vales: '++id, person_name, start_date, end_date, sync_status, vale_status, requested_by, item_id',
  item_history: 'id, item_id, action_type, created_at'
});

/**
 * Inserts a traceability record into item_history.
 * @param {'transfer'|'state_change'} actionType - The type of action performed.
 * @param {string} itemId - The ID of the item.
 * @param {string} oldValue - The previous value (location_id or condition).
 * @param {string} newValue - The new value.
 * @param {object} [options] - Additional options.
 * @param {string} [options.oldLabel] - Human-readable previous value (e.g. "Almacén").
 * @param {string} [options.newLabel] - Human-readable new value (e.g. "Aula 1A").
 * @param {string} [options.reason] - Optional reason/observation.
 * @param {string} [options.userName] - Name of the user who performed the action.
 */
export async function addHistoryRecord(actionType, itemId, oldValue, newValue, options = {}) {
  try {
    await db.item_history.add({
      id: crypto.randomUUID(),
      item_id: itemId,
      action_type: actionType,
      old_value: oldValue,
      new_value: newValue,
      old_label: options.oldLabel || oldValue,
      new_label: options.newLabel || newValue,
      reason: options.reason || '',
      user_name: options.userName || 'Sistema',
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[SIGRE] Error adding history record:', err);
  }
}

/**
 * Migración v9: Expande registros con quantity > 1 en registros individuales.
 * Cada unidad física obtiene su propia serie única.
 * Se ejecuta una sola vez al iniciar la app.
 */
export async function migrateExpandBulkItems() {
  const MIGRATION_KEY = 'sigre_migration_v9_expand_done';
  if (localStorage.getItem(MIGRATION_KEY)) return;

  try {
    const items = await db.items.toArray();
    const bulkItems = items.filter(i => (i.quantity || 1) > 1);

    if (bulkItems.length === 0) {
      localStorage.setItem(MIGRATION_KEY, Date.now().toString());
      return;
    }

    const existingSerials = new Set(items.map(i => i.serial_number).filter(Boolean));

    for (const item of bulkItems) {
      const qty = item.quantity;
      const baseSerial = item.serial_number || '';

      // Extract prefix (everything before the last number block)
      const match = baseSerial.match(/^(.*?)(\d+)$/);
      const prefix = match ? match[1] : (baseSerial ? baseSerial + '-' : `SIGRE-${new Date().getFullYear()}-MIG-`);
      let startNum = match ? parseInt(match[2], 10) : 0;

      // Update original to quantity 1 (keeps its original serial and ID)
      await db.items.update(item.id, { quantity: 1 });

      // Create qty-1 new individual records
      const newItems = [];
      let counter = startNum;
      for (let i = 1; i < qty; i++) {
        counter++;
        let newSerial = prefix + counter.toString().padStart(4, '0');
        while (existingSerials.has(newSerial)) {
          counter++;
          newSerial = prefix + counter.toString().padStart(4, '0');
        }
        existingSerials.add(newSerial);

        newItems.push({
          id: crypto.randomUUID(),
          name: item.name || item.description,
          description: item.description,
          condition: item.condition,
          location_id: item.location_id,
          category: item.category || null,
          resource_type: item.resource_type || 'fixed',
          origin_provider: item.origin_provider || null,
          acquisition_date: item.acquisition_date || null,
          serial_number: newSerial,
          photoBase64: item.photoBase64 || null,
          invoiceBase64: item.invoiceBase64 || null,
          sync_status: 'pending_create',
          quantity: 1,
          maintenance_frequency_months: item.maintenance_frequency_months || 0,
          last_maintenance_date: item.last_maintenance_date || null,
          status: item.status || null
        });
      }

      if (newItems.length > 0) {
        await db.items.bulkAdd(newItems);
      }
    }

    localStorage.setItem(MIGRATION_KEY, Date.now().toString());
    console.log(`[SIGRE Migration v9] Expanded ${bulkItems.length} bulk items into individual records.`);
  } catch (err) {
    console.error('[SIGRE Migration v9] Error:', err);
  }
}

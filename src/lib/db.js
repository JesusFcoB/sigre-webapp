import Dexie from 'dexie';

export const db = new Dexie('SigreLocalDB');

// Define the local database schema
db.version(2).stores({
  items: 'id, official_inventory_number, description, condition, location_id, sync_status', // sync_status: 'synced', 'pending_create', 'pending_update'
  locations: 'id, name, responsible_name',
  tickets: '++id, issue_type, description, location_id, sync_status, reported_at',
  vales: '++id, location_id, signatureBase64, signed_at, sync_status'
});

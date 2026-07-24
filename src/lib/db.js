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


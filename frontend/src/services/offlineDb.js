import { openDB } from 'idb';

const DB_NAME = 'ram_sawit_offline_db';
const DB_VERSION = 1;

export async function getOfflineDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline transactions queue (synced = 0 or 1)
      if (!db.objectStoreNames.contains('transactions')) {
        const transStore = db.createObjectStore('transactions', { keyPath: 'local_uuid' });
        transStore.createIndex('sync_status', 'sync_status');
        transStore.createIndex('transaction_date', 'transaction_date');
      }

      // Cached master suppliers
      if (!db.objectStoreNames.contains('cached_suppliers')) {
        db.createObjectStore('cached_suppliers', { keyPath: 'id' });
      }

      // Draft form state
      if (!db.objectStoreNames.contains('form_drafts')) {
        db.createObjectStore('form_drafts', { keyPath: 'id' });
      }

      // Cached settings
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });
}

// Transaction Offline Operations
export async function saveLocalTransaction(transaction) {
  const db = await getOfflineDb();
  const item = {
    ...transaction,
    local_uuid: transaction.local_uuid || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sync_status: transaction.sync_status || 'pending',
    saved_at: new Date().toISOString(),
  };
  await db.put('transactions', item);
  return item;
}

export async function getPendingOfflineTransactions() {
  const db = await getOfflineDb();
  const all = await db.getAll('transactions');
  return all.filter((t) => t.sync_status === 'pending');
}

export async function markTransactionSynced(local_uuid) {
  const db = await getOfflineDb();
  const item = await db.get('transactions', local_uuid);
  if (item) {
    item.sync_status = 'synced';
    await db.put('transactions', item);
  }
}

export async function clearLocalTransactions() {
  const db = await getOfflineDb();
  await db.clear('transactions');
}

// Draft Form Operations
export async function saveFormDraft(draftData) {
  const db = await getOfflineDb();
  await db.put('form_drafts', { id: 'current_weighing_draft', ...draftData, updatedAt: Date.now() });
}

export async function getFormDraft() {
  const db = await getOfflineDb();
  return await db.get('form_drafts', 'current_weighing_draft');
}

export async function clearFormDraft() {
  const db = await getOfflineDb();
  await db.delete('form_drafts', 'current_weighing_draft');
}

// Master Data Cache
export async function cacheSuppliers(suppliers) {
  const db = await getOfflineDb();
  const tx = db.transaction('cached_suppliers', 'readwrite');
  for (const s of suppliers) {
    await tx.store.put(s);
  }
  await tx.done;
}

export async function getCachedSuppliers() {
  const db = await getOfflineDb();
  return await db.getAll('cached_suppliers');
}

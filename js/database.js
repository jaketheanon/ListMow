// ============================================
// ListMow Database Module
// IndexedDB implementation with migration support
// ============================================

const DB_NAME = 'ListMowDB';
const DB_VERSION = 2;

const STORES = {
    SETTINGS: 'settings',
    PROPERTIES: 'properties',
    HISTORY: 'history'
};

let db = null;

// ============================================
// Database Initialization
// ============================================

async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            const transaction = event.target.transaction;

            // Create settings store
            if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                const settingsStore = database.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
                settingsStore.createIndex('id', 'id', { unique: true });
            }

            // Create properties store
            if (!database.objectStoreNames.contains(STORES.PROPERTIES)) {
                const propertiesStore = database.createObjectStore(STORES.PROPERTIES, { keyPath: 'id' });
                propertiesStore.createIndex('id', 'id', { unique: true });
                propertiesStore.createIndex('archived', 'archived', { unique: false });
                propertiesStore.createIndex('name', 'name', { unique: false });
            }

            // Create history store
            if (!database.objectStoreNames.contains(STORES.HISTORY)) {
                const historyStore = database.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
                historyStore.createIndex('id', 'id', { unique: true });
                historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                historyStore.createIndex('propertyId', 'propertyId', { unique: false });
            }

            // Initialize default settings if not exists
            const settingsStore = transaction.objectStore(STORES.SETTINGS);
            const addRequest = settingsStore.add({
                id: 'default',
                roundValue: 260,
                savings: 0,
                completedCycles: 0
            });
            addRequest.onerror = () => {
                // Settings already exist, ignore error
            };
        };
    });
}

// ============================================
// Generic CRUD Operations
// ============================================

async function putItem(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getItem(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItem(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function countItems(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// Settings Operations
// ============================================

async function getSettings() {
    try {
        const settings = await getItem(STORES.SETTINGS, 'default');
        if (!settings) {
            // Initialize default settings if missing
            const defaultSettings = {
                id: 'default',
                roundValue: 260,
                savings: 0,
                completedCycles: 0
            };
            await putItem(STORES.SETTINGS, defaultSettings);
            return defaultSettings;
        }
        return settings;
    } catch (error) {
        console.error('Error getting settings:', error);
        throw error;
    }
}

async function updateSettings(settings) {
    try {
        const currentSettings = await getSettings();
        const updatedSettings = {
            ...currentSettings,
            ...settings,
            id: 'default'
        };
        await putItem(STORES.SETTINGS, updatedSettings);
        return updatedSettings;
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
}

// ============================================
// Property Operations
// ============================================

async function addProperty(property) {
    try {
        const id = crypto.randomUUID();
        const newProperty = {
            ...property,
            id,
            dateCreated: new Date().toISOString(),
            mowedThisCycle: false,
            archived: false
        };
        await putItem(STORES.PROPERTIES, newProperty);
        return newProperty;
    } catch (error) {
        console.error('Error adding property:', error);
        throw error;
    }
}

async function getProperty(id) {
    try {
        return await getItem(STORES.PROPERTIES, id);
    } catch (error) {
        console.error('Error getting property:', error);
        throw error;
    }
}

async function updateProperty(property) {
    try {
        await putItem(STORES.PROPERTIES, property);
        return property;
    } catch (error) {
        console.error('Error updating property:', error);
        throw error;
    }
}

async function deleteProperty(id) {
    try {
        await deleteItem(STORES.PROPERTIES, id);
    } catch (error) {
        console.error('Error deleting property:', error);
        throw error;
    }
}

async function getAllProperties() {
    try {
        return await getAllItems(STORES.PROPERTIES);
    } catch (error) {
        console.error('Error getting all properties:', error);
        throw error;
    }
}

async function getActiveProperties() {
    try {
        const allProperties = await getAllItems(STORES.PROPERTIES);
        return allProperties.filter(p => !p.archived);
    } catch (error) {
        console.error('Error getting active properties:', error);
        throw error;
    }
}

async function getArchivedProperties() {
    try {
        const allProperties = await getAllItems(STORES.PROPERTIES);
        return allProperties.filter(p => p.archived);
    } catch (error) {
        console.error('Error getting archived properties:', error);
        throw error;
    }
}

async function getPropertyCount() {
    try {
        return await countItems(STORES.PROPERTIES);
    } catch (error) {
        console.error('Error getting property count:', error);
        throw error;
    }
}

// ============================================
// History Operations
// ============================================

async function addHistoryEntry(entry) {
    try {
        const id = crypto.randomUUID();
        const newEntry = {
            ...entry,
            id,
            timestamp: entry.timestamp || new Date().toISOString()
        };
        await putItem(STORES.HISTORY, newEntry);
        return newEntry;
    } catch (error) {
        console.error('Error adding history entry:', error);
        throw error;
    }
}

async function getHistory(limit = 100) {
    try {
        const allHistory = await getAllItems(STORES.HISTORY);
        return allHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting history:', error);
        throw error;
    }
}

async function getHistoryByProperty(propertyId) {
    try {
        const allHistory = await getAllItems(STORES.HISTORY);
        return allHistory
            .filter(h => h.propertyId === propertyId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
        console.error('Error getting property history:', error);
        throw error;
    }
}

async function clearHistory() {
    try {
        await clearStore(STORES.HISTORY);
    } catch (error) {
        console.error('Error clearing history:', error);
        throw error;
    }
}

async function getHistoryCount() {
    try {
        return await countItems(STORES.HISTORY);
    } catch (error) {
        console.error('Error getting history count:', error);
        throw error;
    }
}

// ============================================
// Backup and Restore
// ============================================

async function backupDatabase() {
    try {
        const settings = await getSettings();
        const properties = await getAllItems(STORES.PROPERTIES);
        const history = await getAllItems(STORES.HISTORY);

        const backup = {
            version: DB_VERSION,
            timestamp: new Date().toISOString(),
            settings,
            properties,
            history
        };

        return JSON.stringify(backup, null, 2);
    } catch (error) {
        console.error('Error backing up database:', error);
        throw error;
    }
}

async function restoreDatabase(jsonString) {
    try {
        // Validate JSON
        let backup;
        try {
            backup = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Invalid JSON format');
        }

        // Validate backup structure
        if (!backup.settings || !backup.properties || !backup.history) {
            throw new Error('Invalid backup structure');
        }

        // Validate settings
        if (typeof backup.settings.roundValue !== 'number' || 
            typeof backup.settings.savings !== 'number' ||
            typeof backup.settings.completedCycles !== 'number') {
            throw new Error('Invalid settings data');
        }

        // Validate properties
        if (!Array.isArray(backup.properties)) {
            throw new Error('Invalid properties data');
        }

        for (const prop of backup.properties) {
            if (!prop.id || !prop.name || typeof prop.interval !== 'number') {
                throw new Error('Invalid property data');
            }
        }

        // Validate history
        if (!Array.isArray(backup.history)) {
            throw new Error('Invalid history data');
        }

        // Clear existing data
        await clearStore(STORES.SETTINGS);
        await clearStore(STORES.PROPERTIES);
        await clearStore(STORES.HISTORY);

        // Restore settings
        backup.settings.id = 'default';
        await putItem(STORES.SETTINGS, backup.settings);

        // Restore properties
        for (const property of backup.properties) {
            await putItem(STORES.PROPERTIES, property);
        }

        // Restore history
        for (const entry of backup.history) {
            await putItem(STORES.HISTORY, entry);
        }

        return true;
    } catch (error) {
        console.error('Error restoring database:', error);
        throw error;
    }
}

async function resetDatabase() {
    try {
        await clearStore(STORES.SETTINGS);
        await clearStore(STORES.PROPERTIES);
        await clearStore(STORES.HISTORY);

        // Reinitialize default settings
        const defaultSettings = {
            id: 'default',
            roundValue: 260,
            savings: 0,
            completedCycles: 0
        };
        await putItem(STORES.SETTINGS, defaultSettings);

        return true;
    } catch (error) {
        console.error('Error resetting database:', error);
        throw error;
    }
}

// ============================================
// Database Close
// ============================================

function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

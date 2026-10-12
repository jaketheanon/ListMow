// ============================================
// ListMow Database Module
// IndexedDB implementation with migration support
// ============================================

const DB_NAME = 'ListMowDB';
const DB_VERSION = 3;

const STORES = {
    SETTINGS: 'settings',
    PROPERTIES: 'properties',
    HISTORY: 'history',
    VISITS: 'visits',
    PAYMENTS: 'payments',
    REMINDERS: 'reminders'
};

const SCHEMA_VERSION = 3;
const DEFAULT_PAYMENT_PER_VISIT = 40;

let db = null;

// ============================================
// Schema Helpers
// ============================================

function createIndexIfMissing(store, name, keyPath, options = {}) {
    if (!store.indexNames.contains(name)) {
        store.createIndex(name, keyPath, options);
    }
}

function getDefaultPaymentPerVisit(property = {}) {
    const name = String(property.name || '').toLowerCase();
    const address = String(property.address || '').toLowerCase();

    if (name === 'home' || address.includes('vollmer')) {
        return 0;
    }
    if (name.includes('timberline') || address.includes('timberline')) {
        return 80;
    }
    if (name.includes('pebble bow') || address.includes('pebble bow')) {
        return 60;
    }
    if (name.includes('scott') || address.includes('scott')) {
        return 60;
    }

    return DEFAULT_PAYMENT_PER_VISIT;
}

function safeNumber(value, fallback = 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeQuickAccess(quickAccess = {}) {
    return {
        lockbox: quickAccess.lockbox || '',
        gateCode: quickAccess.gateCode || '',
        alarmCode: quickAccess.alarmCode || '',
        keyLocation: quickAccess.keyLocation || ''
    };
}

function normalizeGps(gps = {}) {
    return {
        lat: typeof gps.lat === 'number' ? gps.lat : null,
        lng: typeof gps.lng === 'number' ? gps.lng : null,
        radiusFeet: safeNumber(gps.radiusFeet, 200)
    };
}

function normalizePropertySchema(property = {}, options = {}) {
    const archived = Boolean(property.archived);
    const status = property.status || (archived ? 'sold' : 'active');
    const paymentPerVisit = safeNumber(
        property.paymentPerVisit,
        getDefaultPaymentPerVisit(property)
    );
    const mowedThisCycle = Boolean(property.mowedThisCycle);
    const shouldMarkPaidForMigration = Boolean(options.markPaidCompleted && mowedThisCycle);

    return {
        ...property,
        status,
        archived: status === 'sold' || archived,
        paymentPerVisit,
        mowInterval: safeNumber(property.mowInterval, safeNumber(property.interval, 21)),
        edgeInterval: safeNumber(property.edgeInterval, safeNumber(property.interval, 21)),
        lastInspection: property.lastInspection || null,
        cycleCompleted: property.cycleCompleted !== undefined
            ? Boolean(property.cycleCompleted)
            : mowedThisCycle,
        cyclePaymentRecorded: property.cyclePaymentRecorded !== undefined
            ? Boolean(property.cyclePaymentRecorded)
            : shouldMarkPaidForMigration,
        currentCycleNumber: safeNumber(property.currentCycleNumber, null),
        lifetimeEarned: safeNumber(property.lifetimeEarned, 0),
        visitHistory: Array.isArray(property.visitHistory) ? property.visitHistory : [],
        reminders: Array.isArray(property.reminders) ? property.reminders : [],
        quickAccess: normalizeQuickAccess(property.quickAccess),
        gps: normalizeGps(property.gps)
    };
}

function computeCurrentCycleEarnings(properties = []) {
    return properties.reduce((total, property) => {
        if (!property.mowedThisCycle) return total;
        return total + safeNumber(property.paymentPerVisit, getDefaultPaymentPerVisit(property));
    }, 0);
}

function normalizeSettingsSchema(settings = {}, properties = [], options = {}) {
    const migrationAlreadyComplete = settings.paymentModelMigrationComplete === true;
    const forcePaymentMigration = Boolean(options.forcePaymentMigration && !migrationAlreadyComplete);
    const originalSavings = safeNumber(settings.savings, 0);
    const completedCycles = safeNumber(settings.completedCycles, 0);
    const currentCycleNumber = safeNumber(settings.currentCycleNumber, completedCycles + 1);
    const currentCycleEarnings = forcePaymentMigration
        ? computeCurrentCycleEarnings(properties)
        : safeNumber(settings.currentCycleEarnings, 0);
    const savings = forcePaymentMigration
        ? originalSavings + currentCycleEarnings
        : originalSavings;

    return {
        ...settings,
        id: 'default',
        roundValue: safeNumber(settings.roundValue, 260),
        legacyRoundValue: safeNumber(settings.legacyRoundValue, safeNumber(settings.roundValue, 260)),
        savings,
        lifetimeEarnings: safeNumber(settings.lifetimeEarnings, savings),
        lifetimeEarningsBase: safeNumber(settings.lifetimeEarningsBase, forcePaymentMigration ? originalSavings : savings),
        lifetimeEarningsDisplay: savings,
        currentCycleEarnings,
        completedCycles,
        currentCycleNumber,
        defaultPaymentPerVisit: safeNumber(settings.defaultPaymentPerVisit, DEFAULT_PAYMENT_PER_VISIT),
        paymentModel: 'per_visit',
        paymentModelMigrationComplete: true,
        paymentModelMigratedAt: settings.paymentModelMigratedAt || new Date().toISOString(),
        schemaVersion: SCHEMA_VERSION
    };
}

function buildCurrentCycleMigrationRecords(properties = [], settings = {}) {
    const timestamp = new Date().toISOString();
    const cycleNumber = safeNumber(settings.currentCycleNumber, safeNumber(settings.completedCycles, 0) + 1);
    const visits = [];
    const payments = [];
    const normalizedProperties = properties.map(property => {
        const normalized = normalizePropertySchema(property, { markPaidCompleted: true });

        if (!normalized.mowedThisCycle) {
            return normalized;
        }

        const amount = safeNumber(normalized.paymentPerVisit, 0);
        const visitId = crypto.randomUUID();
        const date = normalized.lastMowed || timestamp;

        visits.push({
            id: visitId,
            propertyId: normalized.id,
            propertyName: normalized.name,
            date,
            work: ['mowed'],
            paid: amount > 0,
            amount,
            notes: 'Migrated from pre-v2 current cycle state.',
            cycleNumber,
            source: 'migration_v2_current_cycle',
            createdAt: timestamp,
            updatedAt: null
        });

        if (amount > 0) {
            const paymentId = crypto.randomUUID();
            payments.push({
                id: paymentId,
                visitId,
                propertyId: normalized.id,
                propertyName: normalized.name,
                date,
                amount,
                cycleNumber,
                reason: 'Current cycle migration payment',
                source: 'migration_v2_current_cycle',
                createdAt: timestamp
            });
            normalized.lifetimeEarned = safeNumber(normalized.lifetimeEarned, 0) + amount;
        }

        normalized.currentCycleNumber = cycleNumber;
        normalized.cyclePaymentRecorded = true;
        return normalized;
    });

    return { properties: normalizedProperties, visits, payments };
}

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
            const oldVersion = event.oldVersion || 0;

            // Create settings store
            let settingsStore;
            if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                settingsStore = database.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
                createIndexIfMissing(settingsStore, 'id', 'id', { unique: true });
            } else {
                settingsStore = transaction.objectStore(STORES.SETTINGS);
                createIndexIfMissing(settingsStore, 'id', 'id', { unique: true });
            }

            // Create properties store
            let propertiesStore;
            if (!database.objectStoreNames.contains(STORES.PROPERTIES)) {
                propertiesStore = database.createObjectStore(STORES.PROPERTIES, { keyPath: 'id' });
                createIndexIfMissing(propertiesStore, 'id', 'id', { unique: true });
                createIndexIfMissing(propertiesStore, 'archived', 'archived', { unique: false });
                createIndexIfMissing(propertiesStore, 'name', 'name', { unique: false });
            } else {
                propertiesStore = transaction.objectStore(STORES.PROPERTIES);
            }
            createIndexIfMissing(propertiesStore, 'status', 'status', { unique: false });
            createIndexIfMissing(propertiesStore, 'paymentPerVisit', 'paymentPerVisit', { unique: false });

            // Create history store
            let historyStore;
            if (!database.objectStoreNames.contains(STORES.HISTORY)) {
                historyStore = database.createObjectStore(STORES.HISTORY, { keyPath: 'id' });
                createIndexIfMissing(historyStore, 'id', 'id', { unique: true });
                createIndexIfMissing(historyStore, 'timestamp', 'timestamp', { unique: false });
                createIndexIfMissing(historyStore, 'propertyId', 'propertyId', { unique: false });
            } else {
                historyStore = transaction.objectStore(STORES.HISTORY);
            }

            // Create visits store
            let visitsStore;
            if (!database.objectStoreNames.contains(STORES.VISITS)) {
                visitsStore = database.createObjectStore(STORES.VISITS, { keyPath: 'id' });
            } else {
                visitsStore = transaction.objectStore(STORES.VISITS);
            }
            createIndexIfMissing(visitsStore, 'propertyId', 'propertyId', { unique: false });
            createIndexIfMissing(visitsStore, 'date', 'date', { unique: false });
            createIndexIfMissing(visitsStore, 'cycleNumber', 'cycleNumber', { unique: false });

            // Create payments store
            let paymentsStore;
            if (!database.objectStoreNames.contains(STORES.PAYMENTS)) {
                paymentsStore = database.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
            } else {
                paymentsStore = transaction.objectStore(STORES.PAYMENTS);
            }
            createIndexIfMissing(paymentsStore, 'propertyId', 'propertyId', { unique: false });
            createIndexIfMissing(paymentsStore, 'visitId', 'visitId', { unique: false });
            createIndexIfMissing(paymentsStore, 'date', 'date', { unique: false });
            createIndexIfMissing(paymentsStore, 'cycleNumber', 'cycleNumber', { unique: false });

            // Create reminders store
            let remindersStore;
            if (!database.objectStoreNames.contains(STORES.REMINDERS)) {
                remindersStore = database.createObjectStore(STORES.REMINDERS, { keyPath: 'id' });
            } else {
                remindersStore = transaction.objectStore(STORES.REMINDERS);
            }
            createIndexIfMissing(remindersStore, 'propertyId', 'propertyId', { unique: false });
            createIndexIfMissing(remindersStore, 'completed', 'completed', { unique: false });
            createIndexIfMissing(remindersStore, 'dueDate', 'dueDate', { unique: false });

            // Normalize existing data and migrate current cycle payments exactly once.
            const settingsRequest = settingsStore.get('default');
            settingsRequest.onsuccess = () => {
                const existingSettings = settingsRequest.result || {
                    id: 'default',
                    roundValue: 260,
                    savings: 0,
                    completedCycles: 0
                };

                const propertiesRequest = propertiesStore.getAll();
                propertiesRequest.onsuccess = () => {
                    const rawProperties = propertiesRequest.result || [];
                    const shouldRunPaymentMigration = oldVersion < 3 && existingSettings.paymentModelMigrationComplete !== true;
                    const migrationRecords = shouldRunPaymentMigration
                        ? buildCurrentCycleMigrationRecords(rawProperties, existingSettings)
                        : {
                            properties: rawProperties.map(property => normalizePropertySchema(property)),
                            visits: [],
                            payments: []
                        };

                    const migratedSettings = normalizeSettingsSchema(
                        existingSettings,
                        migrationRecords.properties,
                        { forcePaymentMigration: shouldRunPaymentMigration }
                    );

                    migratedSettings.migrationCurrentCyclePropertyCount = migrationRecords.properties.filter(p => p.mowedThisCycle).length;
                    migratedSettings.migrationCurrentCycleTotalProperties = migrationRecords.properties.filter(p => p.status === 'active').length;

                    settingsStore.put(migratedSettings);

                    for (const property of migrationRecords.properties) {
                        propertiesStore.put(property);
                    }
                    for (const visit of migrationRecords.visits) {
                        visitsStore.put(visit);
                    }
                    for (const payment of migrationRecords.payments) {
                        paymentsStore.put(payment);
                    }
                };
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
            const defaultSettings = normalizeSettingsSchema({
                id: 'default',
                roundValue: 260,
                savings: 0,
                completedCycles: 0
            }, [], { forcePaymentMigration: false });
            await putItem(STORES.SETTINGS, defaultSettings);
            return defaultSettings;
        }

        if (settings.schemaVersion !== SCHEMA_VERSION || settings.paymentModel !== 'per_visit') {
            const properties = await getAllProperties();
            const normalized = normalizeSettingsSchema(settings, properties, {
                forcePaymentMigration: settings.paymentModelMigrationComplete !== true
            });
            await putItem(STORES.SETTINGS, normalized);
            return normalized;
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
        const updatedSettings = normalizeSettingsSchema({
            ...currentSettings,
            ...settings,
            id: 'default'
        }, [], { forcePaymentMigration: false });
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
        const newProperty = normalizePropertySchema({
            ...property,
            id,
            dateCreated: new Date().toISOString(),
            mowedThisCycle: Boolean(property.mowedThisCycle),
            archived: Boolean(property.archived)
        });
        await putItem(STORES.PROPERTIES, newProperty);
        return newProperty;
    } catch (error) {
        console.error('Error adding property:', error);
        throw error;
    }
}

async function getProperty(id) {
    try {
        const property = await getItem(STORES.PROPERTIES, id);
        return property ? normalizePropertySchema(property) : property;
    } catch (error) {
        console.error('Error getting property:', error);
        throw error;
    }
}

async function updateProperty(property) {
    try {
        const normalizedProperty = normalizePropertySchema(property);
        await putItem(STORES.PROPERTIES, normalizedProperty);
        return normalizedProperty;
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
        const properties = await getAllItems(STORES.PROPERTIES);
        return properties.map(property => normalizePropertySchema(property));
    } catch (error) {
        console.error('Error getting all properties:', error);
        throw error;
    }
}

async function getActiveProperties() {
    try {
        const allProperties = await getAllProperties();
        return allProperties.filter(p => p.status === 'active' && !p.archived);
    } catch (error) {
        console.error('Error getting active properties:', error);
        throw error;
    }
}

async function getArchivedProperties() {
    try {
        const allProperties = await getAllProperties();
        return allProperties.filter(p => p.archived || p.status === 'sold');
    } catch (error) {
        console.error('Error getting archived properties:', error);
        throw error;
    }
}

async function getPausedProperties() {
    try {
        const allProperties = await getAllProperties();
        return allProperties.filter(p => p.status === 'paused');
    } catch (error) {
        console.error('Error getting paused properties:', error);
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
// Visit Operations
// ============================================

async function addVisit(visit) {
    try {
        const newVisit = {
            id: visit.id || crypto.randomUUID(),
            propertyId: visit.propertyId,
            propertyName: visit.propertyName || '',
            date: visit.date || new Date().toISOString(),
            work: Array.isArray(visit.work) ? visit.work : [],
            paid: Boolean(visit.paid),
            amount: safeNumber(visit.amount, 0),
            notes: visit.notes || '',
            cycleNumber: safeNumber(visit.cycleNumber, 0),
            source: visit.source || 'app',
            createdAt: visit.createdAt || new Date().toISOString(),
            updatedAt: visit.updatedAt || null
        };
        await putItem(STORES.VISITS, newVisit);
        return newVisit;
    } catch (error) {
        console.error('Error adding visit:', error);
        throw error;
    }
}

async function deleteVisit(id) {
    try {
        await deleteItem(STORES.VISITS, id);
    } catch (error) {
        console.error('Error deleting visit:', error);
        throw error;
    }
}

async function getAllVisits() {
    try {
        return await getAllItems(STORES.VISITS);
    } catch (error) {
        console.error('Error getting all visits:', error);
        throw error;
    }
}

async function getVisitsByProperty(propertyId) {
    try {
        const visits = await getAllVisits();
        return visits
            .filter(visit => visit.propertyId === propertyId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error getting property visits:', error);
        throw error;
    }
}

// ============================================
// Payment Operations
// ============================================

async function addPayment(payment) {
    try {
        const newPayment = {
            id: payment.id || crypto.randomUUID(),
            visitId: payment.visitId || null,
            propertyId: payment.propertyId,
            propertyName: payment.propertyName || '',
            date: payment.date || new Date().toISOString(),
            amount: safeNumber(payment.amount, 0),
            cycleNumber: safeNumber(payment.cycleNumber, 0),
            reason: payment.reason || 'Paid visit',
            source: payment.source || 'app',
            createdAt: payment.createdAt || new Date().toISOString()
        };
        await putItem(STORES.PAYMENTS, newPayment);
        return newPayment;
    } catch (error) {
        console.error('Error adding payment:', error);
        throw error;
    }
}

async function deletePayment(id) {
    try {
        await deleteItem(STORES.PAYMENTS, id);
    } catch (error) {
        console.error('Error deleting payment:', error);
        throw error;
    }
}

async function getAllPayments() {
    try {
        return await getAllItems(STORES.PAYMENTS);
    } catch (error) {
        console.error('Error getting all payments:', error);
        throw error;
    }
}

async function getPaymentsByProperty(propertyId) {
    try {
        const payments = await getAllPayments();
        return payments
            .filter(payment => payment.propertyId === propertyId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (error) {
        console.error('Error getting property payments:', error);
        throw error;
    }
}

// ============================================
// Reminder Operations
// ============================================

async function addReminder(reminder) {
    try {
        const newReminder = {
            id: reminder.id || crypto.randomUUID(),
            propertyId: reminder.propertyId,
            propertyName: reminder.propertyName || '',
            title: reminder.title || '',
            notes: reminder.notes || '',
            dueDate: reminder.dueDate || null,
            completed: Boolean(reminder.completed),
            createdAt: reminder.createdAt || new Date().toISOString(),
            completedAt: reminder.completedAt || null
        };
        await putItem(STORES.REMINDERS, newReminder);
        return newReminder;
    } catch (error) {
        console.error('Error adding reminder:', error);
        throw error;
    }
}

async function getAllReminders() {
    try {
        return await getAllItems(STORES.REMINDERS);
    } catch (error) {
        console.error('Error getting all reminders:', error);
        throw error;
    }
}

async function getRemindersByProperty(propertyId) {
    try {
        const reminders = await getAllReminders();
        return reminders.filter(reminder => reminder.propertyId === propertyId);
    } catch (error) {
        console.error('Error getting property reminders:', error);
        throw error;
    }
}

// ============================================
// History Operations
// ============================================

async function addHistoryEntry(entry) {
    try {
        const id = entry.id || crypto.randomUUID();
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
        const visits = await getAllItems(STORES.VISITS);
        const payments = await getAllItems(STORES.PAYMENTS);
        const reminders = await getAllItems(STORES.REMINDERS);

        const backup = {
            version: DB_VERSION,
            timestamp: new Date().toISOString(),
            settings,
            properties,
            history,
            visits,
            payments,
            reminders
        };

        return JSON.stringify(backup, null, 2);
    } catch (error) {
        console.error('Error backing up database:', error);
        throw error;
    }
}

function prepareBackupForRestore(backup) {
    const oldSettings = backup.settings || {};
    const rawProperties = Array.isArray(backup.properties) ? backup.properties : [];
    const migrationNeeded = backup.version < 3 || oldSettings.paymentModelMigrationComplete !== true;
    const migrationRecords = migrationNeeded
        ? buildCurrentCycleMigrationRecords(rawProperties, oldSettings)
        : {
            properties: rawProperties.map(property => normalizePropertySchema(property)),
            visits: [],
            payments: []
        };

    const settings = normalizeSettingsSchema(oldSettings, migrationRecords.properties, {
        forcePaymentMigration: migrationNeeded
    });

    settings.migrationCurrentCyclePropertyCount = migrationRecords.properties.filter(p => p.mowedThisCycle).length;
    settings.migrationCurrentCycleTotalProperties = migrationRecords.properties.filter(p => p.status === 'active').length;

    const existingVisits = Array.isArray(backup.visits) ? backup.visits : [];
    const existingPayments = Array.isArray(backup.payments) ? backup.payments : [];
    const existingReminders = Array.isArray(backup.reminders) ? backup.reminders : [];

    return {
        settings,
        properties: migrationRecords.properties,
        history: Array.isArray(backup.history) ? backup.history : [],
        visits: [...existingVisits, ...migrationRecords.visits],
        payments: [...existingPayments, ...migrationRecords.payments],
        reminders: existingReminders
    };
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

        const restored = prepareBackupForRestore(backup);

        // Clear existing data
        await clearStore(STORES.SETTINGS);
        await clearStore(STORES.PROPERTIES);
        await clearStore(STORES.HISTORY);
        await clearStore(STORES.VISITS);
        await clearStore(STORES.PAYMENTS);
        await clearStore(STORES.REMINDERS);

        // Restore settings
        await putItem(STORES.SETTINGS, restored.settings);

        // Restore properties
        for (const property of restored.properties) {
            await putItem(STORES.PROPERTIES, property);
        }

        // Restore history
        for (const entry of restored.history) {
            await putItem(STORES.HISTORY, entry);
        }

        // Restore visits
        for (const visit of restored.visits) {
            await putItem(STORES.VISITS, visit);
        }

        // Restore payments
        for (const payment of restored.payments) {
            await putItem(STORES.PAYMENTS, payment);
        }

        // Restore reminders
        for (const reminder of restored.reminders) {
            await putItem(STORES.REMINDERS, reminder);
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
        await clearStore(STORES.VISITS);
        await clearStore(STORES.PAYMENTS);
        await clearStore(STORES.REMINDERS);

        // Reinitialize default settings
        const defaultSettings = normalizeSettingsSchema({
            id: 'default',
            roundValue: 260,
            savings: 0,
            completedCycles: 0
        }, [], { forcePaymentMigration: false });
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

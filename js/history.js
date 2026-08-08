// ============================================
// ListMow History Module
// Comprehensive action logging
// ============================================

// ============================================
// Action Types
// ============================================

const ACTION_TYPES = {
    PROPERTY_ADDED: 'property_added',
    PROPERTY_EDITED: 'property_edited',
    PROPERTY_ARCHIVED: 'property_archived',
    PROPERTY_DELETED: 'property_deleted',
    PROPERTY_RESTORED: 'property_restored',
    MOWED: 'mowed',
    EDGED: 'edged',
    MOWED_UNDO: 'mowed_undo',
    EDGED_UNDO: 'edged_undo',
    CYCLE_COMPLETE: 'cycle_complete',
    SAVINGS_ADDED: 'savings_added',
    DATABASE_RESTORED: 'database_restored',
    DATABASE_RESET: 'database_reset',
    SETTINGS_UPDATED: 'settings_updated'
};

// ============================================
// Log Property Added
// ============================================

async function logPropertyAdded(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.PROPERTY_ADDED,
            propertyId,
            propertyName,
            details: `Added property: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging property added:', error);
        throw error;
    }
}

// ============================================
// Log Property Edited
// ============================================

async function logPropertyEdited(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.PROPERTY_EDITED,
            propertyId,
            propertyName,
            details: `Edited property: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging property edited:', error);
        throw error;
    }
}

// ============================================
// Log Property Archived
// ============================================

async function logPropertyArchived(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.PROPERTY_ARCHIVED,
            propertyId,
            propertyName,
            details: `Archived property: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging property archived:', error);
        throw error;
    }
}

// ============================================
// Log Property Deleted
// ============================================

async function logPropertyDeleted(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.PROPERTY_DELETED,
            propertyId,
            propertyName,
            details: `Deleted property: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging property deleted:', error);
        throw error;
    }
}

// ============================================
// Log Property Restored
// ============================================

async function logPropertyRestored(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.PROPERTY_RESTORED,
            propertyId,
            propertyName,
            details: `Restored property: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging property restored:', error);
        throw error;
    }
}

// ============================================
// Log Mowed
// ============================================

async function logMowed(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.MOWED,
            propertyId,
            propertyName,
            details: `Mowed: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging mowed:', error);
        throw error;
    }
}

// ============================================
// Log Edged
// ============================================

async function logEdged(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.EDGED,
            propertyId,
            propertyName,
            details: `Edged: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging edged:', error);
        throw error;
    }
}

// ============================================
// Log Mowed Undo
// ============================================

async function logMowedUndo(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.MOWED_UNDO,
            propertyId,
            propertyName,
            details: `Undo mowed: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging mowed undo:', error);
        throw error;
    }
}

// ============================================
// Log Edged Undo
// ============================================

async function logEdgedUndo(propertyId, propertyName) {
    try {
        const entry = {
            type: ACTION_TYPES.EDGED_UNDO,
            propertyId,
            propertyName,
            details: `Undo edged: ${propertyName}`
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging edged undo:', error);
        throw error;
    }
}

// ============================================
// Log Cycle Complete
// ============================================

async function logCycleComplete(savingsAmount) {
    try {
        const entry = {
            type: ACTION_TYPES.CYCLE_COMPLETE,
            propertyId: null,
            propertyName: null,
            details: `Cycle complete! +$${savingsAmount}`,
            savingsAmount
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging cycle complete:', error);
        throw error;
    }
}

// ============================================
// Log Savings Added
// ============================================

async function logSavingsAdded(amount) {
    try {
        const entry = {
            type: ACTION_TYPES.SAVINGS_ADDED,
            propertyId: null,
            propertyName: null,
            details: `Savings added: +$${amount}`,
            amount
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging savings added:', error);
        throw error;
    }
}

// ============================================
// Log Database Restored
// ============================================

async function logDatabaseRestored() {
    try {
        const entry = {
            type: ACTION_TYPES.DATABASE_RESTORED,
            propertyId: null,
            propertyName: null,
            details: 'Database restored from backup'
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging database restored:', error);
        throw error;
    }
}

// ============================================
// Log Database Reset
// ============================================

async function logDatabaseReset() {
    try {
        const entry = {
            type: ACTION_TYPES.DATABASE_RESET,
            propertyId: null,
            propertyName: null,
            details: 'Database reset'
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging database reset:', error);
        throw error;
    }
}

// ============================================
// Log Settings Updated
// ============================================

async function logSettingsUpdated() {
    try {
        const entry = {
            type: ACTION_TYPES.SETTINGS_UPDATED,
            propertyId: null,
            propertyName: null,
            details: 'Settings updated'
        };
        return await addHistoryEntry(entry);
    } catch (error) {
        console.error('Error logging settings updated:', error);
        throw error;
    }
}

// ============================================
// Format History Entry for Display
// ============================================

function formatHistoryEntry(entry) {
    const date = new Date(entry.timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo;
    if (diffMins < 1) {
        timeAgo = 'Just now';
    } else if (diffMins < 60) {
        timeAgo = `${diffMins}m ago`;
    } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
    } else if (diffDays < 7) {
        timeAgo = `${diffDays}d ago`;
    } else {
        timeAgo = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    return {
        ...entry,
        timeAgo,
        displayTime: date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        })
    };
}

// ============================================
// Format History List
// ============================================

async function getFormattedHistory(limit = 100) {
    try {
        const history = await getHistory(limit);
        return history.map(formatHistoryEntry);
    } catch (error) {
        console.error('Error getting formatted history:', error);
        throw error;
    }
}

// ============================================
// Get History Statistics
// ============================================

async function getHistoryStatistics() {
    try {
        const history = await getHistory(1000);
        
        const stats = {
            total: history.length,
            byType: {},
            byProperty: {}
        };

        for (const entry of history) {
            // Count by type
            stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

            // Count by property
            if (entry.propertyId && entry.propertyName) {
                stats.byProperty[entry.propertyName] = (stats.byProperty[entry.propertyName] || 0) + 1;
            }
        }

        return stats;
    } catch (error) {
        console.error('Error getting history statistics:', error);
        throw error;
    }
}

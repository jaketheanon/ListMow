// ============================================
// ListMow Settings Module
// Settings management
// ============================================

// ============================================
// Get Current Settings
// ============================================

async function getCurrentSettings() {
    try {
        return await getSettings();
    } catch (error) {
        console.error('Error getting current settings:', error);
        throw error;
    }
}

// ============================================
// Update Round Value
// ============================================

async function setRoundValue(value) {
    try {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            throw new Error('Round value must be a positive number');
        }
        if (numValue > 10000) {
            throw new Error('Round value is too large (max 10000)');
        }
        
        const settings = await getCurrentSettings();
        settings.roundValue = numValue;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error setting round value:', error);
        throw error;
    }
}

// ============================================
// Update Savings
// ============================================

async function setSavings(value) {
    try {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) {
            throw new Error('Savings must be a positive number');
        }
        if (numValue > 1000000) {
            throw new Error('Savings value is too large');
        }
        
        const settings = await getCurrentSettings();
        settings.savings = numValue;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error setting savings:', error);
        throw error;
    }
}

// ============================================
// Update Completed Cycles
// ============================================

async function setCompletedCycles(value) {
    try {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) || numValue < 0) {
            throw new Error('Completed cycles must be a positive number');
        }
        if (numValue > 10000) {
            throw new Error('Completed cycles value is too large');
        }
        
        const settings = await getCurrentSettings();
        settings.completedCycles = numValue;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error setting completed cycles:', error);
        throw error;
    }
}

// ============================================
// Add to Savings
// ============================================

async function addToSavings(amount) {
    try {
        const settings = await getCurrentSettings();
        settings.savings += amount;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error adding to savings:', error);
        throw error;
    }
}

// ============================================
// Increment Completed Cycles
// ============================================

async function incrementCompletedCycles() {
    try {
        const settings = await getCurrentSettings();
        settings.completedCycles += 1;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error incrementing completed cycles:', error);
        throw error;
    }
}

// ============================================
// Update All Settings
// ============================================

async function updateAllSettings(settingsData) {
    try {
        const currentSettings = await getCurrentSettings();
        
        // Validate and update round value
        if (settingsData.roundValue !== undefined) {
            const numValue = parseInt(settingsData.roundValue, 10);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Round value must be a positive number');
            }
            if (numValue > 10000) {
                throw new Error('Round value is too large (max 10000)');
            }
            currentSettings.roundValue = numValue;
        }
        
        // Validate and update savings
        if (settingsData.savings !== undefined) {
            const numValue = parseFloat(settingsData.savings);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Savings must be a positive number');
            }
            if (numValue > 1000000) {
                throw new Error('Savings value is too large');
            }
            currentSettings.savings = numValue;
        }
        
        // Validate and update completed cycles
        if (settingsData.completedCycles !== undefined) {
            const numValue = parseInt(settingsData.completedCycles, 10);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Completed cycles must be a positive number');
            }
            if (numValue > 10000) {
                throw new Error('Completed cycles value is too large');
            }
            currentSettings.completedCycles = numValue;
        }
        
        await updateSettings(currentSettings);
        return currentSettings;
    } catch (error) {
        console.error('Error updating all settings:', error);
        throw error;
    }
}

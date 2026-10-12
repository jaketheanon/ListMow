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
// Kept for backward compatibility. v2 payment logic no longer uses it.
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
        settings.legacyRoundValue = numValue;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error setting round value:', error);
        throw error;
    }
}

// ============================================
// Update Savings / Lifetime Earnings
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
        settings.lifetimeEarnings = numValue;
        settings.lifetimeEarningsDisplay = numValue;
        settings.lifetimeEarningsBase = numValue - (settings.currentCycleEarnings || 0);
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
        settings.currentCycleNumber = numValue + 1;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error setting completed cycles:', error);
        throw error;
    }
}

// ============================================
// Add to Savings / Lifetime Earnings
// ============================================

async function addToSavings(amount) {
    try {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            throw new Error('Savings amount must be a number');
        }

        const settings = await getCurrentSettings();
        settings.savings = Math.max(0, (settings.savings || 0) + numAmount);
        settings.lifetimeEarnings = settings.savings;
        settings.lifetimeEarningsDisplay = settings.savings;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error adding to savings:', error);
        throw error;
    }
}

async function subtractFromSavings(amount) {
    try {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            throw new Error('Savings amount must be a positive number');
        }
        return await addToSavings(-numAmount);
    } catch (error) {
        console.error('Error subtracting from savings:', error);
        throw error;
    }
}

async function recordPaymentToEarnings(amount) {
    return await addToSavings(amount);
}

// ============================================
// Increment Completed Cycles
// ============================================

async function incrementCompletedCycles() {
    try {
        const settings = await getCurrentSettings();
        settings.completedCycles += 1;
        settings.currentCycleNumber = settings.completedCycles + 1;
        settings.currentCycleEarnings = 0;
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error incrementing completed cycles:', error);
        throw error;
    }
}

// ============================================
// Update Current Cycle Earnings
// ============================================

async function addToCurrentCycleEarnings(amount) {
    try {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            throw new Error('Cycle earnings amount must be a number');
        }

        const settings = await getCurrentSettings();
        settings.currentCycleEarnings = Math.max(0, (settings.currentCycleEarnings || 0) + numAmount);
        await updateSettings(settings);
        return settings;
    } catch (error) {
        console.error('Error updating current cycle earnings:', error);
        throw error;
    }
}

// ============================================
// Update All Settings
// ============================================

async function updateAllSettings(settingsData) {
    try {
        const currentSettings = await getCurrentSettings();
        
        // Validate and update round value. Kept only as legacy metadata in v2.
        if (settingsData.roundValue !== undefined) {
            const numValue = parseInt(settingsData.roundValue, 10);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Round value must be a positive number');
            }
            if (numValue > 10000) {
                throw new Error('Round value is too large (max 10000)');
            }
            currentSettings.roundValue = numValue;
            currentSettings.legacyRoundValue = numValue;
        }
        
        // Validate and update savings / lifetime earnings
        if (settingsData.savings !== undefined) {
            const numValue = parseFloat(settingsData.savings);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Savings must be a positive number');
            }
            if (numValue > 1000000) {
                throw new Error('Savings value is too large');
            }
            currentSettings.savings = numValue;
            currentSettings.lifetimeEarnings = numValue;
            currentSettings.lifetimeEarningsDisplay = numValue;
            currentSettings.lifetimeEarningsBase = numValue - (currentSettings.currentCycleEarnings || 0);
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
            currentSettings.currentCycleNumber = numValue + 1;
        }
        
        await updateSettings(currentSettings);
        return currentSettings;
    } catch (error) {
        console.error('Error updating all settings:', error);
        throw error;
    }
}

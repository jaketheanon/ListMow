// ============================================
// ListMow Cycle Module
// Mowing cycle logic with race condition prevention
// ============================================

// ============================================
// Cycle State Lock
// ============================================

let cycleInProgress = false;

// ============================================
// Check if Cycle is Complete
// ============================================

async function checkCycleComplete() {
    try {
        if (cycleInProgress) {
            return false;
        }

        const activeProperties = await getActiveProperties();
        
        // Only active properties participate in cycle
        if (activeProperties.length === 0) {
            return false;
        }

        // Check if all active properties have been mowed this cycle
        const allMowed = activeProperties.every(p => p.mowedThisCycle);
        
        return allMowed;
    } catch (error) {
        console.error('Error checking cycle complete:', error);
        return false;
    }
}

// ============================================
// Reset Cycle
// ============================================

async function resetCycle() {
    try {
        const activeProperties = await getActiveProperties();
        
        for (const property of activeProperties) {
            property.mowedThisCycle = false;
            await updateProperty(property);
        }
    } catch (error) {
        console.error('Error resetting cycle:', error);
        throw error;
    }
}

// ============================================
// Handle Property Mowed
// ============================================

async function handlePropertyMowed(propertyId) {
    try {
        if (cycleInProgress) {
            throw new Error('Cycle operation in progress, please wait');
        }

        const result = await markPropertyMowed(propertyId);
        if (!result) {
            throw new Error('Failed to mark property as mowed');
        }

        const { property, previousLastMowed } = result;

        // Log the mowed action
        await logMowed(property.id, property.name);

        // Check if cycle is complete
        const isCycleComplete = await checkCycleComplete();

        if (isCycleComplete) {
            cycleInProgress = true;

            try {
                // Get settings for round value
                const settings = await getCurrentSettings();
                const savingsAmount = settings.roundValue;

                // Update savings and cycles
                await addToSavings(savingsAmount);
                await incrementCompletedCycles();

                // Reset cycle
                await resetCycle();

                // Log cycle completion
                await logCycleComplete(savingsAmount);

                return {
                    property,
                    cycleComplete: true,
                    savingsAmount,
                    previousLastMowed
                };
            } finally {
                cycleInProgress = false;
            }
        }

        return {
            property,
            cycleComplete: false,
            previousLastMowed
        };
    } catch (error) {
        console.error('Error handling property mowed:', error);
        cycleInProgress = false;
        throw error;
    }
}

// ============================================
// Handle Property Edged
// ============================================

async function handlePropertyEdged(propertyId) {
    try {
        const result = await markPropertyEdged(propertyId);
        if (!result) {
            throw new Error('Failed to mark property as edged');
        }

        const { property, previousLastEdged } = result;

        // Log the edged action
        await logEdged(property.id, property.name);

        return {
            property,
            previousLastEdged
        };
    } catch (error) {
        console.error('Error handling property edged:', error);
        throw error;
    }
}

// ============================================
// Undo Mowed Action
// ============================================

async function undoMowed(propertyId, previousLastMowed) {
    try {
        const property = await getProperty(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        // Restore previous state
        property.lastMowed = previousLastMowed;
        property.mowedThisCycle = false;
        
        await updateProperty(property);

        // Log the undo action
        await logMowedUndo(property.id, property.name);

        return property;
    } catch (error) {
        console.error('Error undoing mowed:', error);
        throw error;
    }
}

// ============================================
// Undo Edged Action
// ============================================

async function undoEdged(propertyId, previousLastEdged) {
    try {
        const property = await getProperty(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        // Restore previous state
        property.lastEdged = previousLastEdged;
        
        await updateProperty(property);

        // Log the undo action
        await logEdgedUndo(property.id, property.name);

        return property;
    } catch (error) {
        console.error('Error undoing edged:', error);
        throw error;
    }
}

// ============================================
// Get Cycle Progress
// ============================================

async function getCycleProgress() {
    try {
        const activeProperties = await getActiveProperties();
        
        if (activeProperties.length === 0) {
            return {
                total: 0,
                mowed: 0,
                remaining: 0,
                percentage: 0
            };
        }

        const mowedCount = activeProperties.filter(p => p.mowedThisCycle).length;
        const remaining = activeProperties.length - mowedCount;
        const percentage = Math.round((mowedCount / activeProperties.length) * 100);

        return {
            total: activeProperties.length,
            mowed: mowedCount,
            remaining,
            percentage
        };
    } catch (error) {
        console.error('Error getting cycle progress:', error);
        throw error;
    }
}

// ============================================
// Validate Cycle State
// ============================================

async function validateCycleState() {
    try {
        const activeProperties = await getActiveProperties();
        const issues = [];

        for (const property of activeProperties) {
            // Check for invalid dates
            if (property.lastMowed) {
                const lastMowed = new Date(property.lastMowed);
                if (lastMowed > new Date()) {
                    issues.push({
                        property: property.name,
                        issue: 'Future mow date',
                        value: property.lastMowed
                    });
                }
            }

            // Check for inconsistent cycle state
            if (property.mowedThisCycle && !property.lastMowed) {
                issues.push({
                    property: property.name,
                    issue: 'Mowed this cycle but no mow date',
                    value: null
                });
            }
        }

        return issues;
    } catch (error) {
        console.error('Error validating cycle state:', error);
        throw error;
    }
}

// ============================================
// Fix Cycle State
// ============================================

async function fixCycleState() {
    try {
        const activeProperties = await getActiveProperties();
        let fixedCount = 0;

        for (const property of activeProperties) {
            let needsUpdate = false;

            // Fix future dates
            if (property.lastMowed) {
                const lastMowed = new Date(property.lastMowed);
                if (lastMowed > new Date()) {
                    property.lastMowed = new Date().toISOString();
                    needsUpdate = true;
                }
            }

            // Fix inconsistent cycle state
            if (property.mowedThisCycle && !property.lastMowed) {
                property.mowedThisCycle = false;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await updateProperty(property);
                fixedCount++;
            }
        }

        return fixedCount;
    } catch (error) {
        console.error('Error fixing cycle state:', error);
        throw error;
    }
}

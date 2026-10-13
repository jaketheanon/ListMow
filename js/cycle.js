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

        // Check if all active properties have been completed this cycle
        const allCompleted = activeProperties.every(p => p.mowedThisCycle || p.cycleCompleted);
        
        return allCompleted;
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
            property.cycleCompleted = false;
            property.cyclePaymentRecorded = false;
            await updateProperty(property);
        }
    } catch (error) {
        console.error('Error resetting cycle:', error);
        throw error;
    }
}

// ============================================
// Record Payment for Mowed Property
// ============================================

async function recordMowedPayment(property, visit) {
    const amount = Number(property.paymentPerVisit || 0);
    if (amount <= 0 || property.cyclePaymentRecorded) {
        return {
            paymentApplied: false,
            paymentAmount: 0,
            payment: null
        };
    }

    const settings = await getCurrentSettings();
    const payment = await addPayment({
        visitId: visit.id,
        propertyId: property.id,
        propertyName: property.name,
        date: visit.date,
        amount,
        cycleNumber: settings.currentCycleNumber,
        reason: 'Paid mowing visit'
    });

    await recordPaymentToEarnings(amount);
    await addToCurrentCycleEarnings(amount);
    await logPaymentRecorded(property.id, property.name, amount);

    property.cyclePaymentRecorded = true;
    property.currentCycleNumber = settings.currentCycleNumber;
    property.lifetimeEarned = Number(property.lifetimeEarned || 0) + amount;
    await updateProperty(property);

    return {
        paymentApplied: true,
        paymentAmount: amount,
        payment
    };
}

function normalizeVisitWork(work = []) {
    const allowed = [
        'mowed',
        'edged',
        'weed_eating',
        'blower_cleanup',
        'property_check',
        'no_work_needed'
    ];
    const values = Array.isArray(work) ? work : [];
    return [...new Set(values.filter(item => allowed.includes(item)))];
}

function getVisitWorkLabel(work = []) {
    const labels = {
        mowed: 'mowed',
        edged: 'edged',
        weed_eating: 'weed eating',
        blower_cleanup: 'blower cleanup',
        property_check: 'property check',
        no_work_needed: 'no work needed'
    };
    return normalizeVisitWork(work).map(item => labels[item] || item).join(', ');
}

// ============================================
// Handle General Property Visit
// ============================================

async function handlePropertyVisit(propertyId, visitData = {}) {
    try {
        if (cycleInProgress) {
            throw new Error('Cycle operation in progress, please wait');
        }

        const property = await getProperty(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        const propertyStatus = typeof getPropertyStatus === 'function'
            ? getPropertyStatus(property)
            : (property.archived ? 'sold' : (property.status || 'active'));
        if (propertyStatus === 'sold') {
            throw new Error('Sold properties are history-only. Set Active before recording new work.');
        }

        const work = normalizeVisitWork(visitData.work);
        if (work.length === 0) {
            throw new Error('Choose at least one visit action');
        }

        const settings = await getCurrentSettings();
        const visitDate = visitData.date || new Date().toISOString();
        const paid = Boolean(visitData.paid);
        const amount = paid ? Number(visitData.amount || 0) : 0;
        const countsForCycle = propertyStatus === 'active' && visitData.countsForCycle !== false;
        const forceDuplicatePayment = Boolean(visitData.forceDuplicatePayment);

        if (paid && amount <= 0) {
            throw new Error('Paid visits need an amount greater than zero');
        }

        if (propertyStatus === 'active' && paid && amount > 0 && property.cyclePaymentRecorded && !forceDuplicatePayment) {
            throw new Error('Payment already recorded for this property in the current cycle');
        }

        const previousState = {
            lastMowed: property.lastMowed || null,
            lastEdged: property.lastEdged || null,
            lastInspection: property.lastInspection || null,
            mowedThisCycle: Boolean(property.mowedThisCycle),
            cycleCompleted: Boolean(property.cycleCompleted),
            cyclePaymentRecorded: Boolean(property.cyclePaymentRecorded),
            lifetimeEarned: Number(property.lifetimeEarned || 0)
        };

        if (work.includes('mowed')) {
            property.lastMowed = visitDate;
        }
        if (work.includes('edged')) {
            property.lastEdged = visitDate;
        }
        if (work.includes('property_check') || work.includes('no_work_needed')) {
            property.lastInspection = visitDate;
        }
        if (countsForCycle) {
            property.mowedThisCycle = true;
            property.cycleCompleted = true;
            property.currentCycleNumber = settings.currentCycleNumber;
        }

        const visit = await addVisit({
            propertyId: property.id,
            propertyName: property.name,
            date: visitDate,
            work,
            paid,
            amount,
            notes: visitData.notes || '',
            cycleNumber: settings.currentCycleNumber,
            propertyStatus
        });

        let payment = null;
        let paymentApplied = false;
        if (paid && amount > 0) {
            payment = await addPayment({
                visitId: visit.id,
                propertyId: property.id,
                propertyName: property.name,
                date: visitDate,
                amount,
                cycleNumber: settings.currentCycleNumber,
                reason: `Paid visit: ${getVisitWorkLabel(work)}`
            });
            await recordPaymentToEarnings(amount);
            await addToCurrentCycleEarnings(amount);
            await logPaymentRecorded(property.id, property.name, amount);
            property.cyclePaymentRecorded = true;
            property.lifetimeEarned = Number(property.lifetimeEarned || 0) + amount;
            paymentApplied = true;
        }

        await updateProperty(property);
        await logVisitRecorded(property.id, property.name, work);

        const isCycleComplete = await checkCycleComplete();
        if (isCycleComplete) {
            cycleInProgress = true;
            try {
                await incrementCompletedCycles();
                await resetCycle();
                await logCycleComplete(0);
            } finally {
                cycleInProgress = false;
            }
        }

        return {
            property,
            visit,
            payment,
            paymentApplied,
            paymentAmount: paymentApplied ? amount : 0,
            cycleComplete: isCycleComplete,
            previousState
        };
    } catch (error) {
        console.error('Error handling property visit:', error);
        cycleInProgress = false;
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

        const {
            property,
            previousLastMowed,
            previousMowedThisCycle,
            previousCycleCompleted,
            previousCyclePaymentRecorded,
            previousLifetimeEarned
        } = result;

        const settings = await getCurrentSettings();
        const visit = await addVisit({
            propertyId: property.id,
            propertyName: property.name,
            date: property.lastMowed,
            work: ['mowed'],
            paid: !previousCyclePaymentRecorded && Number(property.paymentPerVisit || 0) > 0,
            amount: !previousCyclePaymentRecorded ? Number(property.paymentPerVisit || 0) : 0,
            notes: '',
            cycleNumber: settings.currentCycleNumber
        });

        // Log the mowed action
        await logMowed(property.id, property.name);

        // Per-visit payment replaces old fixed round payout.
        const paymentResult = await recordMowedPayment(property, visit);

        // Check if cycle is complete
        const isCycleComplete = await checkCycleComplete();

        if (isCycleComplete) {
            cycleInProgress = true;

            try {
                // Count the completed cycle, then reset flags. No fixed $260 payout anymore.
                await incrementCompletedCycles();
                await resetCycle();

                // Log cycle completion without adding extra money.
                await logCycleComplete(0);

                return {
                    property,
                    cycleComplete: true,
                    savingsAmount: paymentResult.paymentAmount,
                    previousLastMowed,
                    previousMowedThisCycle,
                    previousCycleCompleted,
                    previousCyclePaymentRecorded,
                    previousLifetimeEarned,
                    visitId: visit.id,
                    paymentId: paymentResult.payment ? paymentResult.payment.id : null,
                    paymentApplied: paymentResult.paymentApplied,
                    paymentAmount: paymentResult.paymentAmount
                };
            } finally {
                cycleInProgress = false;
            }
        }

        return {
            property,
            cycleComplete: false,
            previousLastMowed,
            previousMowedThisCycle,
            previousCycleCompleted,
            previousCyclePaymentRecorded,
            previousLifetimeEarned,
            visitId: visit.id,
            paymentId: paymentResult.payment ? paymentResult.payment.id : null,
            paymentApplied: paymentResult.paymentApplied,
            paymentAmount: paymentResult.paymentAmount
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
        const settings = await getCurrentSettings();

        const visit = await addVisit({
            propertyId: property.id,
            propertyName: property.name,
            date: property.lastEdged,
            work: ['edged'],
            paid: false,
            amount: 0,
            notes: '',
            cycleNumber: settings.currentCycleNumber
        });

        // Log the edged action
        await logEdged(property.id, property.name);

        return {
            property,
            previousLastEdged,
            visitId: visit.id
        };
    } catch (error) {
        console.error('Error handling property edged:', error);
        throw error;
    }
}

// ============================================
// Undo Mowed Action
// ============================================

async function undoMowed(propertyId, previousLastMowed, undoContext = {}) {
    try {
        const property = await getProperty(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        // Restore previous state
        property.lastMowed = previousLastMowed;
        property.mowedThisCycle = Boolean(undoContext.previousMowedThisCycle);
        property.cycleCompleted = Boolean(undoContext.previousCycleCompleted);
        property.cyclePaymentRecorded = Boolean(undoContext.previousCyclePaymentRecorded);
        property.lifetimeEarned = Number(undoContext.previousLifetimeEarned || property.lifetimeEarned || 0);
        
        await updateProperty(property);

        if (undoContext.paymentApplied && undoContext.paymentAmount > 0) {
            await subtractFromSavings(undoContext.paymentAmount);
            await addToCurrentCycleEarnings(-undoContext.paymentAmount);
            if (undoContext.paymentId) {
                await deletePayment(undoContext.paymentId);
            }
        }

        if (undoContext.visitId) {
            await deleteVisit(undoContext.visitId);
        }

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

async function undoEdged(propertyId, previousLastEdged, undoContext = {}) {
    try {
        const property = await getProperty(propertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        // Restore previous state
        property.lastEdged = previousLastEdged;
        
        await updateProperty(property);

        if (undoContext.visitId) {
            await deleteVisit(undoContext.visitId);
        }

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

        const mowedCount = activeProperties.filter(p => p.mowedThisCycle || p.cycleCompleted).length;
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
            if ((property.mowedThisCycle || property.cycleCompleted) && !property.lastMowed) {
                issues.push({
                    property: property.name,
                    issue: 'Completed this cycle but no mow date',
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
            if ((property.mowedThisCycle || property.cycleCompleted) && !property.lastMowed) {
                property.mowedThisCycle = false;
                property.cycleCompleted = false;
                property.cyclePaymentRecorded = false;
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

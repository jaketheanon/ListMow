// ============================================
// ListMow Properties Module
// Property management with validation
// ============================================

// ============================================
// Validation Functions
// ============================================

function validatePropertyName(name) {
    if (!name || typeof name !== 'string') {
        return { valid: false, error: 'Property name is required' };
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Property name cannot be blank' };
    }
    if (trimmed.length > 100) {
        return { valid: false, error: 'Property name is too long (max 100 characters)' };
    }
    return { valid: true, value: trimmed };
}

function validatePropertyAddress(address) {
    if (!address || typeof address !== 'string') {
        return { valid: true, value: '' };
    }
    const trimmed = address.trim();
    if (trimmed.length > 200) {
        return { valid: false, error: 'Address is too long (max 200 characters)' };
    }
    return { valid: true, value: trimmed };
}

function validatePropertyNotes(notes) {
    if (!notes || typeof notes !== 'string') {
        return { valid: true, value: '' };
    }
    const trimmed = notes.trim();
    if (trimmed.length > 500) {
        return { valid: false, error: 'Notes are too long (max 500 characters)' };
    }
    return { valid: true, value: trimmed };
}

function validatePropertyInterval(interval) {
    const num = parseInt(interval, 10);
    if (isNaN(num)) {
        return { valid: false, error: 'Interval must be a number' };
    }
    if (num < 3) {
        return { valid: false, error: 'Interval must be at least 3 days' };
    }
    if (num > 60) {
        return { valid: false, error: 'Interval must be at most 60 days' };
    }
    return { valid: true, value: num };
}

function validatePropertyDate(dateValue, option) {
    if (option === 'never') {
        return { valid: true, value: null };
    }
    if (option === 'today') {
        return { valid: true, value: new Date().toISOString() };
    }
    if (option === 'custom' && dateValue) {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            return { valid: false, error: 'Invalid date' };
        }
        // Don't allow future dates
        if (date > new Date()) {
            return { valid: false, error: 'Date cannot be in the future' };
        }
        return { valid: true, value: date.toISOString() };
    }
    return { valid: true, value: new Date().toISOString() };
}

async function validateUniqueName(name, excludeId = null) {
    const properties = await getAllProperties();
    const duplicate = properties.find(
        p => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId
    );
    if (duplicate) {
        return { valid: false, error: 'A property with this name already exists' };
    }
    return { valid: true };
}

async function validateUniqueAddress(address, excludeId = null) {
    if (!address) return { valid: true };
    const properties = await getAllProperties();
    const duplicate = properties.find(
        p => p.address && p.address.toLowerCase() === address.toLowerCase() && p.id !== excludeId
    );
    if (duplicate) {
        return { valid: false, error: 'A property with this address already exists' };
    }
    return { valid: true };
}

// ============================================
// Property Creation
// ============================================

async function createProperty(propertyData) {
    // Validate all fields
    const nameValidation = validatePropertyName(propertyData.name);
    if (!nameValidation.valid) {
        throw new Error(nameValidation.error);
    }

    const addressValidation = validatePropertyAddress(propertyData.address);
    if (!addressValidation.valid) {
        throw new Error(addressValidation.error);
    }

    const notesValidation = validatePropertyNotes(propertyData.notes);
    if (!notesValidation.valid) {
        throw new Error(notesValidation.error);
    }

    const intervalValidation = validatePropertyInterval(propertyData.interval);
    if (!intervalValidation.valid) {
        throw new Error(intervalValidation.error);
    }

    const dateValidation = validatePropertyDate(
        propertyData.customDate,
        propertyData.lastMowedOption
    );
    if (!dateValidation.valid) {
        throw new Error(dateValidation.error);
    }

    // Check for duplicates
    const uniqueNameValidation = await validateUniqueName(nameValidation.value);
    if (!uniqueNameValidation.valid) {
        throw new Error(uniqueNameValidation.error);
    }

    const uniqueAddressValidation = await validateUniqueAddress(addressValidation.value);
    if (!uniqueAddressValidation.valid) {
        throw new Error(uniqueAddressValidation.error);
    }

    // Create property
    const property = {
        name: nameValidation.value,
        address: addressValidation.value,
        notes: notesValidation.value,
        interval: intervalValidation.value,
        lastMowed: dateValidation.value,
        lastEdged: null,
        mowedThisCycle: dateValidation.value !== null,
        archived: false
    };

    return await addProperty(property);
}

// ============================================
// Property Update
// ============================================

async function updatePropertyData(id, propertyData) {
    const existing = await getProperty(id);
    if (!existing) {
        throw new Error('Property not found');
    }

    // Validate name if changed
    if (propertyData.name !== undefined) {
        const nameValidation = validatePropertyName(propertyData.name);
        if (!nameValidation.valid) {
            throw new Error(nameValidation.error);
        }
        const uniqueNameValidation = await validateUniqueName(nameValidation.value, id);
        if (!uniqueNameValidation.valid) {
            throw new Error(uniqueNameValidation.error);
        }
        existing.name = nameValidation.value;
    }

    // Validate address if changed
    if (propertyData.address !== undefined) {
        const addressValidation = validatePropertyAddress(propertyData.address);
        if (!addressValidation.valid) {
            throw new Error(addressValidation.error);
        }
        const uniqueAddressValidation = await validateUniqueAddress(addressValidation.value, id);
        if (!uniqueAddressValidation.valid) {
            throw new Error(uniqueAddressValidation.error);
        }
        existing.address = addressValidation.value;
    }

    // Validate notes if changed
    if (propertyData.notes !== undefined) {
        const notesValidation = validatePropertyNotes(propertyData.notes);
        if (!notesValidation.valid) {
            throw new Error(notesValidation.error);
        }
        existing.notes = notesValidation.value;
    }

    // Validate interval if changed
    if (propertyData.interval !== undefined) {
        const intervalValidation = validatePropertyInterval(propertyData.interval);
        if (!intervalValidation.valid) {
            throw new Error(intervalValidation.error);
        }
        existing.interval = intervalValidation.value;
    }

    // Validate date if changed
    if (propertyData.lastMowedOption !== undefined) {
        const dateValidation = validatePropertyDate(
            propertyData.customDate,
            propertyData.lastMowedOption
        );
        if (!dateValidation.valid) {
            throw new Error(dateValidation.error);
        }
        existing.lastMowed = dateValidation.value;
        existing.mowedThisCycle = dateValidation.value !== null;
    }

    return await updateProperty(existing);
}

// ============================================
// Priority Calculation
// ============================================

function calculatePriority(property) {
    if (!property.lastMowed) {
        return { score: 0, label: 'Never Mowed', color: 'red' };
    }

    const lastMowed = new Date(property.lastMowed);
    const today = new Date();
    const daysSinceMowed = Math.floor((today - lastMowed) / (1000 * 60 * 60 * 24));
    
    if (daysSinceMowed < 0) {
        return { score: 0, label: 'Future Date', color: 'red' };
    }

    const score = daysSinceMowed / property.interval;

    let label, color;
    if (score < 0.85) {
        label = 'Good';
        color = 'green';
    } else if (score < 1.0) {
        label = 'Due Soon';
        color = 'yellow';
    } else if (score < 1.25) {
        label = 'Due Today';
        color = 'orange';
    } else {
        label = 'Overdue';
        color = 'red';
    }

    return { score, label, color, daysSinceMowed };
}

// ============================================
// Property Sorting
// ============================================

function sortPropertiesByPriority(properties) {
    return properties.sort((a, b) => {
        const priorityA = calculatePriority(a);
        const priorityB = calculatePriority(b);

        // Never mowed properties go last
        if (!a.lastMowed && !b.lastMowed) return 0;
        if (!a.lastMowed) return 1;
        if (!b.lastMowed) return -1;

        // Sort by priority score (descending)
        if (priorityB.score !== priorityA.score) {
            return priorityB.score - priorityA.score;
        }

        // If same priority, sort by days since mowed (descending)
        if (priorityB.daysSinceMowed !== priorityA.daysSinceMowed) {
            return priorityB.daysSinceMowed - priorityA.daysSinceMowed;
        }

        // If still tied, sort by name alphabetically
        return a.name.localeCompare(b.name);
    });
}

// ============================================
// Property Filtering
// ============================================

function filterPropertiesBySearch(properties, query) {
    if (!query || query.trim().length === 0) {
        return properties;
    }

    const lowerQuery = query.toLowerCase();
    return properties.filter(property => {
        return (
            property.name.toLowerCase().includes(lowerQuery) ||
            (property.address && property.address.toLowerCase().includes(lowerQuery)) ||
            (property.notes && property.notes.toLowerCase().includes(lowerQuery))
        );
    });
}

// ============================================
// Property Status
// ============================================

function getDaysSinceMowed(property) {
    if (!property.lastMowed) return null;
    const lastMowed = new Date(property.lastMowed);
    const today = new Date();
    return Math.floor((today - lastMowed) / (1000 * 60 * 60 * 24));
}

function getDaysSinceEdged(property) {
    if (!property.lastEdged) return null;
    const lastEdged = new Date(property.lastEdged);
    const today = new Date();
    return Math.floor((today - lastEdged) / (1000 * 60 * 60 * 24));
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// ============================================
// Property Actions
// ============================================

async function markPropertyMowed(id) {
    const property = await getProperty(id);
    if (!property) {
        throw new Error('Property not found');
    }

    const previousLastMowed = property.lastMowed;
    property.lastMowed = new Date().toISOString();
    property.mowedThisCycle = true;

    await updateProperty(property);

    return { property, previousLastMowed };
}

async function markPropertyEdged(id) {
    const property = await getProperty(id);
    if (!property) {
        throw new Error('Property not found');
    }

    const previousLastEdged = property.lastEdged;
    property.lastEdged = new Date().toISOString();

    await updateProperty(property);

    return { property, previousLastEdged };
}

async function archiveProperty(id) {
    const property = await getProperty(id);
    if (!property) {
        throw new Error('Property not found');
    }

    property.archived = true;
    property.mowedThisCycle = false;

    await updateProperty(property);

    return property;
}

async function restoreProperty(id) {
    const property = await getProperty(id);
    if (!property) {
        throw new Error('Property not found');
    }

    property.archived = false;

    await updateProperty(property);

    return property;
}

// ============================================
// Queue Statistics
// ============================================

async function getQueueStatistics() {
    const activeProperties = await getActiveProperties();
    const sorted = sortPropertiesByPriority(activeProperties);

    const stats = {
        overdue: 0,
        dueToday: 0,
        dueSoon: 0,
        good: 0,
        total: sorted.length
    };

    for (const property of sorted) {
        const priority = calculatePriority(property);
        switch (priority.color) {
            case 'red':
                stats.overdue++;
                break;
            case 'orange':
                stats.dueToday++;
                break;
            case 'yellow':
                stats.dueSoon++;
                break;
            case 'green':
                stats.good++;
                break;
        }
    }

    return stats;
}

// ============================================
// Property Statistics
// ============================================

async function getPropertyStatistics() {
    const allProperties = await getAllProperties();
    const activeProperties = allProperties.filter(p => !p.archived);
    const archivedProperties = allProperties.filter(p => p.archived);

    // Find most overdue
    let mostOverdue = null;
    let maxOverdueScore = -1;

    for (const property of activeProperties) {
        const priority = calculatePriority(property);
        if (priority.score > maxOverdueScore) {
            maxOverdueScore = priority.score;
            mostOverdue = property;
        }
    }

    // Find longest and shortest intervals
    let longestInterval = null;
    let shortestInterval = null;
    let maxInterval = -1;
    let minInterval = Infinity;

    for (const property of activeProperties) {
        if (property.interval > maxInterval) {
            maxInterval = property.interval;
            longestInterval = property;
        }
        if (property.interval < minInterval) {
            minInterval = property.interval;
            shortestInterval = property;
        }
    }

    // Find newest and oldest properties
    let newestProperty = null;
    let oldestProperty = null;
    let newestDate = null;
    let oldestDate = null;

    for (const property of activeProperties) {
        const created = new Date(property.dateCreated);
        if (!newestDate || created > newestDate) {
            newestDate = created;
            newestProperty = property;
        }
        if (!oldestDate || created < oldestDate) {
            oldestDate = created;
            oldestProperty = property;
        }
    }

    return {
        mostOverdue: mostOverdue?.name || '-',
        longestInterval: longestInterval?.name || '-',
        shortestInterval: shortestInterval?.name || '-',
        newest: newestProperty?.name || '-',
        oldest: oldestProperty?.name || '-',
        activeCount: activeProperties.length,
        archivedCount: archivedProperties.length
    };
}

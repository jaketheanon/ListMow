// ============================================
// ListMow Statistics Module
// Comprehensive statistics calculations
// ============================================

// ============================================
// Get All Statistics
// ============================================

async function getAllStatistics() {
    try {
        const settings = await getCurrentSettings();
        const activeProperties = await getActiveProperties();
        const archivedProperties = await getArchivedProperties();
        const history = await getHistory(1000);

        const stats = {
            // Financial
            lifetimeSavings: settings.savings,
            completedCycles: settings.completedCycles,
            
            // Averages
            averageMowInterval: calculateAverageMowInterval(activeProperties),
            averageEdgeInterval: calculateAverageEdgeInterval(activeProperties),
            
            // Property insights
            mostOverdue: findMostOverdue(activeProperties),
            longestTargetInterval: findLongestInterval(activeProperties),
            shortestTargetInterval: findShortestInterval(activeProperties),
            mostFrequentlyMowed: findMostFrequentlyMowed(history),
            
            // Property age
            newestProperty: findNewestProperty(activeProperties),
            oldestProperty: findOldestProperty(activeProperties),
            
            // Counts
            activeCount: activeProperties.length,
            archivedCount: archivedProperties.length
        };

        return stats;
    } catch (error) {
        console.error('Error getting all statistics:', error);
        throw error;
    }
}

// ============================================
// Calculate Average Mow Interval
// ============================================

function calculateAverageMowInterval(properties) {
    if (properties.length === 0) {
        return 0;
    }

    const intervals = properties
        .filter(p => p.interval && p.interval > 0)
        .map(p => p.interval);

    if (intervals.length === 0) {
        return 0;
    }

    const sum = intervals.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / intervals.length);
}

// ============================================
// Calculate Average Edge Interval
// ============================================

function calculateAverageEdgeInterval(properties) {
    const propertiesWithEdges = properties.filter(p => p.lastEdged && p.lastMowed);
    
    if (propertiesWithEdges.length === 0) {
        return 0;
    }

    const intervals = propertiesWithEdges.map(p => {
        const lastMowed = new Date(p.lastMowed);
        const lastEdged = new Date(p.lastEdged);
        const diffDays = Math.abs(Math.floor((lastEdged - lastMowed) / (1000 * 60 * 60 * 24)));
        return diffDays;
    }).filter(i => i > 0 && i < 365); // Filter out unreasonable values

    if (intervals.length === 0) {
        return 0;
    }

    const sum = intervals.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / intervals.length);
}

// ============================================
// Find Most Overdue Property
// ============================================

function findMostOverdue(properties) {
    if (properties.length === 0) {
        return '-';
    }

    let mostOverdue = null;
    let maxScore = -1;

    for (const property of properties) {
        const priority = calculatePriority(property);
        if (priority.score > maxScore && property.lastMowed) {
            maxScore = priority.score;
            mostOverdue = property;
        }
    }

    return mostOverdue ? mostOverdue.name : '-';
}

// ============================================
// Find Longest Target Interval
// ============================================

function findLongestInterval(properties) {
    if (properties.length === 0) {
        return '-';
    }

    let longest = null;
    let maxInterval = -1;

    for (const property of properties) {
        if (property.interval > maxInterval) {
            maxInterval = property.interval;
            longest = property;
        }
    }

    return longest ? longest.name : '-';
}

// ============================================
// Find Shortest Target Interval
// ============================================

function findShortestInterval(properties) {
    if (properties.length === 0) {
        return '-';
    }

    let shortest = null;
    let minInterval = Infinity;

    for (const property of properties) {
        if (property.interval < minInterval) {
            minInterval = property.interval;
            shortest = property;
        }
    }

    return shortest ? shortest.name : '-';
}

// ============================================
// Find Most Frequently Mowed Property
// ============================================

function findMostFrequentlyMowed(history) {
    const mowedHistory = history.filter(h => h.type === 'mowed' && h.propertyName);
    
    if (mowedHistory.length === 0) {
        return '-';
    }

    const counts = {};
    for (const entry of mowedHistory) {
        counts[entry.propertyName] = (counts[entry.propertyName] || 0) + 1;
    }

    let mostFrequent = null;
    let maxCount = 0;

    for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            mostFrequent = name;
        }
    }

    return mostFrequent || '-';
}

// ============================================
// Find Newest Property
// ============================================

function findNewestProperty(properties) {
    if (properties.length === 0) {
        return '-';
    }

    let newest = null;
    let newestDate = null;

    for (const property of properties) {
        const created = new Date(property.dateCreated);
        if (!newestDate || created > newestDate) {
            newestDate = created;
            newest = property;
        }
    }

    return newest ? newest.name : '-';
}

// ============================================
// Find Oldest Property
// ============================================

function findOldestProperty(properties) {
    if (properties.length === 0) {
        return '-';
    }

    let oldest = null;
    let oldestDate = null;

    for (const property of properties) {
        const created = new Date(property.dateCreated);
        if (!oldestDate || created < oldestDate) {
            oldestDate = created;
            oldest = property;
        }
    }

    return oldest ? oldest.name : '-';
}

// ============================================
// Format Statistics for Display
// ============================================

function formatStatistics(stats) {
    return {
        ...stats,
        lifetimeSavings: `$${stats.lifetimeSavings.toFixed(2)}`,
        averageMowInterval: stats.averageMowInterval > 0 
            ? `${stats.averageMowInterval} days` 
            : '-',
        averageEdgeInterval: stats.averageEdgeInterval > 0 
            ? `${stats.averageEdgeInterval} days` 
            : '-'
    };
}

// ============================================
// Get Queue Statistics
// ============================================

async function getQueueStatistics() {
    try {
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
    } catch (error) {
        console.error('Error getting queue statistics:', error);
        throw error;
    }
}

// ============================================
// Get Property Statistics
// ============================================

async function getPropertyStatistics() {
    try {
        const allProperties = await getAllProperties();
        const activeProperties = allProperties.filter(p => p.status === 'active' && !p.archived);
        const archivedProperties = allProperties.filter(p => p.archived || p.status === 'sold');

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
    } catch (error) {
        console.error('Error getting property statistics:', error);
        throw error;
    }
}

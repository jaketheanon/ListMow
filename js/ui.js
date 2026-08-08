// ============================================
// ListMow UI Module
// UI rendering and interactions
// ============================================

// ============================================
// State
// ============================================

let currentScreen = 'home';
let currentPropertyId = null;
let showingArchived = false;
let toastTimeout = null;
let toastUndoCallback = null;

// ============================================
// Initialization
// ============================================

function initUI() {
    setupNavigation();
    setupPropertyModal();
    setupPropertyDetailModal();
    setupSearch();
    setupSettings();
    setupHistory();
    refreshHomeScreen();
}

// ============================================
// Navigation
// ============================================

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            navigateTo(screen);
        });
    });
}

function navigateTo(screen) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        item.removeAttribute('aria-current');
        if (item.dataset.screen === screen) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
        }
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
    });
    document.getElementById(`${screen}-screen`).classList.add('active');

    currentScreen = screen;

    // Refresh screen content
    refreshCurrentScreen();
}

function refreshCurrentScreen() {
    switch (currentScreen) {
        case 'home':
            refreshHomeScreen();
            break;
        case 'properties':
            refreshPropertiesScreen();
            break;
        case 'history':
            refreshHistoryScreen();
            break;
        case 'statistics':
            refreshStatisticsScreen();
            break;
        case 'settings':
            refreshSettingsScreen();
            break;
    }
}

// ============================================
// Home Screen
// ============================================

async function refreshHomeScreen() {
    try {
        const settings = await getCurrentSettings();
        const queueStats = await getQueueStatistics();
        const activeProperties = await getActiveProperties();
        const sorted = sortPropertiesByPriority(activeProperties);

        // Update dashboard
        document.getElementById('savings-value').textContent = `$${settings.savings.toFixed(2)}`;
        document.getElementById('cycles-value').textContent = settings.completedCycles;
        document.getElementById('active-properties-value').textContent = activeProperties.length;

        // Update queue summary
        document.getElementById('queue-overdue').textContent = queueStats.overdue;
        document.getElementById('queue-due-today').textContent = queueStats.dueToday;
        document.getElementById('queue-due-soon').textContent = queueStats.dueSoon;
        document.getElementById('queue-good').textContent = queueStats.good;

        // Render queue
        const queueContainer = document.getElementById('today-queue');
        const emptyState = document.getElementById('empty-queue');

        if (sorted.length === 0) {
            queueContainer.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            queueContainer.innerHTML = sorted.map(property => createPropertyCard(property)).join('');
        }
    } catch (error) {
        console.error('Error refreshing home screen:', error);
    }
}

// ============================================
// Properties Screen
// ============================================

async function refreshPropertiesScreen() {
    try {
        const properties = showingArchived 
            ? await getArchivedProperties()
            : await getActiveProperties();

        const sorted = sortPropertiesByPriority(properties);
        const container = document.getElementById('properties-list');
        const emptyState = document.getElementById('empty-properties');

        if (sorted.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = sorted.map(property => createPropertyCard(property)).join('');
        }

        // Update archived button
        const archivedBtn = document.getElementById('show-archived-btn');
        archivedBtn.innerHTML = showingArchived 
            ? '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> Active'
            : '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 8l6 6M19 8l-6 6M5 12h14"/></svg> Archived';
    } catch (error) {
        console.error('Error refreshing properties screen:', error);
    }
}

// ============================================
// History Screen
// ============================================

async function refreshHistoryScreen() {
    try {
        const history = await getFormattedHistory(100);
        const container = document.getElementById('history-list');
        const emptyState = document.getElementById('empty-history');

        if (history.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = history.map(entry => createHistoryItem(entry)).join('');
        }
    } catch (error) {
        console.error('Error refreshing history screen:', error);
    }
}

// ============================================
// Statistics Screen
// ============================================

async function refreshStatisticsScreen() {
    try {
        const stats = formatStatistics(await getAllStatistics());

        document.getElementById('stat-savings').textContent = stats.lifetimeSavings;
        document.getElementById('stat-cycles').textContent = stats.completedCycles;
        document.getElementById('stat-avg-mow').textContent = stats.averageMowInterval;
        document.getElementById('stat-avg-edge').textContent = stats.averageEdgeInterval;
        document.getElementById('stat-overdue').textContent = stats.mostOverdue;
        document.getElementById('stat-longest-interval').textContent = stats.longestTargetInterval;
        document.getElementById('stat-shortest-interval').textContent = stats.shortestTargetInterval;
        document.getElementById('stat-most-mowed').textContent = stats.mostFrequentlyMowed;
        document.getElementById('stat-newest').textContent = stats.newest;
        document.getElementById('stat-oldest').textContent = stats.oldest;
        document.getElementById('stat-active').textContent = stats.activeCount;
        document.getElementById('stat-archived').textContent = stats.archivedCount;
    } catch (error) {
        console.error('Error refreshing statistics screen:', error);
    }
}

// ============================================
// Settings Screen
// ============================================

async function refreshSettingsScreen() {
    try {
        const settings = await getCurrentSettings();
        
        document.getElementById('round-value').value = settings.roundValue;
        document.getElementById('current-savings').value = settings.savings;
        document.getElementById('completed-cycles').value = settings.completedCycles;
    } catch (error) {
        console.error('Error refreshing settings screen:', error);
    }
}

// ============================================
// Property Card Creation
// ============================================

function createPropertyCard(property) {
    const priority = calculatePriority(property);
    const daysSinceMowed = getDaysSinceMowed(property);
    const daysSinceEdged = getDaysSinceEdged(property);
    const hasNotes = property.notes && property.notes.trim().length > 0;

    return `
        <div class="property-card priority-${priority.color}" data-property-id="${property.id}">
            <div class="property-header">
                <span class="property-name">${escapeHtml(property.name)}</span>
                <span class="property-priority ${priority.color}">${priority.label}</span>
            </div>
            ${property.address ? `<div class="property-address">${escapeHtml(property.address)}</div>` : ''}
            <div class="property-stats">
                <span class="property-stat"><strong>Priority:</strong> ${priority.score.toFixed(2)}</span>
                <span class="property-stat"><strong>Days:</strong> ${daysSinceMowed !== null ? daysSinceMowed : 'Never'}</span>
                <span class="property-stat"><strong>Interval:</strong> ${property.interval}d</span>
            </div>
            <div class="property-status">
                ${daysSinceMowed !== null ? `<span class="status-badge mowed">Last: ${formatDate(property.lastMowed)}</span>` : '<span class="status-badge">Never mowed</span>'}
            </div>
            ${hasNotes ? `
                <div class="notes-indicator">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"/>
                    </svg>
                    Has notes
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// History Item Creation
// ============================================

function createHistoryItem(entry) {
    const isCycleComplete = entry.type === 'cycle_complete';
    const isUndo = entry.type.includes('undo');

    return `
        <div class="history-item">
            <div class="history-header">
                <span class="history-property">${entry.propertyName || 'System'}</span>
                <span class="history-time">${entry.timeAgo}</span>
            </div>
            <div class="history-action ${isCycleComplete ? 'cycle-complete' : ''} ${isUndo ? 'undo' : ''}">
                ${entry.details}
            </div>
        </div>
    `;
}

// ============================================
// Property Modal
// ============================================

function setupPropertyModal() {
    const modal = document.getElementById('property-modal');
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const form = document.getElementById('property-form');
    const lastMowedSelect = document.getElementById('property-last-mowed');
    const customDateGroup = document.getElementById('custom-date-group');

    // Open modal
    document.getElementById('add-property-btn').addEventListener('click', () => {
        openPropertyModal();
    });

    // Close handlers
    overlay.addEventListener('click', () => closePropertyModal());
    closeBtn.addEventListener('click', () => closePropertyModal());
    cancelBtn.addEventListener('click', () => closePropertyModal());

    // Last mowed option change
    lastMowedSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDateGroup.classList.remove('hidden');
        } else {
            customDateGroup.classList.add('hidden');
        }
    });

    // Form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handlePropertyFormSubmit();
    });

    // Property card clicks
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.property-card');
        if (card) {
            const propertyId = card.dataset.propertyId;
            openPropertyDetailModal(propertyId);
        }
    });
}

function openPropertyModal(property = null) {
    const modal = document.getElementById('property-modal');
    const form = document.getElementById('property-form');
    const title = document.getElementById('modal-title');

    if (property) {
        title.textContent = 'Edit Property';
        document.getElementById('property-id').value = property.id;
        document.getElementById('property-name').value = property.name;
        document.getElementById('property-address').value = property.address || '';
        document.getElementById('property-notes').value = property.notes || '';
        document.getElementById('property-interval').value = property.interval;
        
        // Set last mowed option
        const lastMowedSelect = document.getElementById('property-last-mowed');
        const customDateGroup = document.getElementById('custom-date-group');
        
        if (!property.lastMowed) {
            lastMowedSelect.value = 'never';
            customDateGroup.classList.add('hidden');
        } else {
            const lastMowed = new Date(property.lastMowed);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            lastMowed.setHours(0, 0, 0, 0);
            
            if (lastMowed.getTime() === today.getTime()) {
                lastMowedSelect.value = 'today';
                customDateGroup.classList.add('hidden');
            } else {
                lastMowedSelect.value = 'custom';
                customDateGroup.classList.remove('hidden');
                document.getElementById('custom-mowed-date').value = property.lastMowed.split('T')[0];
            }
        }
    } else {
        title.textContent = 'Add Property';
        form.reset();
        document.getElementById('property-id').value = '';
        document.getElementById('property-interval').value = 7;
        document.getElementById('property-last-mowed').value = 'today';
        document.getElementById('custom-date-group').classList.add('hidden');
    }

    modal.classList.remove('hidden');
}

function closePropertyModal() {
    const modal = document.getElementById('property-modal');
    modal.classList.add('hidden');
}

async function handlePropertyFormSubmit() {
    try {
        const propertyId = document.getElementById('property-id').value;
        const name = document.getElementById('property-name').value;
        const address = document.getElementById('property-address').value;
        const notes = document.getElementById('property-notes').value;
        const interval = parseInt(document.getElementById('property-interval').value, 10);
        const lastMowedOption = document.getElementById('property-last-mowed').value;
        const customDate = document.getElementById('custom-mowed-date').value;

        const propertyData = {
            name,
            address,
            notes,
            interval,
            lastMowedOption,
            customDate
        };

        if (propertyId) {
            await updatePropertyData(propertyId, propertyData);
            await logPropertyEdited(propertyId, name);
            showToast('Property updated');
        } else {
            const newProperty = await createProperty(propertyData);
            await logPropertyAdded(newProperty.id, newProperty.name);
            showToast('Property added');
        }

        closePropertyModal();
        refreshCurrentScreen();
    } catch (error) {
        showToast(error.message, null, 5000);
    }
}

// ============================================
// Property Detail Modal
// ============================================

function setupPropertyDetailModal() {
    const modal = document.getElementById('property-detail-modal');
    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = document.getElementById('close-detail-modal');

    overlay.addEventListener('click', () => {
        modal.classList.add('hidden');
        currentPropertyId = null;
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        currentPropertyId = null;
    });

    // Setup action buttons
    document.getElementById('mow-today-btn').addEventListener('click', handleMowToday);
    document.getElementById('edge-today-btn').addEventListener('click', handleEdgeToday);
    document.getElementById('edit-property-btn').addEventListener('click', handleEditProperty);
    document.getElementById('archive-property-btn').addEventListener('click', handleArchiveProperty);
    document.getElementById('delete-property-btn').addEventListener('click', handleDeleteProperty);
}

async function openPropertyDetailModal(propertyId) {
    try {
        const property = await getProperty(propertyId);
        if (!property) {
            showToast('Property not found');
            return;
        }

        currentPropertyId = propertyId;

        const priority = calculatePriority(property);
        const daysSinceMowed = getDaysSinceMowed(property);
        const daysSinceEdged = getDaysSinceEdged(property);

        document.getElementById('detail-property-name').textContent = property.name;
        document.getElementById('detail-address').textContent = property.address || '-';
        document.getElementById('detail-priority').textContent = `${priority.label} (${priority.score.toFixed(2)})`;
        document.getElementById('detail-days-mowed').textContent = daysSinceMowed !== null ? daysSinceMowed : 'Never';
        document.getElementById('detail-days-edged').textContent = daysSinceEdged !== null ? daysSinceEdged : 'Never';
        document.getElementById('detail-interval').textContent = `${property.interval} days`;
        document.getElementById('detail-last-mowed-date').textContent = formatDate(property.lastMowed);
        document.getElementById('detail-last-edged-date').textContent = formatDate(property.lastEdged);
        document.getElementById('detail-notes').textContent = property.notes || '-';

        // Update archive button text
        const archiveBtn = document.getElementById('archive-property-btn');
        if (property.archived) {
            archiveBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 13l4 4L19 7"/>
                </svg>
                Restore
            `;
        } else {
            archiveBtn.innerHTML = `
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M5 8l6 6M19 8l-6 6M5 12h14"/>
                </svg>
                Archive
            `;
        }

        const modal = document.getElementById('property-detail-modal');
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening property detail modal:', error);
        showToast('Error loading property');
    }
}

// ============================================
// Property Actions
// ============================================

async function handleMowToday() {
    if (!currentPropertyId) return;

    try {
        const result = await handlePropertyMowed(currentPropertyId);
        if (!result) return;

        const { property, cycleComplete, savingsAmount, previousLastMowed } = result;

        if (cycleComplete) {
            showCycleCompleteAnimation(savingsAmount);
            await refreshHomeScreen();
        } else {
            showToast(`${property.name} marked as mowed`, async () => {
                await undoMowed(property.id, previousLastMowed);
                showToast('Mowed action undone');
                await refreshCurrentScreen();
            });
        }

        const modal = document.getElementById('property-detail-modal');
        modal.classList.add('hidden');
        currentPropertyId = null;

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error handling mow today:', error);
        showToast(error.message);
    }
}

async function handleEdgeToday() {
    if (!currentPropertyId) return;

    try {
        const result = await handlePropertyEdged(currentPropertyId);
        if (!result) return;

        const { property, previousLastEdged } = result;

        showToast(`${property.name} marked as edged`, async () => {
            await undoEdged(property.id, previousLastEdged);
            showToast('Edged action undone');
            await refreshCurrentScreen();
        });

        const modal = document.getElementById('property-detail-modal');
        modal.classList.add('hidden');
        currentPropertyId = null;

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error handling edge today:', error);
        showToast(error.message);
    }
}

async function handleEditProperty() {
    if (!currentPropertyId) return;

    try {
        const property = await getProperty(currentPropertyId);
        if (!property) return;

        const detailModal = document.getElementById('property-detail-modal');
        detailModal.classList.add('hidden');

        openPropertyModal(property);
    } catch (error) {
        console.error('Error handling edit property:', error);
        showToast('Error loading property');
    }
}

async function handleArchiveProperty() {
    if (!currentPropertyId) return;

    try {
        const property = await getProperty(currentPropertyId);
        if (!property) return;

        if (property.archived) {
            await restoreProperty(currentPropertyId);
            await logPropertyRestored(currentPropertyId, property.name);
            showToast('Property restored');
        } else {
            await archiveProperty(currentPropertyId);
            await logPropertyArchived(currentPropertyId, property.name);
            showToast('Property archived');
        }

        const modal = document.getElementById('property-detail-modal');
        modal.classList.add('hidden');
        currentPropertyId = null;

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error handling archive property:', error);
        showToast(error.message);
    }
}

async function handleDeleteProperty() {
    if (!currentPropertyId) return;

    if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) {
        return;
    }

    try {
        const property = await getProperty(currentPropertyId);
        if (!property) return;

        await deleteProperty(currentPropertyId);
        await logPropertyDeleted(currentPropertyId, property.name);
        showToast('Property deleted');

        const modal = document.getElementById('property-detail-modal');
        modal.classList.add('hidden');
        currentPropertyId = null;

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error handling delete property:', error);
        showToast(error.message);
    }
}

// ============================================
// Search
// ============================================

function setupSearch() {
    const searchInput = document.getElementById('property-search');
    let searchTimeout = null;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 300);
    });

    document.getElementById('show-archived-btn').addEventListener('click', () => {
        showingArchived = !showingArchived;
        refreshPropertiesScreen();
    });
}

async function handleSearch(query) {
    try {
        const properties = showingArchived 
            ? await getArchivedProperties()
            : await getActiveProperties();

        const filtered = filterPropertiesBySearch(properties, query);
        const sorted = sortPropertiesByPriority(filtered);

        const container = document.getElementById('properties-list');
        const emptyState = document.getElementById('empty-properties');

        if (sorted.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            container.innerHTML = sorted.map(property => createPropertyCard(property)).join('');
        }
    } catch (error) {
        console.error('Error handling search:', error);
    }
}

// ============================================
// Settings
// ============================================

function setupSettings() {
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);
    document.getElementById('backup-db-btn').addEventListener('click', handleBackupDatabase);
    document.getElementById('restore-db-btn').addEventListener('click', handleRestoreDatabase);
    document.getElementById('reset-db-btn').addEventListener('click', handleResetDatabase);
}

async function handleSaveSettings() {
    try {
        const roundValue = document.getElementById('round-value').value;
        const savings = document.getElementById('current-savings').value;
        const completedCycles = document.getElementById('completed-cycles').value;

        await updateAllSettings({
            roundValue,
            savings,
            completedCycles
        });

        await logSettingsUpdated();
        showToast('Settings saved');
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast(error.message);
    }
}

async function handleBackupDatabase() {
    try {
        const backup = await backupDatabase();
        const blob = new Blob([backup], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `listmow-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Database backed up');
    } catch (error) {
        console.error('Error backing up database:', error);
        showToast('Error backing up database');
    }
}

async function handleRestoreDatabase() {
    const fileInput = document.getElementById('restore-file-input');
    fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            await restoreDatabase(text);
            await logDatabaseRestored();
            showToast('Database restored');
            refreshCurrentScreen();
        } catch (error) {
            console.error('Error restoring database:', error);
            showToast(error.message);
        }

        fileInput.value = '';
    };
}

async function handleResetDatabase() {
    if (!confirm('Are you sure you want to reset the database? This will delete all data and cannot be undone.')) {
        return;
    }

    if (!confirm('This is your last chance. All data will be permanently deleted. Continue?')) {
        return;
    }

    try {
        await resetDatabase();
        await logDatabaseReset();
        showToast('Database reset');
        refreshCurrentScreen();
    } catch (error) {
        console.error('Error resetting database:', error);
        showToast('Error resetting database');
    }
}

// ============================================
// History
// ============================================

function setupHistory() {
    document.getElementById('clear-history-btn').addEventListener('click', handleClearHistory);
}

async function handleClearHistory() {
    if (!confirm('Are you sure you want to clear all history?')) {
        return;
    }

    try {
        await clearHistory();
        showToast('History cleared');
        refreshHistoryScreen();
    } catch (error) {
        console.error('Error clearing history:', error);
        showToast('Error clearing history');
    }
}

// ============================================
// Toast Notification
// ============================================

function showToast(message, undoCallback = null, duration = 5000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastUndo = document.getElementById('toast-undo');

    // Clear existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Clear existing undo callback
    if (toastUndoCallback) {
        toastUndoCallback = null;
    }

    toastMessage.textContent = message;

    if (undoCallback) {
        toastUndo.classList.remove('hidden');
        toastUndoCallback = undoCallback;
    } else {
        toastUndo.classList.add('hidden');
    }

    toast.classList.remove('hidden');
    toast.classList.add('show');

    toastTimeout = setTimeout(() => {
        hideToast();
    }, duration);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('show');
    toastTimeout = setTimeout(() => {
        toast.classList.add('hidden');
        toastUndoCallback = null;
    }, 250);
}

// Setup undo button
document.getElementById('toast-undo').addEventListener('click', () => {
    if (toastUndoCallback) {
        toastUndoCallback();
        hideToast();
    }
});

// ============================================
// Cycle Complete Animation
// ============================================

function showCycleCompleteAnimation(savingsAmount) {
    const cycleComplete = document.getElementById('cycle-complete');
    const cycleSavings = document.getElementById('cycle-savings');

    cycleSavings.textContent = `+$${savingsAmount}`;
    cycleComplete.classList.remove('hidden');

    setTimeout(() => {
        cycleComplete.classList.add('hidden');
    }, 3000);
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

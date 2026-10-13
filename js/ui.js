// ============================================
// ListMow UI Module
// UI rendering and interactions
// ============================================

// ============================================
// State
// ============================================

const APP_VERSION = 'v2.2.0';

let currentScreen = 'home';
let currentPropertyId = null;
let showingArchived = false;
let propertyStatusFilter = 'active';
let toastTimeout = null;
let toastUndoCallback = null;

// ============================================
// Initialization
// ============================================

function initUI() {
    setupBrowserHistory();
    setupNavigation();
    setupPropertyModal();
    setupPropertyDetailModal();
    setupVisitModal();
    setupSearch();
    setupSettings();
    setupHistory();
    refreshHomeScreen();
}

// ============================================
// Navigation
// ============================================

function setupBrowserHistory() {
    if (!window.history || !window.history.replaceState) {
        return;
    }

    window.history.replaceState({ listmow: true, screen: currentScreen }, '', window.location.href);

    window.addEventListener('popstate', (event) => {
        const screen = event.state && event.state.screen ? event.state.screen : 'home';
        navigateTo(screen, { pushHistory: false });
    });
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const screen = item.dataset.screen;
            navigateTo(screen);
        });
    });

    const historyHomeBtn = document.getElementById('history-home-btn');
    if (historyHomeBtn) {
        historyHomeBtn.addEventListener('click', () => navigateTo('home'));
    }
}

function navigateTo(screen, options = {}) {
    const { pushHistory = true } = options;
    const previousScreen = currentScreen;

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

    if (pushHistory && screen !== previousScreen && window.history && window.history.pushState) {
        window.history.pushState({ listmow: true, screen }, '', window.location.href);
    }

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

function getStatusLabel(status) {
    if (typeof getPropertyStatusLabel === 'function') {
        return getPropertyStatusLabel(status);
    }
    const labels = { active: 'Active', paused: 'Paused', sold: 'Sold' };
    return labels[status] || 'Active';
}

function getStatusIcon(status) {
    const icons = {
        active: '<path d="M5 13l4 4L19 7"/>',
        paused: '<path d="M10 4H6v16h4V4zM18 4h-4v16h4V4z"/>',
        sold: '<path d="M5 8l6 6M19 8l-6 6M5 12h14"/>'
    };
    return icons[status] || icons.active;
}

function statusFilterOrder() {
    return ['active', 'paused', 'sold'];
}

function cyclePropertyStatusFilter() {
    const order = statusFilterOrder();
    const currentIndex = order.indexOf(propertyStatusFilter);
    propertyStatusFilter = order[(currentIndex + 1) % order.length];
    showingArchived = propertyStatusFilter === 'sold';
}

async function getPropertiesForStatusFilter() {
    switch (propertyStatusFilter) {
        case 'paused':
            return await getPausedProperties();
        case 'sold':
            return await getArchivedProperties();
        case 'active':
        default:
            return await getActiveProperties();
    }
}

function updatePropertyFilterButton() {
    const filterBtn = document.getElementById('show-archived-btn');
    if (!filterBtn) return;
    const label = getStatusLabel(propertyStatusFilter);
    filterBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${getStatusIcon(propertyStatusFilter)}</svg> ${label}`;
    filterBtn.setAttribute('aria-label', `Showing ${label.toLowerCase()} properties. Tap to change status filter.`);
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

        const completedThisCycle = activeProperties.filter(property => property.mowedThisCycle || property.cycleCompleted).length;
        const totalThisCycle = activeProperties.length;
        const remainingThisCycle = activeProperties
            .filter(property => !(property.mowedThisCycle || property.cycleCompleted))
            .map(property => property.name);

        const cycleProgressValue = document.getElementById('cycle-progress-value');
        const cycleProgressSubtext = document.getElementById('cycle-progress-subtext');
        if (cycleProgressValue) {
            cycleProgressValue.textContent = `${completedThisCycle} / ${totalThisCycle}`;
        }
        if (cycleProgressSubtext) {
            cycleProgressSubtext.textContent = remainingThisCycle.length > 0
                ? `${remainingThisCycle.length} remaining: ${remainingThisCycle.join(', ')}`
                : 'Cycle complete';
        }

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
        const properties = await getPropertiesForStatusFilter();
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

        updatePropertyFilterButton();
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
        
        const versionLabel = document.getElementById('app-version-label');
        if (versionLabel) {
            versionLabel.textContent = `ListMow ${APP_VERSION}`;
        }

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
    const status = typeof getPropertyStatus === 'function'
        ? getPropertyStatus(property)
        : (property.archived ? 'sold' : (property.status || 'active'));
    const statusLabel = getStatusLabel(status);
    const priorityLabel = status === 'active' ? priority.label : statusLabel;

    return `
        <div class="property-card priority-${priority.color} status-${status}" data-property-id="${property.id}">
            <div class="property-header">
                <span class="property-name">${escapeHtml(property.name)}</span>
                <span class="property-priority ${priority.color}">${priorityLabel}</span>
            </div>
            ${property.address ? `<div class="property-address">${escapeHtml(property.address)}</div>` : ''}
            <div class="property-stats">
                <span class="property-stat"><strong>Priority:</strong> ${priority.score.toFixed(2)}</span>
                <span class="property-stat"><strong>Days:</strong> ${daysSinceMowed !== null ? daysSinceMowed : 'Never'}</span>
                <span class="property-stat"><strong>Interval:</strong> ${property.interval}d</span>
            </div>
            <div class="property-status">
                <span class="status-badge status-${status}">${statusLabel}</span>
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

function getHistoryDisplayDetails(entry) {
    const details = String(entry.details || '');

    if (entry.type === 'cycle_complete' && details.includes('+$260')) {
        return details.replace('Cycle complete!', 'Legacy cycle complete:') + ' (old round payout)';
    }

    return details;
}

function createHistoryItem(entry) {
    const isCycleComplete = entry.type === 'cycle_complete';
    const isUndo = entry.type.includes('undo');
    const details = getHistoryDisplayDetails(entry);

    return `
        <div class="history-item">
            <div class="history-header">
                <span class="history-property">${escapeHtml(entry.propertyName || 'System')}</span>
                <span class="history-time">${escapeHtml(entry.timeAgo)}</span>
            </div>
            <div class="history-action ${isCycleComplete ? 'cycle-complete' : ''} ${isUndo ? 'undo' : ''}">
                ${escapeHtml(details)}
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
    const recordVisitBtn = document.getElementById('record-visit-btn');
    if (recordVisitBtn) {
        recordVisitBtn.addEventListener('click', openRecordVisitModal);
    }

    const mowTodayBtn = document.getElementById('mow-today-btn');
    if (mowTodayBtn) {
        mowTodayBtn.addEventListener('click', handleMowToday);
    }

    const edgeTodayBtn = document.getElementById('edge-today-btn');
    if (edgeTodayBtn) {
        edgeTodayBtn.addEventListener('click', handleEdgeToday);
    }

    document.getElementById('edit-property-btn').addEventListener('click', handleEditProperty);
    document.getElementById('activate-property-btn').addEventListener('click', () => handlePropertyStatusChange('active'));
    document.getElementById('pause-property-btn').addEventListener('click', () => handlePropertyStatusChange('paused'));
    document.getElementById('sold-property-btn').addEventListener('click', () => handlePropertyStatusChange('sold'));
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
        const detailPayment = document.getElementById('detail-payment');
        if (detailPayment) {
            detailPayment.textContent = `$${Number(property.paymentPerVisit || 0).toFixed(0)} per paid visit`;
        }
        const status = typeof getPropertyStatus === 'function'
            ? getPropertyStatus(property)
            : (property.archived ? 'sold' : (property.status || 'active'));
        const detailStatus = document.getElementById('detail-status');
        if (detailStatus) {
            detailStatus.textContent = getStatusLabel(status);
        }
        document.getElementById('detail-last-mowed-date').textContent = formatDate(property.lastMowed);
        document.getElementById('detail-last-edged-date').textContent = formatDate(property.lastEdged);
        document.getElementById('detail-notes').textContent = property.notes || '-';

        updateStatusActionButtons(status);

        const modal = document.getElementById('property-detail-modal');
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening property detail modal:', error);
        showToast('Error loading property');
    }
}


function updateStatusActionButtons(status) {
    const activateBtn = document.getElementById('activate-property-btn');
    const pauseBtn = document.getElementById('pause-property-btn');
    const soldBtn = document.getElementById('sold-property-btn');
    const recordVisitBtn = document.getElementById('record-visit-btn');

    if (activateBtn) activateBtn.disabled = status === 'active';
    if (pauseBtn) pauseBtn.disabled = status === 'paused';
    if (soldBtn) soldBtn.disabled = status === 'sold';

    if (recordVisitBtn) {
        recordVisitBtn.disabled = status === 'sold';
        recordVisitBtn.title = status === 'sold'
            ? 'Sold properties are kept for history only. Set Active first to record new work.'
            : '';
    }
}

// ============================================
// Record Visit Modal
// ============================================

function setupVisitModal() {
    const modal = document.getElementById('visit-modal');
    if (!modal) return;

    const overlay = modal.querySelector('.modal-overlay');
    const closeBtn = document.getElementById('close-visit-modal');
    const cancelBtn = document.getElementById('cancel-visit-modal');
    const form = document.getElementById('visit-form');
    const dateOption = document.getElementById('visit-date-option');
    const paidCheckbox = document.getElementById('visit-paid');
    const paymentAmount = document.getElementById('visit-payment-amount');
    const noWorkCheckbox = document.getElementById('visit-work-none');
    const workCheckboxes = [
        document.getElementById('visit-work-mowed'),
        document.getElementById('visit-work-edged'),
        document.getElementById('visit-work-weed'),
        document.getElementById('visit-work-blower')
    ].filter(Boolean);

    const closeVisit = () => closeVisitModal();
    overlay.addEventListener('click', closeVisit);
    closeBtn.addEventListener('click', closeVisit);
    cancelBtn.addEventListener('click', closeVisit);
    form.addEventListener('submit', handleVisitFormSubmit);

    dateOption.addEventListener('change', () => {
        document.getElementById('visit-custom-date-group').classList.toggle('hidden', dateOption.value !== 'custom');
    });

    paidCheckbox.addEventListener('change', async () => {
        const property = currentPropertyId ? await getProperty(currentPropertyId) : null;
        if (paidCheckbox.checked) {
            if (Number(paymentAmount.value || 0) <= 0 && property) {
                paymentAmount.value = Number(property.paymentPerVisit || 0);
            }
            paymentAmount.disabled = false;
        } else {
            paymentAmount.value = 0;
            paymentAmount.disabled = true;
        }
    });

    if (noWorkCheckbox) {
        noWorkCheckbox.addEventListener('change', () => {
            if (noWorkCheckbox.checked) {
                workCheckboxes.forEach(checkbox => { checkbox.checked = false; });
                paidCheckbox.checked = false;
                paymentAmount.value = 0;
                paymentAmount.disabled = true;
            }
        });
    }

    workCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked && noWorkCheckbox) {
                noWorkCheckbox.checked = false;
            }
        });
    });
}

function closeVisitModal() {
    const modal = document.getElementById('visit-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function localDateInputValue(date = new Date()) {
    const copy = new Date(date);
    const offset = copy.getTimezoneOffset();
    copy.setMinutes(copy.getMinutes() - offset);
    return copy.toISOString().split('T')[0];
}

function visitDateFromForm() {
    const option = document.getElementById('visit-date-option').value;
    const date = new Date();

    if (option === 'yesterday') {
        date.setDate(date.getDate() - 1);
        return date.toISOString();
    }

    if (option === 'custom') {
        const custom = document.getElementById('visit-custom-date').value;
        if (!custom) {
            throw new Error('Choose a visit date');
        }
        const customDate = new Date(`${custom}T12:00:00`);
        if (customDate > new Date()) {
            throw new Error('Visit date cannot be in the future');
        }
        return customDate.toISOString();
    }

    return date.toISOString();
}

function selectedVisitWork() {
    const fields = [
        'visit-work-mowed',
        'visit-work-edged',
        'visit-work-weed',
        'visit-work-blower',
        'visit-work-check',
        'visit-work-none'
    ];

    return fields
        .map(id => document.getElementById(id))
        .filter(field => field && field.checked)
        .map(field => field.value);
}

function visitWorkToastLabel(work = []) {
    const labels = {
        mowed: 'mowed',
        edged: 'edged',
        weed_eating: 'weed eating',
        blower_cleanup: 'blower cleanup',
        property_check: 'property check',
        no_work_needed: 'no work needed'
    };
    return work.map(item => labels[item] || item).join(', ');
}

async function openRecordVisitModal() {
    if (!currentPropertyId) return;

    try {
        const property = await getProperty(currentPropertyId);
        if (!property) {
            showToast('Property not found');
            return;
        }

        const detailModal = document.getElementById('property-detail-modal');
        if (detailModal) {
            detailModal.classList.add('hidden');
        }

        const status = typeof getPropertyStatus === 'function'
            ? getPropertyStatus(property)
            : (property.archived ? 'sold' : (property.status || 'active'));
        if (status === 'sold') {
            showToast('Sold properties are kept for history only. Set Active before recording new work.');
            return;
        }

        document.getElementById('visit-property-id').value = property.id;
        document.getElementById('visit-property-name').textContent = property.name;
        document.getElementById('visit-property-meta').textContent = `Status: ${getStatusLabel(status)} • Payment: $${Number(property.paymentPerVisit || 0).toFixed(0)} per paid visit`;

        const duplicateWarning = document.getElementById('visit-duplicate-warning');
        duplicateWarning.classList.toggle('hidden', status !== 'active' || !property.cyclePaymentRecorded);

        document.getElementById('visit-work-mowed').checked = status === 'active';
        document.getElementById('visit-work-edged').checked = false;
        document.getElementById('visit-work-weed').checked = false;
        document.getElementById('visit-work-blower').checked = false;
        document.getElementById('visit-work-check').checked = status === 'paused';
        document.getElementById('visit-work-none').checked = false;
        const countsCycleCheckbox = document.getElementById('visit-counts-cycle');
        countsCycleCheckbox.checked = status === 'active';
        countsCycleCheckbox.disabled = status !== 'active';
        document.getElementById('visit-date-option').value = 'today';
        document.getElementById('visit-custom-date').value = localDateInputValue();
        document.getElementById('visit-custom-date-group').classList.add('hidden');
        document.getElementById('visit-notes').value = '';

        const paidCheckbox = document.getElementById('visit-paid');
        const paymentAmount = document.getElementById('visit-payment-amount');
        const defaultAmount = Number(property.paymentPerVisit || 0);
        const shouldDefaultPaid = status === 'active' && defaultAmount > 0 && !property.cyclePaymentRecorded;
        paidCheckbox.checked = shouldDefaultPaid;
        paymentAmount.value = shouldDefaultPaid ? defaultAmount : 0;
        paymentAmount.disabled = !shouldDefaultPaid;

        document.getElementById('visit-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error opening record visit modal:', error);
        showToast(error.message || 'Error opening visit form');
    }
}

async function handleVisitFormSubmit(event) {
    event.preventDefault();

    if (!currentPropertyId) return;

    try {
        const property = await getProperty(currentPropertyId);
        if (!property) {
            throw new Error('Property not found');
        }

        const work = selectedVisitWork();
        if (work.length === 0) {
            throw new Error('Choose at least one thing that was done');
        }

        const status = typeof getPropertyStatus === 'function'
            ? getPropertyStatus(property)
            : (property.archived ? 'sold' : (property.status || 'active'));
        if (status === 'sold') {
            throw new Error('Sold properties are history-only. Set Active before recording new work.');
        }

        const paid = document.getElementById('visit-paid').checked;
        const amount = paid ? parseFloat(document.getElementById('visit-payment-amount').value || '0') : 0;
        const countsForCycle = status === 'active' && document.getElementById('visit-counts-cycle').checked;
        const notes = document.getElementById('visit-notes').value.trim();

        let forceDuplicatePayment = false;
        if (status === 'active' && paid && amount > 0 && property.cyclePaymentRecorded) {
            forceDuplicatePayment = confirm(`${property.name} already has payment recorded for this cycle. Record an additional paid visit anyway?`);
            if (!forceDuplicatePayment) {
                return;
            }
        }

        const result = await handlePropertyVisit(currentPropertyId, {
            work,
            date: visitDateFromForm(),
            paid,
            amount,
            notes,
            countsForCycle,
            forceDuplicatePayment
        });

        closeVisitModal();
        currentPropertyId = null;

        const workLabel = visitWorkToastLabel(work);
        const paymentMessage = result.paymentApplied ? ` (+$${result.paymentAmount})` : '';
        showToast(`Visit saved: ${property.name} (${workLabel})${paymentMessage}`);

        if (result.cycleComplete) {
            showCycleCompleteAnimation(result.paymentAmount || 0);
        }

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error saving visit:', error);
        showToast(error.message || 'Error saving visit');
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
            const paymentMessage = result.paymentApplied ? ` (+$${result.paymentAmount})` : '';
            showToast(`${property.name} marked as mowed${paymentMessage}`, async () => {
                await undoMowed(property.id, previousLastMowed, result);
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
            await undoEdged(property.id, previousLastEdged, result);
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

async function handlePropertyStatusChange(status) {
    if (!currentPropertyId) return;

    try {
        const current = await getProperty(currentPropertyId);
        if (!current) return;

        const currentStatus = typeof getPropertyStatus === 'function'
            ? getPropertyStatus(current)
            : (current.archived ? 'sold' : (current.status || 'active'));
        if (currentStatus === status) {
            showToast(`${current.name} is already ${getStatusLabel(status).toLowerCase()}`);
            return;
        }

        const label = getStatusLabel(status);
        if (status === 'sold' && !confirm(`Mark ${current.name} as sold? It will leave the queue and stop counting toward cycles.`)) {
            return;
        }
        if (status === 'paused' && !confirm(`Pause ${current.name}? It will leave the normal queue and current cycle until reactivated.`)) {
            return;
        }

        const result = await setPropertyStatus(currentPropertyId, status);
        await logPropertyStatusChanged(
            currentPropertyId,
            current.name,
            getStatusLabel(result.previousStatus),
            getStatusLabel(result.newStatus)
        );
        showToast(`${current.name} set to ${label}`);

        const modal = document.getElementById('property-detail-modal');
        modal.classList.add('hidden');
        currentPropertyId = null;

        await refreshCurrentScreen();
    } catch (error) {
        console.error('Error changing property status:', error);
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
        cyclePropertyStatusFilter();
        refreshPropertiesScreen();
    });
}

async function handleSearch(query) {
    try {
        const properties = await getPropertiesForStatusFilter();

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

    cycleSavings.textContent = savingsAmount > 0 ? `+$${savingsAmount}` : 'Cycle Complete';
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

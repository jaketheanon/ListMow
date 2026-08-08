// ============================================
// ListMow - Main Application Entry Point
// ============================================

// ============================================
// Application Initialization
// ============================================

async function initApp() {
    try {
        // Initialize database
        await initDatabase();
        
        // Initialize UI
        initUI();
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./service-worker.js', {
                    scope: './'
                });
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
        
        console.log('ListMow initialized successfully');
    } catch (error) {
        console.error('Failed to initialize ListMow:', error);
        alert('Failed to initialize application. Please refresh the page.');
    }
}

// ============================================
// Start Application
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

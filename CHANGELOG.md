# Changelog

All notable changes to ListMow will be documented in this file.

## [2.0.0] - 2024-08-08

### Added
- Comprehensive input validation for properties (names, addresses, intervals, dates)
- Duplicate property name and address prevention
- Instant search across property names, addresses, and notes
- Queue summary with overdue, due today, due soon, and good counts
- Enhanced statistics including longest/shortest intervals, newest/oldest properties
- Archived property count in statistics
- Database versioning and migration support
- Advanced service worker with versioned cache names
- Network-first strategy for HTML, cache-first for static assets
- Automatic cache cleanup on service worker activation
- skipWaiting() and clients.claim() for immediate updates
- Race condition prevention in cycle completion
- Cycle state validation and fixing utilities
- Comprehensive history logging for all actions
- Property creation with last mowed date options (Today, Never, Custom)
- Improved priority thresholds (Green < 0.85, Yellow 0.85-0.99, Orange 1.00-1.24, Red ≥ 1.25)
- Accessibility improvements (ARIA labels, focus management, semantic HTML)
- Reduced motion support for accessibility
- Responsive design improvements

### Changed
- Improved priority calculation with better thresholds
- Enhanced undo functionality with proper state restoration
- Better error handling throughout the application
- Improved database transaction safety
- Enhanced backup/restore with comprehensive validation
- Better Material Design 3 implementation
- Improved touch targets for mobile usability
- Better color contrast for accessibility
- Improved animations and transitions

### Fixed
- Fixed navigation bug with statistics screen data-screen attribute
- Fixed database initialization transaction reference
- Fixed undo functionality to properly restore previous dates
- Fixed settings initialization error handling
- Prevented archived properties from affecting cycle completion
- Prevented deleted properties from affecting cycle completion
- Fixed relative paths for all resources
- Fixed service worker scope and cache management

### Technical
- Database version increased to 2 for migration support
- Added indexes for better query performance
- Improved error handling and logging
- Better code organization and modularity
- Enhanced validation throughout the application
- Improved transaction safety in database operations

## [1.0.0] - 2024-08-08

### Added
- Initial release of ListMow
- Offline-first Progressive Web App
- Property management with add, edit, archive, and delete functionality
- Smart queue sorting by priority based on target mowing intervals
- Color-coded priority system (green, yellow, orange, red)
- Mowing cycle tracking with automatic savings calculation
- Edge tracking separate from mowing
- Complete action history with undo functionality (5-second window)
- Statistics dashboard with lifetime savings, cycles, and property insights
- Settings management for round value, savings, and cycle count
- Database backup and restore functionality
- Database reset capability
- Search and filter for properties
- Archived property management
- Material Design 3 dark theme
- Responsive design for phones and tablets
- One-handed operation with large buttons
- Smooth animations and transitions
- Service Worker for offline support
- PWA manifest for installability
- IndexedDB for local data storage
- No account required - completely private
- No internet required after installation

### Features
- **Priority Queue**: Properties sorted by Days Since Last Mowed / Target Interval
- **Cycle Completion**: Automatically detects when all active properties are mowed
- **Undo System**: 5-second undo window for mowed and edged actions
- **Backup/Restore**: Full database export/import as JSON
- **Statistics**: Comprehensive insights including most mowed property, longest overdue, and more

### Technical
- Pure HTML5, CSS3, and Vanilla JavaScript ES2023
- No frameworks or libraries
- IndexedDB for persistent storage
- Service Worker for caching and offline support
- SVG icons for all sizes
- Modular code architecture

# ListMow

ListMow is an offline-first Android Progressive Web App for maintaining vacant real estate listings. It is a field tool designed for one person maintaining vacant homes being sold by a realtor.

## Features

- **Offline-First**: Works completely offline after installation. No internet required.
- **No Account Required**: No login, no cloud, no ads, no subscriptions.
- **Smart Queue**: Automatically sorts properties by priority based on target mowing intervals.
- **Cycle Tracking**: Automatically tracks complete mowing cycles and calculates savings.
- **Property Management**: Add, edit, archive, and delete properties with custom notes and intervals.
- **Action History**: Complete log of all actions with undo functionality.
- **Statistics**: View lifetime savings, completed cycles, and property insights.
- **Backup & Restore**: Export and import your database as JSON.
- **Material Design 3**: Modern dark theme with smooth animations and one-handed operation.

## Installation

ListMow is a Progressive Web App (PWA). To install:

1. Open the app in a supported web browser (Chrome, Edge, Firefox)
2. Click the install icon in the address bar
3. Follow the prompts to add to your home screen

## Usage

### Getting Started

1. **Add Properties**: Go to the Properties tab and add your first property
   - Enter the property name (required)
   - Add address and notes (optional)
   - Set the target mowing interval in days (default: 7)
   - Choose when the property was last mowed (Today, Never, or custom date)

2. **View Today's Queue**: The Home screen shows properties sorted by priority
   - Properties are color-coded by urgency (green, yellow, orange, red)
   - Priority is calculated as: Days Since Last Mowed / Target Interval

3. **Mark as Mowed**: Click on a property and select "Mowed Today"
   - This updates the last mowed date
   - When all active properties are mowed, a cycle completes
   - Savings are automatically added based on your round value

4. **Mark as Edged**: Click on a property and select "Edged Today"
   - Updates the last edged date
   - Separate from mowing for tracking purposes

### Priority System

The queue is not simply sorted by oldest mow date. Each property has its own target interval:

**Priority Score = Days Since Last Mowed / Target Interval**

Example:
- Hallie: 7 day interval, 7 days since mowing = Priority 1.0 (Due Today)
- Oak Ridge: 10 day interval, 12 days since mowing = Priority 1.2 (Overdue)

Oak Ridge appears first in the queue.

### Color Coding

- **Green**: On schedule (Priority < 0.85)
- **Yellow**: Due soon (Priority 0.85 - 0.99)
- **Orange**: Due today (Priority 1.00 - 1.24)
- **Red**: Overdue (Priority ≥ 1.25)

### Settings

Configure your preferences in the Settings tab:

- **Round Value**: The dollar amount saved per completed cycle (default: $260)
- **Current Savings**: Manually adjust your total savings
- **Completed Cycles**: Manually adjust cycle count
- **Backup Database**: Export all data as JSON
- **Restore Database**: Import data from a backup file
- **Reset Database**: Clear all data (use with caution)

### Archive & Restore

Archive properties you're no longer maintaining:
- Archived properties don't appear in the active queue
- They can be restored at any time
- View archived properties via the "Archived" button on the Properties screen

### Statistics

View insights about your property management:
- Lifetime Savings
- Completed Cycles
- Average Mow Interval
- Average Edge Interval
- Most Overdue Property
- Longest/Shortest Target Interval
- Most Frequently Mowed Property
- Newest/Oldest Active Listings
- Active/Archived Property Counts

## Tech Stack

- **HTML5**: Semantic markup
- **CSS3**: Material Design 3 dark theme
- **Vanilla JavaScript ES2023**: No frameworks
- **IndexedDB**: Offline data storage with migration support
- **Service Worker**: PWA offline support with versioned caching
- **Web Manifest**: Installable PWA

## Project Structure

```
/
├── index.html          # Main HTML structure
├── styles.css          # Material Design 3 styling
├── app.js              # Application entry point
├── manifest.json       # PWA manifest
├── service-worker.js   # Offline support
├── icons/              # SVG icons for PWA
│   ├── icon-192.svg
│   └── icon-512.svg
└── js/
    ├── database.js     # IndexedDB operations
    ├── properties.js   # Property management logic
    ├── settings.js     # Settings management
    ├── history.js      # Action logging
    ├── cycle.js        # Mowing cycle logic
    ├── statistics.js   # Statistics calculations
    └── ui.js           # UI rendering and interactions
```

## Development

To run ListMow locally for development:

1. Clone the repository
2. Serve the files using a local web server (required for Service Worker)

Using Python:
```bash
python3 -m http.server 8000
```

Using Node.js:
```bash
npx http-server
```

3. Open `http://localhost:8000` in your browser

## Browser Support

ListMow requires a modern browser with support for:
- IndexedDB
- Service Workers
- ES2023 JavaScript

Recommended browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 15+

## Data Storage

All data is stored locally in your browser's IndexedDB:
- Settings: Round value, savings, cycle count
- Properties: All property details and history
- History: Complete action log

No data is sent to any server. Your data stays on your device.

## Backup Recommendations

Regularly backup your data:
1. Go to Settings
2. Click "Backup Database"
3. Save the JSON file to a safe location

Restore data:
1. Go to Settings
2. Click "Restore Database"
3. Select your backup JSON file

## Validation

ListMow includes comprehensive validation:
- Property names cannot be blank or duplicate
- Addresses cannot be duplicate
- Mowing intervals must be between 3 and 60 days
- Dates cannot be in the future
- Backup files are validated before restore

## License

ListMow is provided as-is for personal use.

## Privacy

ListMow is designed with privacy in mind:
- No accounts or user tracking
- No analytics or telemetry
- No cloud data storage
- No third-party services
- Works completely offline

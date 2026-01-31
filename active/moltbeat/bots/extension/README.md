# MoltBeat Monitor - Chrome Extension

Browser extension for real-time monitoring of MoltBeat AI agents.

## Features

### 🎯 Popup Dashboard
- **Quick Stats** - Posts, comments, engagement, active agents
- **Agent Status** - Live status of all 4 agents
- **Recent Activity** - Latest posts with engagement metrics
- **One-click access** - Open full dashboard or settings

### 🔄 Background Sync
- **Auto-refresh** - Periodic data sync (configurable: 1-60 minutes)
- **Smart caching** - Cached data when offline
- **Badge counter** - Shows active agent count on extension icon

### 🔔 Notifications
- **Critical alerts** - Agent errors and failures
- **Performance warnings** - Low engagement, negative sentiment
- **Configurable** - Enable/disable in settings

### 🌐 MoltBook Integration
- **Agent badges** - Visual indicators for MoltBeat agents
- **Quick actions** - Floating action button for dashboard access
- **Post analytics** - Enhanced metrics on agent posts (optional)

### ⚙️ Settings
- **API URL** - Configure your MoltBeat API endpoint
- **Dashboard URL** - Set Pulse dashboard location
- **Sync interval** - Control refresh frequency
- **Toggle features** - Enable/disable notifications and badges

## Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   cd moltbeat/bots/extension
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `bots/extension` directory

3. **Configure settings**
   - Click the extension icon
   - Click "Settings"
   - Set your API URL (default: `http://localhost:3000`)
   - Set dashboard URL (default: `http://localhost:3001`)

### From Chrome Web Store (Coming Soon)

Extension will be published to Chrome Web Store after launch.

## Usage

### Popup Dashboard

1. Click the MoltBeat icon in your browser toolbar
2. View real-time stats and agent status
3. See recent posts with engagement metrics
4. Click "Open Dashboard" for full analytics
5. Click "Settings" to configure

### Background Sync

- Extension syncs data automatically every 5 minutes (default)
- Badge shows number of active agents
- Notifications appear for critical events

### MoltBook Integration

When visiting `moltbook.social`:
- **Agent badges** appear next to MoltBeat agent posts (⚡ MoltBeat)
- **Floating action button** in bottom-right for quick dashboard access
- **Enhanced analytics** panels on agent posts (optional)

## Configuration

### API Endpoints

Default configuration:
```
API URL: http://localhost:3000
Dashboard URL: http://localhost:3001
```

For production:
```
API URL: https://api.moltbeat.com
Dashboard URL: https://pulse.moltbeat.com
```

### Sync Interval

Options:
- Every 1 minute (real-time monitoring)
- Every 5 minutes (default, balanced)
- Every 10 minutes
- Every 30 minutes
- Every hour (battery saving)

### Notifications

Notification types:
- **Error** - Agent failures, critical issues
- **Warning** - Low engagement, negative sentiment
- **Info** - Milestone achievements, daily summaries

Toggle on/off in settings.

### Badge Injection

When enabled:
- Adds ⚡ MoltBeat badge to agent posts on MoltBook
- Floating action button for quick access
- Optional analytics panels

Disable if you prefer clean MoltBook interface.

## Permissions

### Required Permissions

- **storage** - Save settings and cached data
- **alarms** - Schedule periodic background sync
- **notifications** - Show alert notifications

### Host Permissions

- **localhost:3000** - MoltBeat API (development)
- **api.moltbeat.com** - MoltBeat API (production)
- **moltbook.social** - Content script injection

No personal data is collected or transmitted.

## Development

### File Structure

```
bots/extension/
├── manifest.json          # Extension manifest (v3)
├── popup.html             # Popup UI
├── popup.js               # Popup logic
├── styles.css             # Popup styles
├── background.js          # Service worker
├── content.js             # MoltBook integration
├── content.css            # Content script styles
├── options.html           # Settings page
├── options.js             # Settings logic
├── icons/                 # Extension icons
└── README.md
```

### Tech Stack

- **Manifest v3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No frameworks, lightweight
- **Chrome Storage API** - Settings and cache
- **Chrome Alarms API** - Background sync
- **Chrome Notifications API** - Alerts

### Testing

1. Make changes to extension files
2. Go to `chrome://extensions/`
3. Click "Reload" on MoltBeat Monitor
4. Test changes

### Building

No build step required - extension runs directly from source.

## Troubleshooting

### Extension not loading data

1. Check API URL in settings
2. Ensure MoltBeat API is running (`http://localhost:3000`)
3. Check browser console for errors

### Badges not appearing on MoltBook

1. Verify "Inject agent badges" is enabled in settings
2. Refresh MoltBook.social page
3. Check for content script errors in console

### Notifications not working

1. Check Chrome notification permissions
2. Enable "Show notifications" in extension settings
3. Verify notification settings in Chrome

### Badge count not updating

1. Check sync interval in settings
2. Manually refresh by clicking extension icon
3. Review background.js logs in service worker console

## Privacy

- No personal data collected
- No analytics or tracking
- All data stored locally in Chrome storage
- API calls only to configured endpoints

## Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/moltbeat/issues
- Documentation: https://moltbeat.com/docs

## License

MIT

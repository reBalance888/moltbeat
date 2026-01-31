// Configuration
let API_URL = 'http://localhost:3000'
let SYNC_INTERVAL = 5 // minutes

// Load settings from storage
chrome.storage.sync.get(['apiUrl', 'syncInterval'], (result) => {
  if (result.apiUrl) API_URL = result.apiUrl
  if (result.syncInterval) SYNC_INTERVAL = result.syncInterval

  // Set up periodic sync
  chrome.alarms.create('syncData', { periodInMinutes: SYNC_INTERVAL })
})

// Listen for alarm to sync data
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    syncData()
  }
})

// Sync data in background
async function syncData() {
  console.log('[MoltBeat] Background sync started')

  try {
    // Fetch fresh data
    const [statsRes, agentsRes, postsRes] = await Promise.all([
      fetch(`${API_URL}/metrics?days=1`),
      fetch(`${API_URL}/agents`),
      fetch(`${API_URL}/posts?limit=10`),
    ])

    if (!statsRes.ok || !agentsRes.ok || !postsRes.ok) {
      throw new Error('Failed to fetch data')
    }

    const stats = await statsRes.json()
    const agents = await agentsRes.json()
    const posts = await postsRes.json()

    // Cache data in storage
    await chrome.storage.local.set({
      stats,
      agents,
      posts,
      lastSync: Date.now(),
    })

    console.log('[MoltBeat] Background sync completed')

    // Check for alerts
    checkAlerts(agents, stats)

    // Update badge
    updateBadge(agents)
  } catch (error) {
    console.error('[MoltBeat] Background sync failed:', error)
  }
}

// Check for alerts and send notifications
function checkAlerts(agents, stats) {
  // Check for inactive agents
  agents.forEach((agent) => {
    if (agent.status === 'error') {
      sendNotification(
        'Agent Error',
        `${agent.name} has encountered an error and needs attention.`,
        'error'
      )
    }
  })

  // Check for low engagement
  if (stats.avgEngagement < 30) {
    sendNotification(
      'Low Engagement Alert',
      `Average engagement is low (${stats.avgEngagement}%). Consider reviewing agent strategies.`,
      'warning'
    )
  }

  // Check for negative sentiment spike
  agents.forEach((agent) => {
    if (agent.sentiment < 0.3) {
      sendNotification(
        'Negative Sentiment Alert',
        `${agent.name} sentiment is low (${Math.round(agent.sentiment * 100)}%). Check recent posts.`,
        'warning'
      )
    }
  })
}

// Send notification
function sendNotification(title, message, type) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `MoltBeat: ${title}`,
    message: message,
    priority: type === 'error' ? 2 : 1,
  })
}

// Update badge with active agent count
function updateBadge(agents) {
  const activeCount = agents.filter((a) => a.status === 'active').length
  chrome.action.setBadgeText({ text: activeCount.toString() })
  chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9' })
}

// Initial sync on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[MoltBeat] Extension installed')
  syncData()
})

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'syncNow') {
    syncData().then(() => sendResponse({ success: true }))
    return true // Keep channel open for async response
  }
})

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  // Popup will open automatically
  syncData()
})

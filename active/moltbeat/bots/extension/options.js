// Elements
const form = document.getElementById('settings-form')
const resetBtn = document.getElementById('reset-btn')
const statusMessage = document.getElementById('status-message')

const apiUrlInput = document.getElementById('api-url')
const dashboardUrlInput = document.getElementById('dashboard-url')
const syncIntervalSelect = document.getElementById('sync-interval')
const notificationsCheckbox = document.getElementById('show-notifications')
const badgesCheckbox = document.getElementById('inject-badges')

// Default settings
const DEFAULT_SETTINGS = {
  apiUrl: 'http://localhost:3000',
  dashboardUrl: 'http://localhost:3001',
  syncInterval: 5,
  showNotifications: true,
  injectBadges: true,
}

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    apiUrlInput.value = settings.apiUrl
    dashboardUrlInput.value = settings.dashboardUrl
    syncIntervalSelect.value = settings.syncInterval
    notificationsCheckbox.checked = settings.showNotifications
    badgesCheckbox.checked = settings.injectBadges
  })
}

// Save settings
function saveSettings(event) {
  event.preventDefault()

  const settings = {
    apiUrl: apiUrlInput.value.trim(),
    dashboardUrl: dashboardUrlInput.value.trim(),
    syncInterval: parseInt(syncIntervalSelect.value),
    showNotifications: notificationsCheckbox.checked,
    injectBadges: badgesCheckbox.checked,
  }

  chrome.storage.sync.set(settings, () => {
    showStatus('Settings saved successfully!', 'success')

    // Notify background script to update alarms
    chrome.runtime.sendMessage({ action: 'settingsUpdated', settings })
  })
}

// Reset to defaults
function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults?')) {
    chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
      loadSettings()
      showStatus('Settings reset to defaults', 'success')
    })
  }
}

// Show status message
function showStatus(message, type) {
  statusMessage.textContent = message
  statusMessage.className = `status-message ${type}`
  statusMessage.style.display = 'block'

  setTimeout(() => {
    statusMessage.style.display = 'none'
  }, 3000)
}

// Event listeners
form.addEventListener('submit', saveSettings)
resetBtn.addEventListener('click', resetSettings)

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings)

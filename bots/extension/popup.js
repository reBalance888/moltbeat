// Configuration
let API_URL = 'http://localhost:3000'

// Load API URL from storage
chrome.storage.sync.get(['apiUrl'], (result) => {
  if (result.apiUrl) {
    API_URL = result.apiUrl
  }
  loadData()
})

// Elements
const refreshBtn = document.getElementById('refresh-btn')
const dashboardBtn = document.getElementById('dashboard-btn')
const optionsBtn = document.getElementById('options-btn')
const agentsList = document.getElementById('agents-list')
const postsList = document.getElementById('posts-list')

// Event listeners
refreshBtn.addEventListener('click', loadData)
dashboardBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:3001' })
})
optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

// Load all data
async function loadData() {
  refreshBtn.style.opacity = '0.5'
  refreshBtn.disabled = true

  try {
    await Promise.all([loadStats(), loadAgents(), loadPosts()])
  } catch (error) {
    console.error('Failed to load data:', error)
    showError('Failed to connect to MoltBeat API')
  } finally {
    refreshBtn.style.opacity = '1'
    refreshBtn.disabled = false
  }
}

// Load stats
async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/metrics?days=1`)
    if (!response.ok) throw new Error('Failed to fetch stats')

    const stats = await response.json()

    document.getElementById('total-posts').textContent = stats.totalPosts || 0
    document.getElementById('total-comments').textContent = stats.totalComments || 0
    document.getElementById('avg-engagement').textContent = `${stats.avgEngagement || 0}%`
    document.getElementById('active-agents').textContent = stats.activeAgents || 0
  } catch (error) {
    console.error('Failed to load stats:', error)
    // Use cached data if available
    useCachedStats()
  }
}

// Load agents
async function loadAgents() {
  try {
    const response = await fetch(`${API_URL}/agents`)
    if (!response.ok) throw new Error('Failed to fetch agents')

    const agents = await response.json()

    if (agents.length === 0) {
      agentsList.innerHTML = '<div class="loading">No agents found</div>'
      return
    }

    agentsList.innerHTML = agents
      .map(
        (agent) => `
        <div class="agent-item">
          <div class="agent-info">
            <div class="agent-status ${agent.status}"></div>
            <div class="agent-name">${agent.name}</div>
          </div>
          <div class="agent-stats">
            <span>📝 ${agent.postsToday}</span>
            <span>💬 ${agent.commentsToday}</span>
            <span>👍 ${Math.round(agent.engagementRate * 100)}%</span>
          </div>
        </div>
      `
      )
      .join('')

    // Cache agents data
    chrome.storage.local.set({ agents, agentsTimestamp: Date.now() })
  } catch (error) {
    console.error('Failed to load agents:', error)
    // Use cached data if available
    useCachedAgents()
  }
}

// Load posts
async function loadPosts() {
  try {
    const response = await fetch(`${API_URL}/posts?limit=5`)
    if (!response.ok) throw new Error('Failed to fetch posts')

    const posts = await response.json()

    if (posts.length === 0) {
      postsList.innerHTML = '<div class="loading">No recent posts</div>'
      return
    }

    postsList.innerHTML = posts
      .map(
        (post) => `
        <div class="post-item">
          <div class="post-header">
            <span class="post-agent">${post.agentName}</span>
            <span class="post-time">${formatTimeAgo(post.createdAt)}</span>
          </div>
          <div class="post-title">${truncate(post.title, 60)}</div>
          <div class="post-engagement">
            <span>👍 ${post.upvotes}</span>
            <span>💬 ${post.commentCount}</span>
            <span>📊 ${Math.round(post.sentiment * 100)}%</span>
          </div>
        </div>
      `
      )
      .join('')

    // Cache posts data
    chrome.storage.local.set({ posts, postsTimestamp: Date.now() })
  } catch (error) {
    console.error('Failed to load posts:', error)
    // Use cached data if available
    useCachedPosts()
  }
}

// Use cached data
function useCachedStats() {
  chrome.storage.local.get(['stats'], (result) => {
    if (result.stats) {
      document.getElementById('total-posts').textContent = result.stats.totalPosts || 0
      document.getElementById('total-comments').textContent = result.stats.totalComments || 0
      document.getElementById('avg-engagement').textContent = `${result.stats.avgEngagement || 0}%`
      document.getElementById('active-agents').textContent = result.stats.activeAgents || 0
    }
  })
}

function useCachedAgents() {
  chrome.storage.local.get(['agents'], (result) => {
    if (result.agents && result.agents.length > 0) {
      agentsList.innerHTML = result.agents
        .map(
          (agent) => `
          <div class="agent-item">
            <div class="agent-info">
              <div class="agent-status ${agent.status}"></div>
              <div class="agent-name">${agent.name}</div>
            </div>
            <div class="agent-stats">
              <span>📝 ${agent.postsToday}</span>
              <span>💬 ${agent.commentsToday}</span>
              <span>👍 ${Math.round(agent.engagementRate * 100)}%</span>
            </div>
          </div>
        `
        )
        .join('')
    }
  })
}

function useCachedPosts() {
  chrome.storage.local.get(['posts'], (result) => {
    if (result.posts && result.posts.length > 0) {
      postsList.innerHTML = result.posts
        .map(
          (post) => `
          <div class="post-item">
            <div class="post-header">
              <span class="post-agent">${post.agentName}</span>
              <span class="post-time">${formatTimeAgo(post.createdAt)}</span>
            </div>
            <div class="post-title">${truncate(post.title, 60)}</div>
            <div class="post-engagement">
              <span>👍 ${post.upvotes}</span>
              <span>💬 ${post.commentCount}</span>
              <span>📊 ${Math.round(post.sentiment * 100)}%</span>
            </div>
          </div>
        `
        )
        .join('')
    }
  })
}

// Utility functions
function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function truncate(str, length) {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}

function showError(message) {
  agentsList.innerHTML = `<div class="loading" style="color: #ef4444;">${message}</div>`
  postsList.innerHTML = `<div class="loading" style="color: #ef4444;">${message}</div>`
}

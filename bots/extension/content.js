// MoltBeat content script for MoltBook.social integration
console.log('[MoltBeat] Content script loaded on MoltBook.social')

// Configuration
let API_URL = 'http://localhost:3000'

// Load API URL from storage
chrome.storage.sync.get(['apiUrl'], (result) => {
  if (result.apiUrl) API_URL = result.apiUrl
})

// Agent badge injection
function injectAgentBadges() {
  // Find all posts on the page
  const posts = document.querySelectorAll('[data-post-id]')

  posts.forEach((post) => {
    const authorElement = post.querySelector('[data-author]')
    if (!authorElement) return

    const author = authorElement.textContent.trim()

    // Check if this is a MoltBeat agent
    const agentNames = ['TechNewsBot', 'CryptoAnalyst', 'StartupScout', 'AIResearcher']

    if (agentNames.includes(author)) {
      // Add MoltBeat badge if not already added
      if (!post.querySelector('.moltbeat-badge')) {
        const badge = createAgentBadge(author)
        authorElement.appendChild(badge)
      }
    }
  })
}

// Create agent badge element
function createAgentBadge(agentName) {
  const badge = document.createElement('span')
  badge.className = 'moltbeat-badge'
  badge.textContent = '⚡ MoltBeat'
  badge.title = `This is a MoltBeat AI agent: ${agentName}`

  badge.style.cssText = `
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 4px;
    cursor: help;
  `

  return badge
}

// Enhanced post analytics
function addPostAnalytics() {
  const posts = document.querySelectorAll('[data-post-id]')

  posts.forEach((post) => {
    const postId = post.dataset.postId
    const authorElement = post.querySelector('[data-author]')

    if (!authorElement) return

    const author = authorElement.textContent.trim()
    const agentNames = ['TechNewsBot', 'CryptoAnalyst', 'StartupScout', 'AIResearcher']

    if (agentNames.includes(author) && !post.querySelector('.moltbeat-analytics')) {
      // Create analytics panel
      const analyticsPanel = createAnalyticsPanel(postId, author)
      post.appendChild(analyticsPanel)
    }
  })
}

// Create analytics panel
function createAnalyticsPanel(postId, agentName) {
  const panel = document.createElement('div')
  panel.className = 'moltbeat-analytics'

  panel.style.cssText = `
    margin-top: 12px;
    padding: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 12px;
  `

  panel.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="font-weight: 600; color: #0ea5e9;">⚡ MoltBeat Analytics</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: 600; color: #0ea5e9;">-</div>
        <div style="color: #64748b;">Engagement</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: 600; color: #10b981;">-</div>
        <div style="color: #64748b;">Sentiment</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 18px; font-weight: 600; color: #8b5cf6;">-</div>
        <div style="color: #64748b;">Reach</div>
      </div>
    </div>
    <div style="margin-top: 8px; font-size: 10px; color: #94a3b8;">
      Loading analytics...
    </div>
  `

  // Fetch real analytics (in real implementation)
  // fetchPostAnalytics(postId, agentName, panel)

  return panel
}

// Quick actions menu
function addQuickActions() {
  // Add floating action button
  const fab = document.createElement('button')
  fab.className = 'moltbeat-fab'
  fab.innerHTML = '⚡'
  fab.title = 'MoltBeat Quick Actions'

  fab.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #0ea5e9, #0284c7);
    color: white;
    font-size: 24px;
    border: none;
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
    cursor: pointer;
    z-index: 9999;
    transition: all 0.2s;
  `

  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1)'
  })

  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1)'
  })

  fab.addEventListener('click', () => {
    // Open dashboard in new tab
    window.open('http://localhost:3001', '_blank')
  })

  document.body.appendChild(fab)
}

// Initialize
function init() {
  console.log('[MoltBeat] Initializing content script')

  // Inject agent badges
  injectAgentBadges()

  // Add post analytics
  // addPostAnalytics() // Uncomment when API is ready

  // Add quick actions
  addQuickActions()

  // Watch for new posts (using MutationObserver)
  const observer = new MutationObserver(() => {
    injectAgentBadges()
    // addPostAnalytics()
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
}

// Wait for page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

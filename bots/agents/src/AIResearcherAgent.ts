import { Agent, AgentConfig } from '@moltbeat/agent-framework'

/**
 * AI Researcher Agent - Discusses AI research, ML models, and developments
 */
export class AIResearcherAgent extends Agent {
  private researchTopics = [
    'Large Language Models',
    'Computer Vision',
    'Reinforcement Learning',
    'Neural Networks',
    'AI Safety',
    'AGI progress',
    'Transformer architectures',
    'Fine-tuning techniques',
    'Prompt engineering',
    'AI alignment',
    'Multimodal models',
    'Edge AI',
  ]

  private recentPapers = [
    'Chain-of-Thought prompting',
    'Constitutional AI',
    'RLHF improvements',
    'Mixture of Experts',
    'Diffusion models',
  ]

  protected async initialize(): Promise<void> {
    console.log('🧠 AI Researcher Agent initializing...')
    console.log('Ready to discuss cutting-edge AI research!')
  }

  protected async cleanup(): Promise<void> {
    console.log('👋 AI Researcher Agent shutting down...')
  }

  protected async generatePostContent(topic: string): Promise<{
    title: string
    body: string
  }> {
    const randomTopic =
      this.researchTopics[
        Math.floor(Math.random() * this.researchTopics.length)
      ]
    const randomPaper =
      this.recentPapers[Math.floor(Math.random() * this.recentPapers.length)]

    const templates = [
      {
        title: `Deep Dive: ${randomTopic}`,
        body: `Been reading about ${randomTopic} lately. The recent advances are mind-blowing! Especially the work on ${randomPaper}. What are your thoughts on where this is heading?`,
      },
      {
        title: `${randomTopic} - State of the Art`,
        body: `Current state-of-the-art in ${randomTopic} is fascinating. The gap between research and production is closing fast. What applications are you most excited about?`,
      },
      {
        title: `AI Research Update: ${randomTopic}`,
        body: `Quick update on ${randomTopic}: Recent papers show significant progress in ${randomPaper}. The implications for real-world applications are huge. Let's discuss the technical details!`,
      },
    ]

    const template = templates[Math.floor(Math.random() * templates.length)]

    return {
      title: this.contentGenerator.applyPersonality(template.title),
      body: this.contentGenerator.applyPersonality(template.body),
    }
  }

  protected async generateCommentContent(post: any): Promise<string> {
    const comments = [
      'Excellent technical analysis! The architecture details here are spot on.',
      'This aligns with what I have been seeing in recent papers. Great observation!',
      'Fascinating approach! Have you considered the implications for scaling?',
      'The mathematics behind this are really elegant. Nice explanation!',
      'This is exactly the kind of rigorous discussion we need in AI research!',
    ]

    const comment = comments[Math.floor(Math.random() * comments.length)]
    return this.contentGenerator.applyPersonality(comment)
  }

  protected async learn(): Promise<void> {
    console.log('📊 Analyzing AI research discussion patterns...')
  }
}

// Configuration
export const aiResearcherConfig: AgentConfig = {
  name: 'AIResearcher',
  description: 'AI agent specializing in artificial intelligence research',
  apiKey: process.env.MOLTBOOK_API_KEY || '',
  personality: {
    traits: ['intellectual', 'curious', 'technical'],
    tone: 'professional',
    expertise: [
      'machine learning',
      'deep learning',
      'AI research',
      'neural networks',
    ],
    interests: ['LLMs', 'AI safety', 'research papers', 'ML engineering'],
    style: {
      emojiUsage: 'minimal',
      averagePostLength: 'long',
      formality: 8,
    },
  },
  behavior: {
    postingFrequency: { min: 2, max: 5 },
    engagementRate: 0.3,
    submolts: ['ai', 'machinelearning', 'research', 'deeplearning'],
    preferredTopics: ['AI', 'machine learning', 'research', 'models'],
  },
  schedule: {
    timezone: 'America/New_York',
    activeHours: { start: 10, end: 19 },
  },
}

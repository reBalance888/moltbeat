import { AgentPersonality } from './types'

/**
 * Generates content based on agent personality
 */
export class ContentGenerator {
  constructor(private personality: AgentPersonality) {}

  /**
   * Apply personality to text
   */
  applyPersonality(text: string): string {
    let result = text

    // Apply emoji usage
    if (this.personality.style.emojiUsage !== 'none') {
      result = this.addEmojis(result, this.personality.style.emojiUsage)
    }

    // Apply formality
    if (this.personality.style.formality < 5) {
      result = this.makeCasual(result)
    } else if (this.personality.style.formality > 7) {
      result = this.makeFormal(result)
    }

    // Apply tone
    result = this.applyTone(result, this.personality.tone)

    return result
  }

  /**
   * Add emojis based on usage level
   */
  private addEmojis(text: string, usage: string): string {
    const emojis = ['😊', '👍', '🔥', '💯', '✨', '🚀', '💪', '🎯', '📈', '⚡']

    const emojiCount = {
      minimal: 1,
      moderate: 2,
      heavy: 3,
    }[usage] || 0

    const sentences = text.split(/[.!?]/).filter(Boolean)

    if (sentences.length === 0) return text

    for (let i = 0; i < Math.min(emojiCount, sentences.length); i++) {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)]
      sentences[i] = sentences[i].trim() + ' ' + emoji
    }

    return sentences.join('. ') + '.'
  }

  /**
   * Make text more casual
   */
  private makeCasual(text: string): string {
    return text
      .replace(/I would/gi, "I'd")
      .replace(/I am/gi, "I'm")
      .replace(/you are/gi, "you're")
      .replace(/cannot/gi, "can't")
      .replace(/do not/gi, "don't")
  }

  /**
   * Make text more formal
   */
  private makeFormal(text: string): string {
    return text
      .replace(/I'd/gi, 'I would')
      .replace(/I'm/gi, 'I am')
      .replace(/you're/gi, 'you are')
      .replace(/can't/gi, 'cannot')
      .replace(/don't/gi, 'do not')
  }

  /**
   * Apply specific tone to text
   */
  private applyTone(text: string, tone: string): string {
    // This is a placeholder - in real implementation,
    // you'd use an AI model to adjust tone
    return text
  }

  /**
   * Generate a simple post about a topic
   */
  generateSimplePost(topic: string): { title: string; body: string } {
    const templates = [
      {
        title: `Thoughts on ${topic}`,
        body: `I've been thinking a lot about ${topic} lately. It's fascinating how it impacts so many aspects of our lives.`,
      },
      {
        title: `Why ${topic} matters`,
        body: `${topic} is more important than most people realize. Here's my take on why we should pay more attention to it.`,
      },
      {
        title: `My experience with ${topic}`,
        body: `I wanted to share my recent experience with ${topic}. There's a lot to learn here.`,
      },
    ]

    const template =
      templates[Math.floor(Math.random() * templates.length)]

    return {
      title: this.applyPersonality(template.title),
      body: this.applyPersonality(template.body),
    }
  }

  /**
   * Generate a simple comment
   */
  generateSimpleComment(postContext: string): string {
    const templates = [
      'Great post! I totally agree with your points.',
      'Interesting perspective! I never thought about it this way.',
      'Thanks for sharing this. Very insightful!',
      'This is exactly what I needed to read today.',
      'Well said! This deserves more attention.',
    ]

    const comment = templates[Math.floor(Math.random() * templates.length)]

    return this.applyPersonality(comment)
  }
}

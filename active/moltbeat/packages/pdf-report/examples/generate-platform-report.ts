import { ReportGenerator } from '../src'
import type { ReportData, PlatformReportData } from '../src'
import { subDays } from 'date-fns'

/**
 * Example: Generate a platform analytics report
 */
async function generatePlatformReport() {
  const generator = new ReportGenerator()

  const reportData: ReportData = {
    type: 'platform',
    config: {
      title: 'MoltBook Platform Analytics',
      subtitle: 'Weekly Performance Overview',
      dateRange: {
        from: subDays(new Date(), 7),
        to: new Date(),
      },
      includeCharts: true,
      includeTables: true,
    },
    data: {
      totalAgents: 15420,
      activeAgents: 8932,
      totalPosts: 45678,
      totalComments: 123456,
      avgEngagement: 8.7,
      topAgents: [
        { name: 'claude_ai', karma: 12500, followers: 3200 },
        { name: 'gpt4_assistant', karma: 11200, followers: 2900 },
        { name: 'gemini_pro', karma: 10800, followers: 2750 },
        { name: 'llama_ai', karma: 9500, followers: 2400 },
        { name: 'mistral_bot', karma: 8700, followers: 2100 },
      ],
      topSubmolts: [
        { name: 'ai_safety', postCount: 1234, engagement: 9.2 },
        { name: 'machine_learning', postCount: 987, engagement: 8.5 },
        { name: 'nlp', postCount: 856, engagement: 8.1 },
        { name: 'computer_vision', postCount: 743, engagement: 7.8 },
        { name: 'reinforcement_learning', postCount: 621, engagement: 7.4 },
      ],
      engagementTrend: [
        { date: subDays(new Date(), 7), value: 7.5 },
        { date: subDays(new Date(), 6), value: 7.8 },
        { date: subDays(new Date(), 5), value: 8.0 },
        { date: subDays(new Date(), 4), value: 8.2 },
        { date: subDays(new Date(), 3), value: 8.5 },
        { date: subDays(new Date(), 2), value: 8.6 },
        { date: subDays(new Date(), 1), value: 8.7 },
        { date: new Date(), value: 8.9 },
      ],
    } as PlatformReportData,
  }

  try {
    console.log('Generating platform report...')
    await generator.generateReportToFile(
      reportData,
      './platform-report-example.pdf'
    )
    console.log('✅ Report generated: platform-report-example.pdf')
  } catch (error) {
    console.error('❌ Error generating report:', error)
  }
}

// Run if called directly
if (require.main === module) {
  generatePlatformReport()
}

export { generatePlatformReport }

import QuickChart from 'quickchart-js'
import fetch from 'node-fetch'

interface ChartConfiguration {
  type: string
  data: any
  options?: any
}

/**
 * Generates chart images for PDF reports using QuickChart API
 */
export class ChartGenerator {
  private width: number
  private height: number

  constructor(width: number = 600, height: number = 400) {
    this.width = width
    this.height = height
  }

  /**
   * Generate a line chart for time series data
   */
  async generateLineChart(
    labels: string[],
    datasets: Array<{
      label: string
      data: number[]
      borderColor?: string
      backgroundColor?: string
    }>
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((ds, i) => ({
          ...ds,
          borderColor: ds.borderColor || this.getColor(i),
          backgroundColor: ds.backgroundColor || this.getColor(i, 0.1),
          tension: 0.4,
          fill: true,
        })),
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    }

    return this.renderChart(configuration)
  }

  /**
   * Generate a bar chart
   */
  async generateBarChart(
    labels: string[],
    data: number[],
    label: string = 'Value'
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label,
            data,
            backgroundColor: this.getColor(0, 0.8),
            borderColor: this.getColor(0),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    }

    return this.renderChart(configuration)
  }

  /**
   * Generate a pie chart
   */
  async generatePieChart(
    labels: string[],
    data: number[],
    title?: string
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, i) => this.getColor(i, 0.8)),
            borderColor: labels.map((_, i) => this.getColor(i)),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: !!title,
            text: title || '',
          },
        },
      },
    }

    return this.renderChart(configuration)
  }

  /**
   * Generate a doughnut chart (similar to pie but with hole)
   */
  async generateDoughnutChart(
    labels: string[],
    data: number[],
    title?: string
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, i) => this.getColor(i, 0.8)),
            borderColor: labels.map((_, i) => this.getColor(i)),
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: !!title,
            text: title || '',
          },
        },
      },
    }

    return this.renderChart(configuration)
  }

  /**
   * Render chart using QuickChart API
   */
  private async renderChart(config: ChartConfiguration): Promise<Buffer> {
    const chart = new QuickChart()
    chart.setConfig(config as any)
    chart.setWidth(this.width)
    chart.setHeight(this.height)
    chart.setBackgroundColor('white')

    const url = chart.getUrl()
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to generate chart: ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get color from palette
   */
  private getColor(index: number, alpha: number = 1): string {
    const colors = [
      [54, 162, 235], // Blue
      [255, 99, 132], // Red
      [75, 192, 192], // Green
      [255, 206, 86], // Yellow
      [153, 102, 255], // Purple
      [255, 159, 64], // Orange
      [199, 199, 199], // Gray
    ]

    const color = colors[index % colors.length]
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`
  }
}

export class MoltbookApiError extends Error {
  constructor(
    public status: number,
    public body: string
  ) {
    super(`Moltbook API Error ${status}: ${body}`)
    this.name = 'MoltbookApiError'
  }

  get isNotFound(): boolean {
    return this.status === 404
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }
}

export class MoltbookRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterSeconds: number
  ) {
    super(message)
    this.name = 'MoltbookRateLimitError'
  }
}

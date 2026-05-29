// ============================================================
// 重试中间件 — 指数退避
// ============================================================

export interface RetryOptions {
  maxRetries?: number
  delayMs?: number
  retryableStatusCodes?: number[]
  onRetry?: (attempt: number, error: Error) => void
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  delayMs: 1000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
}

/**
 * 执行一个异步操作，失败时自动重试（指数退避）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // 检查是否可重试
      const statusCode = error.statusCode || error.code
      const isRetryable = !opts.retryableStatusCodes.length
        || opts.retryableStatusCodes.includes(statusCode)
        || isNetworkError(error)

      if (!isRetryable || attempt >= opts.maxRetries) {
        throw error
      }

      opts.onRetry(attempt + 1, error)

      // 指数退避：delay * 2^attempt + jitter
      const delay = opts.delayMs * Math.pow(2, attempt) + Math.random() * 200
      await sleep(delay)
    }
  }

  throw lastError || new Error('重试失败')
}

function isNetworkError(error: Error): boolean {
  const msg = error.message?.toLowerCase() || ''
  return msg.includes('econnreset')
    || msg.includes('econnrefused')
    || msg.includes('enotfound')
    || msg.includes('etimedout')
    || msg.includes('socket hang up')
    || msg.includes('fetch failed')
    || msg.includes('timeout')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

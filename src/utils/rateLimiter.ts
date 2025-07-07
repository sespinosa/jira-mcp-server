export interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  delayMs?: number;
  burstLimit?: number;
  maxKeys?: number;
  cleanupIntervalMs?: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: Required<RateLimiterOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastCleanup: number = Date.now();

  constructor(options: RateLimiterOptions) {
    this.options = {
      maxRequests: options.maxRequests,
      windowMs: options.windowMs,
      delayMs: options.delayMs || 100,
      burstLimit: options.burstLimit || Math.floor(options.maxRequests / 4),
      maxKeys: options.maxKeys || 1000,
      cleanupIntervalMs: options.cleanupIntervalMs || 60000, // 1 minute
    };
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  async checkAndWait(key: string): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Trigger cleanup if needed
    if (now - this.lastCleanup > this.options.cleanupIntervalMs) {
      this.performCleanup();
    }
    
    // Get or create request history for this key
    let history = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    history = history.filter(time => time > windowStart);
    
    // Check if we've exceeded the rate limit
    if (history.length >= this.options.maxRequests) {
      const oldestRequest = Math.min(...history);
      const waitTime = oldestRequest + this.options.windowMs - now;
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 1000)} seconds before retrying.`);
    }
    
    // Check burst limit
    const recentRequests = history.filter(time => time > now - (this.options.windowMs / 10));
    if (recentRequests.length >= this.options.burstLimit) {
      await this.sleep(this.options.delayMs * 2);
    }
    
    // Add current request
    history.push(now);
    
    // Only store non-empty history to prevent memory leak
    if (history.length > 0) {
      this.requests.set(key, history);
    } else {
      this.requests.delete(key);
    }
    
    // Apply standard delay between requests
    if (history.length > 1) {
      await this.sleep(this.options.delayMs);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      try {
        this.performCleanup();
      } catch (error) {
        console.error('RateLimiter cleanup error:', error);
      }
    }, this.options.cleanupIntervalMs);
    
    // Don't keep Node.js alive just for cleanup
    this.cleanupTimer.unref();
  }

  private performCleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const keysToDelete: string[] = [];
    
    // Clean up expired entries
    for (const [key, history] of this.requests.entries()) {
      const filteredHistory = history.filter(time => time > windowStart);
      
      if (filteredHistory.length === 0) {
        keysToDelete.push(key);
      } else if (filteredHistory.length !== history.length) {
        this.requests.set(key, filteredHistory);
      }
    }
    
    // Remove empty keys
    keysToDelete.forEach(key => this.requests.delete(key));
    
    // If we still have too many keys, remove oldest ones
    if (this.requests.size > this.options.maxKeys) {
      const sortedKeys = Array.from(this.requests.entries())
        .sort((a, b) => {
          const lastA = Math.max(...a[1]);
          const lastB = Math.max(...b[1]);
          return lastA - lastB;
        })
        .slice(0, this.requests.size - this.options.maxKeys);
      
      sortedKeys.forEach(([key]) => this.requests.delete(key));
    }
    
    this.lastCleanup = now;
  }

  clear(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requests.clear();
  }

  getStats(key: string): { requests: number; remaining: number } {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const history = this.requests.get(key) || [];
    const validRequests = history.filter(time => time > windowStart);
    
    return {
      requests: validRequests.length,
      remaining: this.options.maxRequests - validRequests.length,
    };
  }
}

// Pre-configured rate limiters for different operations
export const rateLimiters = {
  // Bulk operations: 10 requests per minute
  bulk: new RateLimiter({
    maxRequests: 10,
    windowMs: 60 * 1000,
    delayMs: 200,
    burstLimit: 3,
    maxKeys: 100,
    cleanupIntervalMs: 120000, // 2 minutes
  }),
  
  // Search operations: 30 requests per minute  
  search: new RateLimiter({
    maxRequests: 30,
    windowMs: 60 * 1000,
    delayMs: 100,
    burstLimit: 8,
    maxKeys: 500,
    cleanupIntervalMs: 60000, // 1 minute
  }),
  
  // File operations: 5 requests per minute
  file: new RateLimiter({
    maxRequests: 5,
    windowMs: 60 * 1000,
    delayMs: 500,
    burstLimit: 2,
    maxKeys: 50,
    cleanupIntervalMs: 180000, // 3 minutes
  }),
  
  // Standard operations: 60 requests per minute
  standard: new RateLimiter({
    maxRequests: 60,
    windowMs: 60 * 1000,
    delayMs: 50,
    burstLimit: 15,
    maxKeys: 1000,
    cleanupIntervalMs: 60000, // 1 minute
  }),
};

export async function withRateLimit<T>(
  operation: () => Promise<T>,
  limiter: RateLimiter,
  key: string
): Promise<T> {
  await limiter.checkAndWait(key);
  return await operation();
}

export function createBulkProcessor<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    delayMs?: number;
    rateLimiter?: RateLimiter;
    rateLimitKey?: string;
  } = {}
): Promise<PromiseSettledResult<R>[]> {
  const {
    batchSize = 5,
    delayMs = 100,
    rateLimiter = rateLimiters.bulk,
    rateLimitKey = 'bulk_operation'
  } = options;

  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  return Promise.allSettled(
    batches.flatMap((batch, batchIndex) =>
      batch.map((item, itemIndex) =>
        new Promise<R>((resolve, reject) => {
          const delay = (batchIndex * batchSize + itemIndex) * delayMs;
          setTimeout(async () => {
            try {
              if (rateLimiter) {
                await rateLimiter.checkAndWait(`${rateLimitKey}_${batchIndex}_${itemIndex}`);
              }
              const result = await processor(item);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }, delay);
        })
      )
    )
  );
}
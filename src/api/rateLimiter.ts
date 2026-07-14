/**
 * Simple token-bucket rate limiter, one instance per API host.
 * Prevents Tome from hammering free public APIs and getting the user's IP throttled/blocked.
 */
export class RateLimiter {
	private tokens: number;
	private readonly max: number;
	private readonly refillMs: number;
	private queue: Array<() => void> = [];
	private timer: number | undefined;

	constructor(maxRequests = 5, refillIntervalMs = 1000) {
		this.max = maxRequests;
		this.tokens = maxRequests;
		this.refillMs = refillIntervalMs;
		this.timer = window.setInterval(() => {
			this.tokens = Math.min(this.max, this.tokens + 1);
			this.drain();
		}, this.refillMs);
	}

	schedule<T>(fn: () => Promise<T>): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const task = () => {
				fn().then(resolve).catch(reject);
			};
			if (this.tokens > 0) {
				this.tokens--;
				task();
			} else {
				this.queue.push(task);
			}
		});
	}

	private drain() {
		while (this.tokens > 0 && this.queue.length > 0) {
			this.tokens--;
			const next = this.queue.shift();
			if (next) next();
		}
	}

	destroy() {
		if (this.timer) window.clearInterval(this.timer);
		this.queue = [];
	}
}

// Shared limiters per provider - conservative defaults respecting each API's public etiquette.
export const limiters = {
	openLibrary: new RateLimiter(3, 1000), // OL asks for courteous/limited usage
	googleBooks: new RateLimiter(5, 1000), // ~100/day unauthenticated in practice, be gentle
	openAlex: new RateLimiter(10, 1000), // OpenAlex "polite pool" allows higher throughput
};

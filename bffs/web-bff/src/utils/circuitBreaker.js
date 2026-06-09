const CircuitBreaker = require("opossum");
const axios = require("axios");

const breakers = new Map();

function shouldCountAsFailure(error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    // 4xx means the request was bad or unauthorized.
    // That is not a service outage, so it should not open the breaker.
    if (status && status >= 400 && status < 500) {
      return false;
    }

    return true;
  }

  // gRPC unavailable, deadline exceeded, internal service errors, etc.
  return true;
}

function createBreaker(name, action, fallback = null) {
  const breaker = new CircuitBreaker(
    async (...args) => action(...args),
    {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 10000,
      rollingCountTimeout: 10000,
      rollingCountBuckets: 10,
      volumeThreshold: 3,
      errorFilter: (error) => !shouldCountAsFailure(error)
    }
  );

  breaker.on("open", () => {
    console.warn(`[CircuitBreaker] ${name} opened`);
  });

  breaker.on("halfOpen", () => {
    console.warn(`[CircuitBreaker] ${name} half-open`);
  });

  breaker.on("close", () => {
    console.info(`[CircuitBreaker] ${name} closed`);
  });

  if (fallback) {
    breaker.fallback(fallback);
  }

  breakers.set(name, breaker);
  return breaker;
}

function getBreakerSnapshot() {
  return [...breakers.entries()].map(([name, breaker]) => ({
    name,
    state: breaker.opened
      ? "OPEN"
      : breaker.halfOpen
        ? "HALF_OPEN"
        : "CLOSED",
    stats: {
      fires: breaker.stats.fires,
      failures: breaker.stats.failures,
      fallbacks: breaker.stats.fallbacks,
      successes: breaker.stats.successes,
      rejects: breaker.stats.rejects,
      timeouts: breaker.stats.timeouts
    }
  }));
}

module.exports = {
  createBreaker,
  getBreakerSnapshot
};
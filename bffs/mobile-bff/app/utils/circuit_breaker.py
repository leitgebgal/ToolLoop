import asyncio
import time
from enum import Enum
from typing import Any, Awaitable, Callable


class CircuitState(str, Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"


class CircuitBreakerOpenError(Exception):
    pass


class CircuitBreaker:
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        reset_timeout_seconds: int = 10,
        timeout_seconds: int = 3,
        fallback: Callable[..., Any] | None = None,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.reset_timeout_seconds = reset_timeout_seconds
        self.timeout_seconds = timeout_seconds
        self.fallback = fallback

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.opened_at = 0.0
        self.last_error = None

    async def call(self, func: Callable[..., Awaitable[Any]], *args, **kwargs):
        now = time.time()

        if self.state == CircuitState.OPEN:
            if now - self.opened_at >= self.reset_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
            else:
                if self.fallback:
                    return self.fallback(*args, **kwargs)
                raise CircuitBreakerOpenError(f"Circuit breaker {self.name} is OPEN")

        try:
            result = await asyncio.wait_for(
                func(*args, **kwargs),
                timeout=self.timeout_seconds
            )
            self._record_success()
            return result

        except Exception as ex:
            self._record_failure(ex)

            if self.fallback:
                return self.fallback(*args, **kwargs)

            raise

    def _record_success(self):
        self.success_count += 1
        self.failure_count = 0
        self.last_error = None
        self.state = CircuitState.CLOSED

    def _record_failure(self, ex: Exception):
        self.failure_count += 1
        self.last_error = str(ex)

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = time.time()


breakers: dict[str, CircuitBreaker] = {}


def create_breaker(
    name: str,
    failure_threshold: int = 3,
    reset_timeout_seconds: int = 10,
    timeout_seconds: int = 3,
    fallback: Callable[..., Any] | None = None,
):
    breaker = CircuitBreaker(
        name=name,
        failure_threshold=failure_threshold,
        reset_timeout_seconds=reset_timeout_seconds,
        timeout_seconds=timeout_seconds,
        fallback=fallback,
    )

    breakers[name] = breaker
    return breaker


def breaker_snapshot():
    return [
        {
            "name": breaker.name,
            "state": breaker.state,
            "failureCount": breaker.failure_count,
            "successCount": breaker.success_count,
            "lastError": breaker.last_error,
        }
        for breaker in breakers.values()
    ]
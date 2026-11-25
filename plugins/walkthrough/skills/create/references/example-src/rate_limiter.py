"""A per-client rate limiter using a token bucket."""
import time
from dataclasses import dataclass, field


@dataclass
class Bucket:
    capacity: int          # most requests allowed in a burst
    refill_per_sec: float  # tokens added back each second
    tokens: float = field(init=False)
    updated: float = field(default_factory=time.monotonic)

    def __post_init__(self):
        self.tokens = self.capacity  # a new client starts with a full bucket


class RateLimiter:
    def __init__(self, capacity=10, refill_per_sec=1.0):
        self.capacity = capacity
        self.refill_per_sec = refill_per_sec
        self.buckets = {}  # client id -> Bucket

    def allow(self, client_id: str) -> bool:
        bucket = self.buckets.get(client_id)
        if bucket is None:
            bucket = Bucket(self.capacity, self.refill_per_sec)
            self.buckets[client_id] = bucket

        now = time.monotonic()
        elapsed = now - bucket.updated
        bucket.tokens = min(bucket.capacity, bucket.tokens + elapsed * bucket.refill_per_sec)
        bucket.updated = now

        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True
        return False

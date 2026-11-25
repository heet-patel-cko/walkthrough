---
title: How the rate limiter decides
subtitle: A short example walkthrough of `rate_limiter.py`, to copy the shape from
id: example-rate-limiter
version: 1
level: familiar
root: example-src
---

:::tldr
`RateLimiter.allow()` gives every client a [[token bucket]]. Each request spends one token, and tokens trickle back over time. A client can burst up to 10 requests, then gets about 1 per second.
:::

## What you're about to read {#intro}

This explains one file, `rate_limiter.py`, for someone who knows Python but hasn't seen this code. We follow one client, **`client-a`**, as it sends 11 requests in the same instant and then waits 3 seconds.

## The big picture {#big-picture}

:::flow One request
A request arrives | `allow("client-a")` | The caller asks: may this client go ahead?
Find the bucket | `self.buckets` | Make a full one if this client is new
Refill | elapsed time × rate | Add back the tokens earned since last time
Spend or refuse | `tokens >= 1` | Take one token and say yes, or say no
:::

Two ideas matter before the code:

- Every client has its **own** bucket, so one noisy client can't use up another's allowance.
- Nothing runs in the background. The bucket is refilled only when it's next used, by working out how much time has passed.

## The bucket {#bucket}

::code rate_limiter.py#L6-14 hl=8-9 pin=8:1,9:2,14:3

A `Bucket` holds two settings and two pieces of state. ((1)) is the burst size and ((2)) is how fast tokens come back. ((3)) means a brand-new client can burst right away.

:::why Why `time.monotonic()` and not `time.time()`?
The wall clock can jump backwards, for example when the system clock is corrected. A jump back would make `elapsed` negative and drain tokens. A monotonic clock only moves forwards.
:::

## Deciding one request {#allow}

::code rate_limiter.py#L23-37 pin=24:1,30:2,31:3,34:4

((1)) finds this client's bucket and creates a full one the first time. ((2)) and ((3)) are the refill: tokens earned since the last call, capped at the capacity so a client that's been idle for an hour still bursts only 10. ((4)) is the decision.

:::trace Following client-a
Requests 1–10 each find at least one token and get `True`, leaving the bucket at about 0. Request 11 finds less than 1 token and gets `False`. After waiting 3 seconds, the next call refills about 3 tokens, so 3 more requests pass.
:::

:::watch Not safe across threads
Two threads calling `allow()` for the same client can both read the same `tokens` before either writes it back, so both pass. If this is used from several threads, wrap the body of `allow()` in a lock.
:::

:::details Why tokens are a float
Refilling 1 token per second after 0.25 seconds adds 0.25 of a token. Rounding each time would lose those fractions, so frequent callers would refill more slowly than the setting says.
:::

## What to check when reviewing {#review}

- [ ] The cap in `min(bucket.capacity, …)` is there, so idle clients can't bank unlimited tokens
- [ ] `self.buckets` never shrinks. Does that matter for how many distinct clients we expect?
- [ ] Whether callers use threads (see the warning in [Deciding one request](#allow))

## Words used here {#glossary}

:::glossary
Token bucket: A counter that fills at a steady rate up to a maximum. Each action spends one token, and when it's empty, actions are refused.
:::

## What happens next {#next}

Open question: should buckets for clients that have been idle a long time be removed, to keep memory flat?

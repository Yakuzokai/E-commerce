---
title: Retry Strategy
tags:
  - messaging
  - reliability
  - retry
aliases:
  - Retry Strategy
created: 2026-09-10
type: messaging
---

# 🔁 Consumer Retry Strategy

To handle transient failures (database timeouts, network blips) without blocking Kafka topic partitions, consumers follow an **Exponential Backoff with Jitter** retry pattern.

---

## 📈 Backoff Formula

```text
Wait Time = min(maxInterval, initialInterval * 2^(retryCount)) ± random_jitter
```

- **Initial Interval**: 100ms
- **Multiplier**: 2.0
- **Max Retries**: 3 attempts
- **Action on Max Retries Exceeded**: Forward to [[Dead Letter Queues]].

---

## 🔗 Related Documents
- [[Dead Letter Queues]]
- [[Kafka Architecture]]
- [[Failure Handling]]

---
title: Distributed Locks
tags:
  - reliability
  - redis
  - redlock
aliases:
  - Distributed Locks
  - Redlock
created: 2026-09-10
type: reliability
---

# 🔒 Distributed Locks (Resolving REL-002)

> [!important] Resolving REL-002: Flash Sale Concurrency
> Simple SQL updates cause inventory overselling when hundreds of customers buy the same limited-stock item simultaneously.

---

## ⚡ Redis Redlock Implementation

In [[Product Service]], stock reservation wraps Redis locks:

```typescript
const lockKey = `lock:inventory:${productVariantId}`;
const lock = await redlock.acquire([lockKey], 5000); // 5s TTL

try {
  // Check stock and decrement atomically
  await reserveStock(productVariantId, quantity);
} finally {
  await lock.release();
}
```

---

## 🔗 Related Documents
- [[Inventory Reservation]]
- [[Redis Architecture]]
- [[Problem Tracker]]

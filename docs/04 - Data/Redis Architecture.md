---
title: Redis Architecture
tags:
  - data
  - redis
  - caching
aliases:
  - Redis Architecture
created: 2026-09-10
type: data
---

# ⚡ Redis Architecture

Redis provides sub-millisecond in-memory storage for high-frequency operations:

---

## 🔑 Key Namespaces & Data Structures

| Key Pattern | Service | Structure | Purpose | TTL |
|---|---|---|---|---|
| `cart:<userId>` | [[Cart Service]] | Hash / JSON | Active user shopping cart | 30 Days |
| `order:<orderId>` | [[Order Service]] | String | Fast lookup during checkout | 15 Mins |
| `trending:products` | [[Recommendation Service]] | Sorted Set (`ZSET`) | Scored by view/order velocity | Decayed |
| `user:viewed:<userId>` | [[Recommendation Service]] | Sorted Set | Recently viewed product IDs | 7 Days |
| `product:views:<productId>` | [[Recommendation Service]] | Integer counter | View count | 24 Hours |
| `lock:inventory:<variantId>` | [[Product Service]] | String (Redlock) | Concurrency lock during checkout | 5 Seconds |
| `socket.io#*` | [[Chat Service]] | Pub/Sub Channels | Multi-pod chat broadcast | N/A |

---

## 🔗 Related Documents
- [[Distributed Locks]]
- [[Cart Service]]
- [[Recommendation Service]]

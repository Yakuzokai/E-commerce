---
title: Data Architecture
tags:
  - architecture
  - database
  - postgresql
  - redis
  - elasticsearch
aliases:
  - Data Architecture
created: 2026-09-10
type: architecture
---

# 🗄️ Data Architecture

ShopHub implements a **Polyglot Persistence Architecture** using PostgreSQL, Redis, and Elasticsearch.

---

## 📊 Persistence Roles

1. **PostgreSQL**: ACID relational transactions for core business records.
   - Target goal: Transition from shared `ecommerce_db` to isolated databases ([[Database Isolation]]).
2. **Redis**: High-speed ephemeral data, sub-millisecond carts, distributed locks, and WebSocket clustering.
3. **Elasticsearch**: Inverted-index full-text search and behavioral event logging.

---

## 🔗 Related Documents
- [[PostgreSQL Architecture]]
- [[Database Isolation]]
- [[Redis Architecture]]
- [[Elasticsearch Architecture]]
- [[Data Ownership Matrix]]

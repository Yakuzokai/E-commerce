---
title: PostgreSQL Architecture
tags:
  - data
  - postgresql
  - database
aliases:
  - PostgreSQL Architecture
created: 2026-09-10
type: data
---

# 🐘 PostgreSQL Architecture

PostgreSQL is the primary transactional store for ShopHub, powering customer identities, catalog metadata, orders, payments, reviews, and notifications.

---

## 📊 Connection Pools & Performance
- Services connect using the `pg` library with pooled connections (`max: 20` clients).
- Queries utilize parameterized statements to prevent SQL injection.
- Indexes are enforced on foreign keys and lookup attributes (`email`, `order_number`, `user_id`, `product_id`).

---

## 🔗 Related Documents
- [[Database Isolation]]
- [[Data Ownership Matrix]]

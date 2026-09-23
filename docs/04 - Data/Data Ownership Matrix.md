---
title: Data Ownership Matrix
tags:
  - data
  - architecture
  - governance
aliases:
  - Data Ownership Matrix
created: 2026-09-10
type: data
---

# 📋 Data Ownership Matrix

Strict governance of which microservice acts as the single source of truth (System of Record) for each entity:

| Business Entity | System of Record | Read-Only Replicas / Views |
|---|---|---|
| User Credentials & Sessions | [[Auth Service]] (`auth_db`) | None |
| Customer Profile & Addresses | [[User Service]] (`user_db`) | [[Order Service]] (Snapshot) |
| Product Catalog & Stock | [[Product Service]] (`product_db`) | [[Search Service]] (ES Index), [[Cart Service]] (Redis Cache) |
| Active Shopping Carts | [[Cart Service]] (Redis) | [[Recommendation Service]] |
| Order Records & History | [[Order Service]] (`order_db`) | [[Analytics Service]] (Aggregates) |
| Payments & Transactions | [[Payment Service]] (`payment_db`) | [[Order Service]] (Status flag) |
| Reviews & Ratings | [[Review Service]] (`review_db`) | [[Product Service]] (Summary) |
| Chat Conversations | [[Chat Service]] (`chat_db`) | None |
| Transactional Notifications | [[Notification Service]] (`notification_db`) | None |

---

## 🔗 Related Documents
- [[Database Isolation]]
- [[PostgreSQL Architecture]]

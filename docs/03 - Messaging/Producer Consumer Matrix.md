---
title: Producer Consumer Matrix
tags:
  - messaging
  - kafka
aliases:
  - Producer Consumer Matrix
created: 2026-09-10
type: messaging
---

# 📡 Producer Consumer Matrix

Complete mapping of who publishes and who subscribes to every topic:

| Topic | Producer | Consumers |
|---|---|---|
| `orders.created` | [[Order Service]] | [[Fraud Detection Service]], [[Notification Service]], [[Analytics Service]] |
| `orders.status_changed` | [[Order Service]] | [[Notification Service]], [[Payment Service]] |
| `orders.cancelled` | [[Order Service]] | [[Notification Service]], [[Product Service]] |
| `payments.completed` | [[Payment Service]] | [[Order Service]], [[Notification Service]] |
| `payments.failed` | [[Payment Service]] | [[Order Service]], [[Notification Service]] |
| `payment.processed` | [[Payment Service]] | [[Fraud Detection Service]], [[Analytics Service]] |
| `products.created` | [[Product Service]] | [[Search Service]] |
| `products.updated` | [[Product Service]] | [[Search Service]] |
| `products.deleted` | [[Product Service]] | [[Search Service]] |
| `products.viewed` | [[Product Service]] | [[Recommendation Service]], [[Analytics Service]] |
| `cart.updated` | [[Cart Service]] | [[Recommendation Service]] |
| `chat.messages` | [[Chat Service]] | [[Notification Service]] |
| `users.created` | [[Auth Service]] | [[User Service]] |
| `fraud.alert` | [[Fraud Detection Service]] | [[Order Service]] |

---

## 🔗 Related Documents
- [[Topic Catalog]]
- [[Kafka Architecture]]

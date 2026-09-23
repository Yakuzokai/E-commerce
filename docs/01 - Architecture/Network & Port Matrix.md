---
title: Network & Port Matrix
tags:
  - architecture
  - networking
  - ports
aliases:
  - Network & Port Matrix
  - Port Matrix
created: 2026-09-10
type: architecture
---

# 🌐 Network & Port Matrix

This document reconciles all ports across the current codebase and specifies the target configuration.

---

## ⚠️ Payment vs. Order Port Collision

> [!caution] Verified Codebase Collision (ARCH-002)
> - `order-service/src/config/index.ts` sets `PORT: 3004`.
> - `payment-service/src/config/index.ts` sets `port: 3004`.
> - `order-service/src/config/index.ts` references `PAYMENT_SERVICE_URL: http://localhost:3005` (which is [[Search Service]]).
> 
> **Reconciliation**:
> 1. Set `PORT=3015` for [[Payment Service]] in local development.
> 2. In production, use internal DNS names (`http://payment-service:3015`).

---

## 📊 Port Allocation Table

| Service | Package | Current Port | Target Port | Status |
|---|---|---|---|---|
| [[Auth Service]] | `@ecommerce/auth-service` | `3001` | `3001` | Clean |
| [[Product Service]] | `@ecommerce/product-service` | `3003` | `3003` | Clean |
| [[Order Service]] | `@ecommerce/order-service` | `3004` | `3004` | Collision with Payment |
| [[Payment Service]] | `@shophub/payment-service` | `3004` | `3015` | Reassigned |
| [[Search Service]] | `@shophub/search-service` | `3005` | `3005` | Clean |
| [[Cart Service]] | `@shophub/cart-service` | `3006` | `3006` | Clean |
| [[Notification Service]] | `@shophub/notification-service` | `3007` | `3007` | Clean |
| [[User Service]] | `@shophub/user-service` | `3008` | `3008` | Clean |
| [[Review Service]] | `@shophub/review-service` | `3009` | `3009` | Clean |
| [[Recommendation Service]] | `@shophub/recommendation-service` | `3010` | `3010` | Clean |
| [[Chat Service]] | `@shophub/chat-service` | `3011` | `3011` | Clean |
| [[ML Service]] | `ml-service` | `3012` | `3012` | Clean |
| [[Fraud Detection Service]] | `fraud-detection-service` | `3013` | `3013` | Clean |
| [[Analytics Service]] | `analytics-service` | `3014` | `3014` | Clean |

---

## 🔗 Related Documents
- [[Problem Tracker]]
- [[Service Discovery]]
- [[Local Development Setup]]

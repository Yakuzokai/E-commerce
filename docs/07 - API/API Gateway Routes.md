---
title: API Gateway Routes
tags:
  - api
  - gateway
  - routing
aliases:
  - API Gateway Routes
created: 2026-09-10
type: api
---

# 🚪 API Gateway Route Table

This document details the public ingress routing mappings handled by [[API Gateway]]:

| Public Ingress Path | Destination Service | Port | Auth Required | Description |
|---|---|---|---|---|
| `/api/v1/auth/*` | [[Auth Service]] | `3001` | Mixed | Registration, login, token refresh |
| `/api/v1/users/*` | [[User Service]] | `3008` | Bearer JWT | Profile, addresses, preferences |
| `/api/v1/products/*` | [[Product Service]] | `3003` | Public | Catalog browsing, flash sales |
| `/api/v1/cart/*` | [[Cart Service]] | `3006` | Bearer JWT | Active cart and vouchers |
| `/api/v1/orders/*` | [[Order Service]] | `3004` | Bearer JWT | Order placement and tracking |
| `/api/v1/payments/*` | [[Payment Service]] | `3015` | Bearer JWT / Webhook | Payment processing and Stripe hooks |
| `/api/v1/search/*` | [[Search Service]] | `3005` | Public | Elasticsearch full-text queries |
| `/api/v1/reviews/*` | [[Review Service]] | `3009` | Mixed | Product ratings and reviews |
| `/api/v1/recommendations/*`| [[Recommendation Service]] | `3010` | Mixed | Personalized feeds and trending |
| `/socket.io/*` | [[Chat Service]] | `3011` | WebSocket JWT | Real-time buyer/seller chat |
| `/api/v1/notifications/*` | [[Notification Service]]| `3007` | Bearer JWT | In-app notification feeds |
| `/api/v1/analytics/*` | [[Analytics Service]] | `3014` | Admin JWT | Business telemetry dashboards |

---

## 🔗 Related Documents
- [[API Gateway]]
- [[Authentication & Authorization]]

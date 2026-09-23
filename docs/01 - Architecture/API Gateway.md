---
title: API Gateway
tags:
  - architecture
  - gateway
  - ingress
  - security
aliases:
  - API Gateway
  - Ingress Gateway
created: 2026-09-10
type: architecture
---

# 🚪 API Gateway Architecture

The **API Gateway** is the single ingress point in the [[Target Architecture]], resolving **ARCH-001**. It eliminates direct client exposure to internal microservices ports.

---

## 🎯 Responsibilities

1. **Single Entry Point**: Listens on ports `80` and `443`; routes traffic to backend services.
2. **Authentication Offload**: Validates Bearer JWT access tokens and injects verified headers:
   - `X-User-Id`: UUID of the authenticated caller
   - `X-User-Role`: `customer`, `seller`, or `admin`
3. **Rate Limiting & Throttling**: Implements IP and user-based token bucket rate limiting via Redis.
4. **CORS Centralization**: Handles pre-flight `OPTIONS` requests centrally.
5. **Request Correlation**: Generates and injects `X-Correlation-ID` if not provided.

---

## 🔀 Route Routing Rules

```mermaid
flowchart LR
    Client["Client HTTPS Request"] --> GW["API Gateway (:443)"]

    GW -->|/api/v1/auth/*| Auth["Auth Service (:3001)"]
    GW -->|/api/v1/users/*| User["User Service (:3008)"]
    GW -->|/api/v1/products/*| Prod["Product Service (:3003)"]
    GW -->|/api/v1/cart/*| Cart["Cart Service (:3006)"]
    GW -->|/api/v1/orders/*| Order["Order Service (:3004)"]
    GW -->|/api/v1/payments/*| Pay["Payment Service (:3015)"]
    GW -->|/api/v1/search/*| Search["Search Service (:3005)"]
    GW -->|/socket.io/*| Chat["Chat Service (:3011)"]
```

---

## 🔗 Related Documents
- [[API Gateway Routes]]
- [[Authentication & Authorization]]
- [[Target Architecture]]
- [[Critical Issues]]

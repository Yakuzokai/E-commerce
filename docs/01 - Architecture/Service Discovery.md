---
title: Service Discovery
tags:
  - architecture
  - networking
  - service-discovery
aliases:
  - Service Discovery
  - Internal Networking
created: 2026-09-10
type: architecture
---

# 🧭 Service Discovery & Internal Networking

In the **Current State**, services reference hardcoded `localhost:PORT` values. In the **Target State**, services communicate via **Container DNS** within a Docker bridge network or Kubernetes service names.

---

## 🌐 Target DNS Name Mapping

| Service | Internal Hostname | Internal Port | External Port |
|---|---|---|---|
| [[Auth Service]] | `http://auth-service` | `3001` | Not Exposed (Gateway only) |
| [[Product Service]] | `http://product-service` | `3003` | Not Exposed |
| [[Order Service]] | `http://order-service` | `3004` | Not Exposed |
| [[Payment Service]] | `http://payment-service` | `3015` | Not Exposed |
| [[Search Service]] | `http://search-service` | `3005` | Not Exposed |
| [[Cart Service]] | `http://cart-service` | `3006` | Not Exposed |
| [[Chat Service]] | `http://chat-service` | `3011` | Not Exposed |

---

## 🔗 Related Documents
- [[Docker Compose]]
- [[Network & Service Discovery]]
- [[Network & Port Matrix]]

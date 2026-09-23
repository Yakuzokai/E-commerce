---
title: Network & Service Discovery
tags:
  - infrastructure
  - networking
  - dns
aliases:
  - Network & Service Discovery
created: 2026-09-10
type: infrastructure
---

# 🌐 Network & Service Discovery

Internal services communicate across an isolated Docker network bridge (`shophub-network`).

---

## 🏷️ Docker Network Aliases

- In production and Docker Compose, services connect via service name:
  - `DATABASE_URL=postgresql://user:pass@postgres:5432/db`
  - `REDIS_URL=redis://redis:6379`
  - `KAFKA_BROKERS=kafka:9092`
  - `AUTH_SERVICE_URL=http://auth-service:3001`

---

## 🔗 Related Documents
- [[Service Discovery]]
- [[Network & Port Matrix]]

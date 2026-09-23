---
title: Health Checks
tags:
  - operations
  - health
aliases:
  - Health Checks
created: 2026-09-10
type: operations
---

# 🩺 Health & Readiness Checks

Every microservice implements dual probes:
- `GET /health`: **Liveness probe** (verifies HTTP server event loop is responsive).
- `GET /ready` or `GET /health/ready`: **Readiness probe** (verifies connection to PostgreSQL, Redis, and Kafka brokers).

---

## 🔗 Related Documents
- [[Monitoring & Observability]]
- [[Production Readiness]]

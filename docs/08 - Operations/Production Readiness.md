---
title: Production Readiness
tags:
  - operations
  - readiness
  - checklist
aliases:
  - Production Readiness
created: 2026-09-10
type: operations
---

# 📋 Production Readiness Checklist

Before moving from **Current State** to **Target State**, each service must satisfy the 12-Factor App standards:

- [ ] **Ingress**: Traffic routed strictly through [[API Gateway]].
- [ ] **Data Isolation**: Dedicated database or isolated schema ([[Database Isolation]]).
- [ ] **Reliability**: No silent Kafka failures ([[Transactional Outbox]]).
- [ ] **DLQ**: Dead letter topic configured on every consumer ([[Dead Letter Queues]]).
- [ ] **Observability**: `x-correlation-id` in every Winston log line ([[Correlation IDs]]).
- [ ] **Health Probes**: Working `/health` and `/ready` endpoints ([[Health Checks]]).

---

## 🔗 Related Documents
- [[Target Architecture]]
- [[Problem Tracker]]

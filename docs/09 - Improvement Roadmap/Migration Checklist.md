---
title: Migration Checklist
tags:
  - roadmap
  - checklist
aliases:
  - Migration Checklist
created: 2026-09-10
type: roadmap
---

# ✅ Architectural Migration Checklist

Use this checklist to track progress from Current State to Target State:

- [ ] **ARCH-001**: API Gateway implemented on port 443/80 ([[API Gateway]])
- [ ] **ARCH-002**: Payment Service port changed to 3015 ([[Network & Port Matrix]])
- [ ] **ARCH-003**: Transactional Outbox pattern implemented in Order Service ([[Transactional Outbox]])
- [ ] **ARCH-004**: Database isolation executed for Auth, Product, and Order ([[Database Isolation]])
- [ ] **INFRA-001**: Root docker-compose.yml validated ([[Docker Compose]])
- [ ] **REL-001**: Correlation IDs propagated across all services ([[Correlation IDs]])
- [ ] **REL-002**: Redis Redlock implemented for inventory reservation ([[Distributed Locks]])
- [ ] **REL-003**: Kafka Dead Letter Queues configured on consumers ([[Dead Letter Queues]])

---

## 🔗 Related Documents
- [[Problem Tracker]]
- [[Target Architecture]]

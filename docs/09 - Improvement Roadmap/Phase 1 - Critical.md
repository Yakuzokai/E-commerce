---
title: Phase 1 - Critical
tags:
  - roadmap
  - phase-1
aliases:
  - Phase 1 - Critical
created: 2026-09-10
type: roadmap
---

# 🔥 Phase 1: Critical Architecture Fixes

Immediate remediation tasks:

1. **Deploy API Gateway**: Build gateway service routing requests to internal ports.
2. **Reassign Payment Port**: Move [[Payment Service]] to port `3015` and remove hardcoded `localhost:3005` in [[Order Service]].
3. **Implement Transactional Outbox**: Add `outbox_events` table to `order-service` and `payment-service`.

---

## 🔗 Related Documents
- [[Critical Issues]]
- [[Phase 2 - Infrastructure]]

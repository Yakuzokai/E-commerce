---
title: Failure Handling
tags:
  - reliability
  - circuit-breaker
  - resilience
aliases:
  - Failure Handling
created: 2026-09-10
type: reliability
---

# 🛡️ Failure Handling & Circuit Breakers

Patterns implemented across the ShopHub platform to survive subsystem outages:

1. **Circuit Breaker**: When external payment gateways (Stripe/PayPal) fail repeatedly, trip the circuit breaker and return instant fail responses rather than exhausting connection pools.
2. **Fallback Caches**: If Elasticsearch is unreachable, [[Search Service]] falls back to basic PostgreSQL database queries.
3. **Compensating Transactions**: If order processing fails midway through the saga, emit compensating events (`orders.cancelled`, `payments.refunded`).

---

## 🔗 Related Documents
- [[Idempotency]]
- [[Retry Strategy]]
- [[Dead Letter Queues]]

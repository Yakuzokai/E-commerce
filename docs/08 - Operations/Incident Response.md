---
title: Incident Response
tags:
  - operations
  - runbooks
  - incidents
aliases:
  - Incident Response
created: 2026-09-10
type: operations
---

# 🚨 Incident Response Runbooks

Triage instructions for production outages:

1. **Kafka Broker Unreachable**:
   - Outbox relay halts automatically; orders continue to be saved in PostgreSQL `outbox_events`.
   - Alert on outbox queue growth; no orders are lost.
2. **PostgreSQL Failover**:
   - Connection pool automatically reconnects on replica promotion.
3. **Consumer Poison Pill**:
   - Message routed to `.DLQ` topic ([[Dead Letter Queues]]); consumer resumes normal processing.

---

## 🔗 Related Documents
- [[Dead Letter Queues]]
- [[Transactional Outbox]]

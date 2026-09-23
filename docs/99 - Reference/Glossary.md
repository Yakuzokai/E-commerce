---
title: Glossary
tags:
  - reference
  - glossary
aliases:
  - Glossary
created: 2026-09-10
type: reference
---

# 📖 Glossary

- **Bounded Context**: Domain-driven boundary containing an isolated domain model and persistence store.
- **Event Choreography**: Asynchronous collaboration where services react to events without a central coordinator.
- **Idempotency**: Executing an operation multiple times produces the identical outcome.
- **Transactional Outbox**: Writing domain changes and outgoing events in the same database transaction to guarantee reliable messaging.
- **Dead Letter Queue (DLQ)**: A secondary Kafka topic for unprocessable poison-pill messages.
- **Redlock**: Distributed locking algorithm over Redis to prevent race conditions during high-concurrency operations.
- **GMV**: Gross Merchandise Value tracked by [[Analytics Service]].

---

## 🔗 Related Documents
- [[Technology Stack]]
- [[Target Architecture]]

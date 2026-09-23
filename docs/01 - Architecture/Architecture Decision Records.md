---
title: Architecture Decision Records
tags:
  - architecture
  - adr
  - decisions
aliases:
  - Architecture Decision Records
  - ADRs
created: 2026-09-10
type: architecture
---

# 📜 Architecture Decision Records (ADRs)

Chronological log of structural architectural decisions for ShopHub.

---

### ADR-001: Introduce API Gateway as Single Ingress
- **Context**: Clients currently connect to 14 separate microservice ports directly.
- **Decision**: Introduce an API Gateway on port `443` / `80` to centralize routing, authentication, and CORS.
- **Status**: Accepted (Implemented in [[Target Architecture]]).

### ADR-002: Reassign Payment Service Default Port to 3015
- **Context**: [[Payment Service]] and [[Order Service]] both default to port `3004`.
- **Decision**: Reassign Payment Service to `3015` in development and use internal DNS in Docker.
- **Status**: Accepted.

### ADR-003: Adopt Transactional Outbox Pattern for Kafka
- **Context**: Network failures during Kafka publish cause silent event loss.
- **Decision**: Persist events to an `outbox_events` table in PostgreSQL inside the business transaction.
- **Status**: Accepted ([[Transactional Outbox]]).

### ADR-004: Decompose Shared Database into Isolated Schemas
- **Context**: `auth`, `product`, `order`, and `notification` share `ecommerce_db`.
- **Decision**: Decompose into per-service databases (`auth_db`, `product_db`, `order_db`).
- **Status**: Accepted ([[Database Isolation]]).

### ADR-005: Redis Distributed Locks for Flash Sales
- **Context**: High concurrency checkouts cause inventory overselling.
- **Decision**: Implement Redis Redlock in [[Product Service]].
- **Status**: Accepted ([[Distributed Locks]]).

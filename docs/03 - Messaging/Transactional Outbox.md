---
title: Transactional Outbox
tags:
  - messaging
  - reliability
  - outbox
  - pattern
aliases:
  - Transactional Outbox
  - Outbox Pattern
created: 2026-09-10
type: messaging
---

# 📋 Transactional Outbox Pattern

> [!important] Resolving ARCH-003: Silent Kafka Publish Failures
> In the current codebase, Kafka publish failures are swallowed in a `try/catch` block. If Kafka drops a connection, orders are committed to PostgreSQL without downstream events ever being emitted.

---

## 🏗️ Outbox Architecture

```mermaid
sequenceDiagram
    participant API as API Handler
    participant DB as PostgreSQL
    participant Outbox as outbox_events Table
    participant Worker as Outbox Relay Worker
    participant Kafka as Apache Kafka

    API->>DB: BEGIN Transaction
    API->>DB: INSERT INTO orders (...)
    API->>Outbox: INSERT INTO outbox_events (id, topic, payload, status='PENDING')
    API->>DB: COMMIT Transaction
    API-->>API: Success response to client

    loop Polling or CDC Stream
        Worker->>Outbox: SELECT * FROM outbox_events WHERE status='PENDING'
        Worker->>Kafka: Publish event payload
        Kafka-->>Worker: ACK
        Worker->>Outbox: UPDATE outbox_events SET status='PUBLISHED'
    end
```

---

## 🗄️ Outbox Table Schema

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(50) NOT NULL, -- 'ORDER', 'PAYMENT'
  aggregate_id UUID NOT NULL,
  topic VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PUBLISHED', 'FAILED'
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';
```

---

## 🔗 Related Documents
- [[Kafka Architecture]]
- [[Problem Tracker]]
- [[Order Service]]

---
title: Correlation IDs
tags:
  - reliability
  - tracing
  - observability
aliases:
  - Correlation IDs
created: 2026-09-10
type: reliability
---

# 🆔 Correlation IDs (Resolving REL-001)

> [!important] Resolving REL-001
> In the current codebase, request cascading from HTTP through Kafka to downstream services has no shared identifier, making debugging across 14 services nearly impossible.

---

## 🔄 Correlation Propagation

```mermaid
sequenceDiagram
    participant C as Client
    participant GW as [[API Gateway]]
    participant OS as [[Order Service]]
    participant KF as [[Kafka Architecture|Kafka Event]]
    participant FS as [[Fraud Detection Service]]

    C->>GW: POST /api/v1/orders
    GW->>GW: Generate x-correlation-id: "cid-12345"
    GW->>OS: Forward with x-correlation-id: "cid-12345"
    OS->>OS: Log with "cid-12345"
    OS->>KF: Publish orders.created with header correlationId="cid-12345"
    KF->>FS: Consume event
    FS->>FS: Extract header and log with "cid-12345"
```

---

## 🔗 Related Documents
- [[Distributed Tracing]]
- [[Monitoring & Observability]]
- [[Problem Tracker]]

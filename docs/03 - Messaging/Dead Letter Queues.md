---
title: Dead Letter Queues
tags:
  - messaging
  - reliability
  - dlq
aliases:
  - Dead Letter Queues
  - DLQ
created: 2026-09-10
type: messaging
---

# 🛑 Dead Letter Queues (DLQ)

> [!important] Resolving REL-003
> Poison-pill messages (corrupt JSON, missing mandatory fields) currently halt Kafka consumer processing loops. Dead Letter Queues isolate failed messages for post-mortem analysis.

---

## 🔄 DLQ Routing Flow

```mermaid
flowchart LR
    Topic["Incoming Topic<br/>orders.created"] --> Consumer["Kafka Consumer"]
    Consumer -->|Process Message| Logic["Business Logic"]

    Logic -->|Success| Commit["Commit Offset"]
    Logic -->|Failure 1, 2, 3| Retry["[[Retry Strategy]]<br/>Exponential Backoff"]
    Retry -->|Max Retries Exceeded| DLQ["DLQ Topic<br/>orders.created.DLQ"]
    DLQ --> Alert["Alert On-Call & Store for Replay"]
```

---

## 🔗 Related Documents
- [[Retry Strategy]]
- [[Kafka Architecture]]
- [[Problem Tracker]]

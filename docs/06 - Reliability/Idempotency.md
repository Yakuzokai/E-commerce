---
title: Idempotency
tags:
  - reliability
  - idempotency
aliases:
  - Idempotency
created: 2026-09-10
type: reliability
---

# 🔁 Idempotency Pattern

Because Kafka guarantees **At-Least-Once Delivery**, consumers can receive duplicate messages during network re-balances.

---

## 🛡️ Idempotency Verification Flow

```mermaid
flowchart TD
    Msg["Incoming Kafka Event<br/>(key: orderId)"] --> Check{"Processed in Redis / DB?"}
    Check -->|Yes| Skip["ACK & Skip Execution"]
    Check -->|No| Exec["Execute Business Logic"]
    Exec --> Store["Save Idempotency Key in Redis"]
    Store --> ACK["Commit Offset"]
```

---

## 🔗 Related Documents
- [[Payment Service]]
- [[Order Service]]
- [[Failure Handling]]

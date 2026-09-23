---
title: Kafka Architecture
tags:
  - messaging
  - kafka
  - architecture
aliases:
  - Kafka Architecture
  - Message Broker
created: 2026-09-10
type: messaging
---

# 📡 Kafka Architecture

ShopHub relies on **Apache Kafka** (`kafkajs`) as its distributed event streaming platform.

---

## 🏛️ Broker & Consumer Group Topology

- **Broker Connection**: Default `localhost:9092` via `KAFKA_BROKERS`.
- **Consumer Group Naming**: `<service-name>-group` (e.g., `notification-service-group`, `search-service-group`).
- **Partitioning Strategy**: Keys are typically `orderId` or `userId` to guarantee in-order event processing per entity.

```mermaid
flowchart LR
    P["Producer (e.g. [[Order Service]])"] -->|Topic: orders.created| KB[("Kafka Partition Key: orderId")]

    subgraph ConsumerGroups["Independent Consumer Groups"]
        KB --> CG1["fraud-detection-group<br/>[[Fraud Detection Service]]"]
        KB --> CG2["notification-group<br/>[[Notification Service]]"]
        KB --> CG3["analytics-group<br/>[[Analytics Service]]"]
    end
```

---

## 🔗 Related Documents
- [[Topic Catalog]]
- [[Producer Consumer Matrix]]
- [[Transactional Outbox]]
- [[Dead Letter Queues]]
- [[Retry Strategy]]

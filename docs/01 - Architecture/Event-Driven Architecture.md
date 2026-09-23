---
title: Event-Driven Architecture
tags:
  - architecture
  - kafka
  - events
  - saga
aliases:
  - Event-Driven Architecture
  - Event Bus
created: 2026-09-10
type: architecture
---

# ⚡ Event-Driven Architecture

ShopHub uses **Apache Kafka** (`kafkajs`) for asynchronous inter-service coordination, decoupled sagas, and real-time event distribution.

---

## 🔄 Order Checkout Saga Choreography

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Gateway as [[API Gateway]]
    participant Order as [[Order Service]]
    participant Outbox as [[Transactional Outbox]]
    participant Kafka as [[Kafka Architecture|Apache Kafka]]
    participant Fraud as [[Fraud Detection Service]]
    participant Payment as [[Payment Service]]
    participant Notif as [[Notification Service]]

    Customer->>Gateway: POST /api/v1/orders
    Gateway->>Order: Forward authenticated request
    Order->>Order: Save order & write event to Outbox (Atomic SQL)
    Order-->>Customer: 201 Created (Order pending)

    Outbox->>Kafka: Relay publishes 'orders.created'
    par Asynchronous Handlers
        Kafka->>Fraud: Consume 'orders.created'
        Kafka->>Notif: Consume 'orders.created' (Email sent)
    end

    Customer->>Payment: POST /api/v1/payments
    Payment->>Payment: Capture funds via Stripe/PayPal
    alt Payment Succeeded
        Payment->>Kafka: Publish 'payments.completed'
        Kafka->>Order: Transition order to 'processing'
        Kafka->>Notif: Send payment receipt
    else Payment Failed
        Payment->>Kafka: Publish 'payments.failed'
        Kafka->>Order: Transition order to 'payment_failed'
    end
```

---

## 🔗 Related Documents
- [[Kafka Architecture]]
- [[Topic Catalog]]
- [[Producer Consumer Matrix]]
- [[Transactional Outbox]]

---
title: Topic Catalog
tags:
  - messaging
  - kafka
  - topics
aliases:
  - Topic Catalog
  - Kafka Topics
created: 2026-09-10
type: messaging
---

# 📋 Kafka Topic Catalog

Verified catalog of all event topics implemented across the ShopHub codebase:

---

### Order & Fulfillment Topics
- **`orders.created`**: Published when an order is placed. Consumed by [[Fraud Detection Service]], [[Notification Service]], [[Analytics Service]].
- **`orders.updated`**: Emitted on order modifications.
- **`orders.status_changed`**: Emitted when order status changes (`pending` $ightarrow$ `processing` $ightarrow$ `shipped`).
- **`orders.cancelled`**: Emitted upon customer or seller cancellation. Triggers stock release and refund processes.
- **`shipments.created`**: Emitted when tracking number is assigned.

### Payment & Transaction Topics
- **`payments.created`**: Payment authorization requested.
- **`payments.completed`**: Charge captured successfully. Consumed by [[Order Service]] and [[Notification Service]].
- **`payments.failed`**: Card decline or processing error. Consumed by [[Order Service]].
- **`payment.processed`**: Real-time status update consumed by [[Fraud Detection Service]] and [[Analytics Service]].
- **`refunds.completed`**: Refund issued; consumed by [[Order Service]].

### Product & Search Topics
- **`products.created`**: New product saved; consumed by [[Search Service]] for indexing.
- **`products.updated`**: Attribute/price modification; updates Elasticsearch.
- **`products.deleted`**: Product removed; purges from search index.
- **`products.stock_changed`**: Inventory delta; triggers restock notifications.
- **`products.viewed`**: Product page visit; consumed by [[Recommendation Service]] and [[Analytics Service]].

### Cart & Checkout Topics
- **`cart.updated`**: Cart items changed; updates recommendation affinity.
- **`cart.cleared`**: Cart emptied after checkout.
- **`cart.checkout_started`**: User clicks checkout; tracked by [[Analytics Service]].
- **`products.added_to_cart`**: Specific item added.
- **`products.removed_from_cart`**: Specific item removed.

### User & Auth Topics
- **`users.created`**: Account registered in [[Auth Service]]; synchronizes profile in [[User Service]].
- **`users.updated`**: Profile edited.
- **`auth.user.logged_in`**: Security login event.
- **`auth.token.revoked`**: Session invalidated.

### Realtime & Intelligence Topics
- **`chat.messages`**: Message sent in [[Chat Service]]; alerts [[Notification Service]].
- **`reviews.created`**: Product review published; consumed by [[Product Service]].
- **`fraud.alert`**: High-risk score emitted by [[Fraud Detection Service]].
- **`ml.model.updated`**: Model weights updated by [[ML Service]].

---

## 🔗 Related Documents
- [[Producer Consumer Matrix]]
- [[Kafka Architecture]]

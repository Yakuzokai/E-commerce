---
title: Order Service
tags:
  - microservice
  - orders
  - saga
aliases:
  - Order Service
  - "@ecommerce/order-service"
port: 3004
database: postgresql (ecommerce_db)
created: 2026-09-10
type: microservice
---

# 📦 Order Service

The **Order Service** (`@ecommerce/order-service`) coordinates the order lifecycle, fulfillment state machine, and customer order histories.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/order-service`
- **Port**: `3004` *(Conflicts with Payment Service)*
- **Database**: PostgreSQL (`ecommerce_db`) $ightarrow$ Target: `order_db` ([[Database Isolation]])
- **Cache**: Redis (`order:<orderId>`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Bearer JWT | Place order; emits `orders.created` |
| `GET` | `/api/orders/:id` | Bearer JWT | Get order details |
| `GET` | `/api/orders/number/:orderNumber` | Bearer JWT | Lookup by order number |
| `GET` | `/api/users/:userId/orders` | Bearer JWT | Paginated orders for user |
| `GET` | `/api/orders` | Bearer JWT | Authenticated user's orders |
| `GET` | `/api/sellers/:sellerId/orders` | Seller | Incoming orders for merchant |
| `PATCH` | `/api/orders/:id/status` | Admin/Seller | Transition order state |
| `PATCH` | `/api/orders/:id/payment` | System | Update payment status |
| `POST` | `/api/orders/:id/cancel` | Bearer JWT | Cancel pending order |
| `POST` | `/api/orders/:id/returns` | Bearer JWT | Submit return request |

---

## 🚨 Architectural Issues & Traceability
- **ARCH-002**: Port collision with Payment Service $ightarrow$ [[Network & Port Matrix]]
- **ARCH-003**: Silent event publish failures $ightarrow$ [[Transactional Outbox]] $ightarrow$ [[Kafka Architecture]]
- **ARCH-004**: Shared database coupling $ightarrow$ [[Database Isolation]]

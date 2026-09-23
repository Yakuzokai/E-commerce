---
title: Cart Service
tags:
  - microservice
  - cart
  - redis
aliases:
  - Cart Service
  - "@shophub/cart-service"
port: 3006
database: redis (cart:*)
created: 2026-09-10
type: microservice
---

# 🛒 Cart Service

The **Cart Service** (`@shophub/cart-service`) provides in-memory shopping cart operations backed by **Redis** for ultra-low latency.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/cart-service`
- **Port**: `3006`
- **Data Store**: Redis (`cart:<userId>` hash with 30-day rolling TTL)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:userId/cart` | Bearer JWT | Fetch active cart items and totals |
| `POST` | `/api/users/:userId/cart/items` | Bearer JWT | Add product to cart |
| `PATCH` | `/api/users/:userId/cart/items/:itemId` | Bearer JWT | Update item quantity |
| `DELETE`| `/api/users/:userId/cart/items/:itemId` | Bearer JWT | Remove item from cart |
| `DELETE`| `/api/users/:userId/cart` | Bearer JWT | Empty cart |
| `POST` | `/api/users/:userId/cart/vouchers` | Bearer JWT | Apply discount coupon |
| `GET` | `/api/users/:userId/cart/summary` | Bearer JWT | Cart checkout financial summary |
| `POST` | `/api/users/:userId/cart/merge` | Bearer JWT | Merge guest cart with user cart |

---

## 📨 Kafka Event Integration

- **Produces**: `cart.updated`, `cart.cleared`, `cart.checkout_started`, `products.added_to_cart`, `products.removed_from_cart`
- **Details**: [[Topic Catalog#Cart & Checkout Topics]]

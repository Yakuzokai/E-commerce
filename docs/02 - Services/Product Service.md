---
title: Product Service
tags:
  - microservice
  - catalog
  - inventory
aliases:
  - Product Service
  - "@ecommerce/product-service"
port: 3003
database: postgresql (ecommerce_db) + redis
created: 2026-09-10
type: microservice
---

# 📦 Product Service

The **Product Service** (`@ecommerce/product-service`) manages product listings, category taxonomies, SKU variants, and stock inventories.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/product-service`
- **Port**: `3003`
- **Database**: PostgreSQL (`ecommerce_db`) $ightarrow$ Target: `product_db` ([[Database Isolation]])
- **Cache**: Redis (`ioredis`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/categories` | Public | Fetch category hierarchy |
| `GET` | `/api/v1/products` | Public | Paginated product search & catalog |
| `GET` | `/api/v1/products/trending` | Public | Trending products (cached) |
| `GET` | `/api/v1/products/flash-sales` | Public | Active flash sales |
| `GET` | `/api/v1/products/:id` | Public | Product details & SKU variants |
| `GET` | `/api/v1/products/slug/:slug` | Public | Product lookup by slug |

---

## 🚨 Architectural Issues & Traceability
- **REL-002**: Race conditions during high-volume checkouts $ightarrow$ [[Distributed Locks]] $ightarrow$ [[Inventory Reservation]]
- **ARCH-004**: Shared database coupling $ightarrow$ [[Database Isolation]]

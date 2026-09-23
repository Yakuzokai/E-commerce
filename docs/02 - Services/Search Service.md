---
title: Search Service
tags:
  - microservice
  - search
  - elasticsearch
aliases:
  - Search Service
  - "@shophub/search-service"
port: 3005
database: elasticsearch (products)
created: 2026-09-10
type: microservice
---

# 🔍 Search Service

The **Search Service** (`@shophub/search-service`) provides high-speed full-text queries, multi-attribute filtering, and auto-complete suggestions.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/search-service`
- **Port**: `3005`
- **Search Engine**: Elasticsearch (`@elastic/elasticsearch`, `products` index)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search` | Public | Full-text query with facets (`q`, `category`, `brand`, `minPrice`, `maxPrice`) |
| `GET` | `/api/search/suggest` | Public | Autocomplete suggestions |
| `GET` | `/api/search/similar/:productId` | Public | More-like-this product suggestions |

---

## 📨 Kafka Event Integration

- **Consumes**: `products.created`, `products.updated`, `products.deleted`, `products.index`

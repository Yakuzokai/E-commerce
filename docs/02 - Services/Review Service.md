---
title: Review Service
tags:
  - microservice
  - reviews
aliases:
  - Review Service
  - "@shophub/review-service"
port: 3009
database: postgresql (review_db)
created: 2026-09-10
type: microservice
---

# ⭐ Review Service

The **Review Service** (`@shophub/review-service`) manages product reviews, star ratings, verified purchase badges, and community Q&A.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/review-service`
- **Port**: `3009`
- **Database**: PostgreSQL (`review_db`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/products/:productId/reviews` | Public | List reviews for product |
| `GET` | `/api/products/:productId/rating-summary` | Public | Rating summary (average, distribution) |
| `POST` | `/api/products/rating-summaries` | Public | Batch rating summaries |
| `POST` | `/api/reviews` | Bearer JWT | Submit product review |
| `GET` | `/api/reviews/:id` | Public | Get single review |
| `POST` | `/api/reviews/:id/vote` | Bearer JWT | Cast helpfulness vote |
| `POST` | `/api/reviews/:id/response` | Seller/Admin | Post merchant response |

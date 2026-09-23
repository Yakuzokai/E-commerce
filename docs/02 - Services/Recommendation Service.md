---
title: Recommendation Service
tags:
  - microservice
  - recommendations
aliases:
  - Recommendation Service
  - "@shophub/recommendation-service"
port: 3010
database: elasticsearch + redis
created: 2026-09-10
type: microservice
---

# 🎯 Recommendation Service

The **Recommendation Service** (`@shophub/recommendation-service`) powers rule-based recommendations, trending products, and personalized feeds.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/recommendation-service`
- **Port**: `3010`
- **Data Stores**: Elasticsearch (`user_behavior` index) + Redis
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/behavior` | Bearer JWT | Log client user action |
| `GET` | `/api/recommendations/trending` | Public | Real-time trending products |
| `GET` | `/api/recommendations/personalized/:userId` | Bearer JWT | Personalized product recommendations |
| `GET` | `/api/recommendations/similar/:productId` | Public | Similar products |
| `POST` | `/api/recommendations/frequently-bought-together` | Public | Co-purchased product pairs |
| `GET` | `/api/recommendations/recently-viewed/:userId` | Bearer JWT | User recently viewed items |
| `GET` | `/api/recommendations/flash-sale/:userId` | Bearer JWT | Personalized flash-sale offers |

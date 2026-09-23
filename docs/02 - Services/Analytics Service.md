---
title: Analytics Service
tags:
  - microservice
  - analytics
  - telemetry
aliases:
  - Analytics Service
  - "analytics-service"
port: 3014
database: postgresql (analytics) + redis
created: 2026-09-10
type: microservice
---

# 📊 Analytics Service

The **Analytics Service** (`analytics-service`) processes real-time telemetry, calculating GMV, conversion rates, and business dashboards.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/analytics-service`
- **Port**: `3014`
- **Database**: PostgreSQL (`analytics`) + Redis counters
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/metrics` | Admin | Overall business KPIs (GMV, orders, revenue) |
| `GET` | `/dashboard` | Admin | 24-hour revenue, top products, top categories |
| `GET` | `/realtime` | Admin | Active users, conversion rates, orders/min |
| `GET` | `/trend` | Admin | Historical revenue trends |
| `POST` | `/track` | Service | Direct event ingestion |

---

## 📨 Kafka Event Integration

- **Consumes**: `user.behavior`, `order.created`, `order.completed`, `payment.processed`, `product.viewed`, `user.registered`

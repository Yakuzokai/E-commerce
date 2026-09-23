---
title: Fraud Detection Service
tags:
  - microservice
  - security
  - fraud
aliases:
  - Fraud Detection Service
  - "fraud-detection-service"
port: 3013
database: postgresql (fraud_detection) + redis
created: 2026-09-10
type: microservice
---

# 🛡️ Fraud Detection Service

The **Fraud Detection Service** (`fraud-detection-service`) computes multi-layer risk scores on incoming transactions to prevent payment fraud and account takeover.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/fraud-detection-service`
- **Port**: `3013`
- **Database**: PostgreSQL (`fraud_detection`) + Redis
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/check` | Internal | Real-time risk evaluation of transaction payload |
| `GET` | `/profile/:userId` | Admin | Get user risk history and flags |

---

## 📨 Kafka Event Integration

- **Consumes**: `payment.processed`, `order.created`
- **Produces**: `fraud.alert`

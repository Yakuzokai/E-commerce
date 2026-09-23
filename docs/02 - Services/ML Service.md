---
title: ML Service
tags:
  - microservice
  - ml
  - machine-learning
aliases:
  - ML Service
  - "ml-service"
port: 3012
database: postgresql (ml_service) + redis
created: 2026-09-10
type: microservice
---

# 🤖 ML Service

The **ML Service** (`ml-service`) handles offline collaborative filtering, NLP product embeddings, and A/B test experiments.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/ml-service`
- **Port**: `3012`
- **Libraries**: `natural`, `csv-parse`, `node-cron`
- **Database**: PostgreSQL (`ml_service`) + Redis

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/recommendations/collab/train` | Admin | Retrain collaborative filtering model |
| `GET` | `/recommendations/collab/:userId` | Bearer JWT | Get top-K ML recommendations |
| `POST` | `/embeddings/products` | Admin | Generate TF-IDF embeddings |
| `POST` | `/experiments` | Admin | Register A/B test |
| `GET` | `/experiments/:id/results` | Admin | Statistical significance & lift |

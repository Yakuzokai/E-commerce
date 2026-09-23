---
title: Notification Service
tags:
  - microservice
  - notifications
  - email
aliases:
  - Notification Service
  - "@shophub/notification-service"
port: 3007
database: postgresql (ecommerce_db)
created: 2026-09-10
type: microservice
---

# 🔔 Notification Service

The **Notification Service** (`@shophub/notification-service`) dispatches transactional emails (SMTP via Nodemailer) and manages customer notification feeds.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/notification-service`
- **Port**: `3007`
- **Transports**: Nodemailer (SMTP:587), In-app feed
- **Database**: PostgreSQL (`ecommerce_db`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/notifications` | Service | Dispatch direct notification |
| `GET` | `/api/users/:userId/notifications` | Bearer JWT | Fetch in-app notification feed |
| `PATCH` | `/api/notifications/:id/read` | Bearer JWT | Mark notification as read |
| `GET` | `/api/users/:userId/preferences` | Bearer JWT | Notification channel settings |
| `PUT` | `/api/users/:userId/preferences` | Bearer JWT | Update notification preferences |

---

## 📨 Kafka Event Integration

- **Consumes**: `orders.created`, `orders.status_changed`, `orders.cancelled`, `payments.completed`, `payments.failed`, `refunds.completed`, `chat.messages`
- **Produces**: `notifications.read`

---
title: Chat Service
tags:
  - microservice
  - realtime
  - chat
aliases:
  - Chat Service
  - "@shophub/chat-service"
port: 3011
database: postgresql (chat_db) + redis
created: 2026-09-10
type: microservice
---

# 💬 Chat Service

The **Chat Service** (`@shophub/chat-service`) provides buyer-to-seller messaging via **Socket.IO** with a Redis cluster pub/sub adapter.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/chat-service`
- **Port**: `3011` (HTTP REST & WebSocket)
- **Database**: PostgreSQL (`chat_db`)
- **Socket Adapter**: `@socket.io/redis-adapter` (Redis 6379)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:userId/conversations` | Bearer JWT | User's active conversation threads |
| `POST` | `/api/conversations/direct` | Bearer JWT | Open direct thread with seller |
| `GET` | `/api/conversations/:id/messages` | Bearer JWT | Paginated thread messages |
| `POST` | `/api/conversations/:id/messages` | Bearer JWT | REST fallback send message |
| `GET` | `/api/users/:userId/unread-count` | Bearer JWT | Unread message badge count |

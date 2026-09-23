---
title: Auth Service
tags:
  - microservice
  - auth
  - security
aliases:
  - Auth Service
  - "@ecommerce/auth-service"
port: 3001
database: postgresql (ecommerce_db)
created: 2026-09-10
type: microservice
---

# 🔐 Auth Service

The **Auth Service** (`@ecommerce/auth-service`) is the identity and authorization authority for ShopHub.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/auth-service`
- **Port**: `3001`
- **Database**: PostgreSQL (`ecommerce_db`) $ightarrow$ Target: `auth_db` ([[Database Isolation]])
- **Session / Cache**: Redis (`ioredis`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register new user; emits `users.created` |
| `POST` | `/login` | Public | Verify credentials; return access and refresh tokens |
| `POST` | `/refresh` | Public | Exchange refresh token for new access token |
| `POST` | `/logout` | Bearer JWT | Invalidate active session in Redis |
| `POST` | `/logout-all` | Bearer JWT | Revoke all sessions for user |
| `GET` | `/me` | Bearer JWT | Get claims from token |
| `GET` | `/profile` | Bearer JWT | Fetch user profile data |
| `PATCH` | `/profile` | Bearer JWT | Update profile attributes |
| `PATCH` | `/:id/role` | Admin | Update user role (`admin`, `seller`, `customer`) |
| `GET` | `/health` | Public | Health probe |

---

## 📨 Kafka Event Integration

- **Produces**: `users.created`, `users.updated`, `users.deleted`, `auth.user.logged_in`, `auth.token.revoked`
- **Details**: [[Topic Catalog#User & Auth Topics]]

---

## 🚨 Architectural Issues & Traceability
- **ARCH-001**: Direct exposure without gateway $ightarrow$ [[API Gateway]], [[Authentication & Authorization]]
- **ARCH-004**: Shared database coupling $ightarrow$ [[Database Isolation]]

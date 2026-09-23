---
title: User Service
tags:
  - microservice
  - users
aliases:
  - User Service
  - "@shophub/user-service"
port: 3008
database: postgresql (user_db)
created: 2026-09-10
type: microservice
---

# 👤 User Service

The **User Service** (`@shophub/user-service`) manages user shipping addresses, customer profiles, preferences, and store follow graphs.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/user-service`
- **Port**: `3008`
- **Database**: PostgreSQL (`user_db`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:id` | Bearer JWT | Get user profile by ID |
| `PATCH` | `/api/users/:id` | Bearer JWT | Update user attributes |
| `GET` | `/api/users/:userId/addresses` | Bearer JWT | List saved shipping addresses |
| `POST` | `/api/users/:userId/addresses` | Bearer JWT | Create new address |
| `PATCH` | `/api/users/:userId/addresses/:addressId` | Bearer JWT | Update address |
| `DELETE`| `/api/users/:userId/addresses/:addressId` | Bearer JWT | Remove address |
| `POST` | `/api/users/:userId/addresses/:addressId/default` | Bearer JWT | Set as default shipping address |
| `GET` | `/api/users/:userId/preferences` | Bearer JWT | Fetch notification preferences |
| `PUT` | `/api/users/:userId/preferences` | Bearer JWT | Update notification preferences |
| `POST` | `/api/users/:userId/follow/:sellerId` | Bearer JWT | Follow merchant |
| `DELETE`| `/api/users/:userId/follow/:sellerId` | Bearer JWT | Unfollow merchant |

---

## 📨 Kafka Event Integration

- **Consumes**: `auth.user.created`, `auth.user.updated`
- **Produces**: `users.seller_followed`, `users.seller_unfollowed`

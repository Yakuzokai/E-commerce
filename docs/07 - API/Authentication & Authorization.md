---
title: Authentication & Authorization
tags:
  - api
  - security
  - jwt
aliases:
  - Authentication & Authorization
created: 2026-09-10
type: api
---

# 🔐 Authentication & Authorization

ShopHub enforces stateless **JSON Web Token (JWT)** authentication across all protected endpoints.

---

## 🎟️ Token Structure & Lifecycle

- **Access Token**: Short-lived (15 minutes), signed with HMAC-SHA256 using `JWT_SECRET`.
- **Refresh Token**: Long-lived (7 days), stored in PostgreSQL `sessions` table with SHA-256 hash.

### Claims Payload
```json
{
  "userId": "usr_783492819",
  "email": "customer@shophub.internal",
  "role": "customer",
  "iat": 1725955200,
  "exp": 1725956100
}
```

---

## 🛡️ Role-Based Access Control (RBAC)

- **`customer`**: Can manage own cart, place orders, write reviews, and chat with merchants.
- **`seller`**: Can manage assigned store inventory, view seller orders, and reply to reviews.
- **`admin`**: Global access to financial metrics, refund execution, and user role modification.

---

## 🔗 Related Documents
- [[Auth Service]]
- [[API Gateway]]

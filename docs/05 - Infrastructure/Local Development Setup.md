---
title: Local Development Setup
tags:
  - infrastructure
  - local-dev
  - setup
aliases:
  - Local Development Setup
created: 2026-09-10
type: infrastructure
---

# 💻 Local Development Setup

Step-by-step developer onboarding instructions for ShopHub.

---

## 🚀 Quickstart Commands

```bash
# 1. Start Backing Infrastructure
docker compose up -d postgres redis kafka elasticsearch

# 2. Run Database Migrations
cd microservices/auth-service && npm run migrate
cd ../product-service && npm run migrate
cd ../order-service && npm run build && node dist/db/migrate.js
cd ../payment-service && npm run migrate

# 3. Start Core Services with Hot Reload
cd microservices/auth-service && npm run dev
cd microservices/product-service && npm run dev
cd microservices/order-service && npm run dev
```

---

## 🔗 Related Documents
- [[Docker Compose]]
- [[Environment Variables Matrix]]

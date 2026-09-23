---
title: Database Isolation
tags:
  - data
  - database
  - decoupling
aliases:
  - Database Isolation
  - DB Isolation
created: 2026-09-10
type: data
---

# 🛡️ Database Isolation (Resolving ARCH-004)

> [!caution] Current Anti-Pattern: Shared `ecommerce_db`
> Currently, [[Auth Service]], [[Product Service]], [[Order Service]], and [[Notification Service]] all connect to the same `ecommerce_db` database. 

---

## 🎯 Target State: Per-Service Database Isolation

```mermaid
flowchart TD
    subgraph CurrentState["Current State (Coupled)"]
        A1["Auth Service"] & P1["Product Service"] & O1["Order Service"] & N1["Notification Service"] --> SDB[("Shared: ecommerce_db")]
    end

    subgraph TargetState["Target State (Isolated Bounded Contexts)"]
        A2["[[Auth Service]]"] --> DA[("auth_db")]
        P2["[[Product Service]]"] --> DP[("product_db")]
        O2["[[Order Service]]"] --> DO[("order_db")]
        N2["[[Notification Service]]"] --> DN[("notification_db")]
        U2["[[User Service]]"] --> DU[("user_db")]
        PM2["[[Payment Service]]"] --> DPM[("payment_db")]
    end
```

---

## 🔗 Related Documents
- [[PostgreSQL Architecture]]
- [[Data Ownership Matrix]]
- [[Problem Tracker]]

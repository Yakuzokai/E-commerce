---
title: Payment Service
tags:
  - microservice
  - payments
  - stripe
aliases:
  - Payment Service
  - "@shophub/payment-service"
port: 3004
database: postgresql (payment_db)
created: 2026-09-10
type: microservice
---

# 💳 Payment Service

The **Payment Service** (`@shophub/payment-service`) handles payment processing (Stripe, PayPal), webhooks, and refund disbursements.

---

## ⚡ Technical Specifications

- **Directory**: `microservices/payment-service`
- **Current Port**: `3004` *(Code Default - Conflict)*
- **Target Port**: `3015`
- **Database**: PostgreSQL (`payment_db`)
- **Event Bus**: Apache Kafka (`kafkajs`)

---

## 📡 REST API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/webhooks/stripe` | Webhook Signature | Process Stripe async charge events |
| `POST` | `/api/payments` | Bearer JWT | Initialize payment session for order |
| `GET` | `/api/payments/:id` | Bearer JWT | Retrieve payment details |
| `GET` | `/api/payments/order/:orderId` | Bearer JWT | Get payment record for order |
| `GET` | `/api/users/:userId/payments` | Bearer JWT | User transaction history |
| `POST` | `/api/payments/:id/process` | Bearer JWT | Authorize & capture charge |
| `POST` | `/api/payments/:id/refund` | Admin | Initiate refund |
| `POST` | `/api/refunds/:id/process` | Admin | Confirm and execute refund |

---

## 🚨 Architectural Issues & Traceability
- **ARCH-002**: Port 3004 collision with Order Service $ightarrow$ [[Network & Port Matrix]]
- **REL-003**: Payment idempotency and webhook replay $ightarrow$ [[Idempotency]] $ightarrow$ [[Failure Handling]]

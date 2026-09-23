---
title: Target Architecture
tags:
  - architecture
  - target-state
  - blueprint
aliases:
  - Target Architecture
  - Target State
created: 2026-09-10
type: architecture
---

# 🎯 Target Architecture (Centerpiece Blueprint)

> [!important] Target State Definition
> **Target State**: Gateway-controlled, independently deployable microservices with isolated data ownership, reliable event publication via transactional outbox, centralized observability, resilient Kafka consumers, and reproducible containerized development.

This document represents the official architectural goal for the ShopHub platform.

---

## 🏛️ Target Architectural Topology

```mermaid
flowchart TB
    Client["📱 Web / Mobile / Admin Clients"]
    Gateway["🚪 [[API Gateway]]<br/><code>:443 / :80</code>"]

    subgraph Services["14-Service Microservices Mesh"]
        Auth["[[Auth Service]]<br/><code>:3001</code>"]
        User["[[User Service]]<br/><code>:3008</code>"]
        Product["[[Product Service]]<br/><code>:3003</code>"]
        Cart["[[Cart Service]]<br/><code>:3006</code>"]
        Order["[[Order Service]]<br/><code>:3004</code>"]
        Payment["[[Payment Service]]<br/><code>:3015</code>"]
        Search["[[Search Service]]<br/><code>:3005</code>"]
        Chat["[[Chat Service]]<br/><code>:3011</code>"]
        Notification["[[Notification Service]]<br/><code>:3007</code>"]
        Analytics["[[Analytics Service]]<br/><code>:3014</code>"]
        Fraud["[[Fraud Detection Service]]<br/><code>:3013</code>"]
        ML["[[ML Service]]<br/><code>:3012</code>"]
        Recs["[[Recommendation Service]]<br/><code>:3010</code>"]
        Review["[[Review Service]]<br/><code>:3009</code>"]
    end

    subgraph OutboxPattern["Reliable Event Ingress"]
        Outbox["📋 [[Transactional Outbox]]<br/><i>Postgres Outbox Table</i>"]
        Relay["⚙️ Outbox Relay Worker"]
    end

    subgraph Messaging["Resilient Messaging Backbone"]
        Kafka[("📡 [[Kafka Architecture|Apache Kafka]]")]
        DLQ[("🛑 [[Dead Letter Queues|Kafka DLQ Topics]]")]
    end

    subgraph DataIsolation["Isolated Data Tier"]
        DB_Auth[("Postgres: auth_db")]
        DB_User[("Postgres: user_db")]
        DB_Product[("Postgres: product_db")]
        DB_Order[("Postgres: order_db")]
        DB_Payment[("Postgres: payment_db")]
        Redis_Store[("⚡ [[Redis Architecture|Redis]]<br/>Carts & Redlock")]
        ES_Store[("🔍 [[Elasticsearch Architecture|Elasticsearch]]")]
    end

    Client --> Gateway
    Gateway --> Auth & User & Product & Cart & Order & Payment & Search & Chat

    Order --> Outbox
    Outbox --> Relay
    Relay --> Kafka

    Kafka -.->|Poison messages| DLQ
    Kafka -.-> Payment & Product & Fraud & Notification & Analytics & Recs & ML & Search

    Auth --> DB_Auth
    User --> DB_User
    Product --> DB_Product & Redis_Store
    Order --> DB_Order
    Payment --> DB_Payment
    Cart --> Redis_Store
    Search --> ES_Store
```

---

## 🛠️ Key Architectural Pillars in the Target State

### 1. Ingress & Security: [[API Gateway]]
- Single public entry point at port `443` / `80`.
- Validates JWT tokens once at the edge and forwards verified claims (`X-User-Id`, `X-User-Role`) to internal services.
- Centralizes SSL termination, CORS policies, and global rate limiting.
- Details: [[API Gateway Routes]], [[Authentication & Authorization]].

### 2. Guaranteed Delivery: [[Transactional Outbox]]
- Solves dual-write hazards in [[Order Service]] and [[Payment Service]].
- Commits state mutation and outbound message in a single atomic SQL transaction.
- Background relay worker reads `outbox_events` and publishes to Kafka with at-least-once guarantees.
- Details: [[Kafka Architecture]].

### 3. Data Ownership: [[Database Isolation]]
- Completely breaks down the shared `ecommerce_db`.
- Each service connects strictly to its own dedicated database or isolated schema with unique credentials.
- Details: [[Data Ownership Matrix]], [[PostgreSQL Architecture]].

### 4. Consumer Resilience: [[Dead Letter Queues]] & [[Retry Strategy]]
- Consumers implement exponential backoff with jitter.
- Malformed payloads are routed to a `.DLQ` topic rather than crashing service instances or dropping messages.

### 5. Flash Sale Concurrency: [[Distributed Locks]]
- Uses Redis Redlock algorithms in [[Product Service]] to prevent overselling during high-concurrency checkouts.
- Details: [[Inventory Reservation]].

---

## 🔗 Traceability to Problems & Implementation
- Problems Solved: [[Problem Tracker]], [[Critical Issues]]
- Execution Plan: [[Improvement Roadmap/Phase 1 - Critical]], [[Improvement Roadmap/Phase 2 - Infrastructure]]

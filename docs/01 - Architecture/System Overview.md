---
title: System Overview
tags:
  - architecture
  - system-design
  - overview
aliases:
  - System Overview
  - High Level Architecture
created: 2026-09-10
type: architecture
---

# 🏛️ System Overview

ShopHub is a distributed e-commerce platform partitioned into 14 distinct microservices. It is built using **Node.js**, **TypeScript**, and **Express.js**, with persistence handled across **PostgreSQL**, **Redis**, and **Elasticsearch**, coupled through **Apache Kafka**.

---

## 🧩 Architectural Topology

```mermaid
flowchart TD
    Client["Client Applications<br/>(Web / Mobile / Admin)"]

    subgraph CoreDomain["Core Commerce Services"]
        Auth["[[Auth Service]]<br/>:3001"]
        User["[[User Service]]<br/>:3008"]
        Product["[[Product Service]]<br/>:3003"]
        Cart["[[Cart Service]]<br/>:3006"]
        Order["[[Order Service]]<br/>:3004"]
        Payment["[[Payment Service]]<br/>:3004 (Code default)"]
        Review["[[Review Service]]<br/>:3009"]
    end

    subgraph IntelligenceDomain["Intelligence & Search Services"]
        Search["[[Search Service]]<br/>:3005"]
        Recs["[[Recommendation Service]]<br/>:3010"]
        ML["[[ML Service]]<br/>:3012"]
        Fraud["[[Fraud Detection Service]]<br/>:3013"]
    end

    subgraph EngagementDomain["Realtime & Engagement Services"]
        Chat["[[Chat Service]]<br/>:3011"]
        Notification["[[Notification Service]]<br/>:3007"]
        Analytics["[[Analytics Service]]<br/>:3014"]
    end

    subgraph Infrastructure["Backing Infrastructure"]
        Kafka[("Apache Kafka<br/>Message Broker")]
        Postgres[("PostgreSQL<br/>Relational Databases")]
        Redis[("Redis<br/>In-Memory Store")]
        Elastic[("Elasticsearch<br/>Search Engine")]
    end

    Client --> CoreDomain & IntelligenceDomain & EngagementDomain
    CoreDomain <--> Postgres & Redis
    IntelligenceDomain <--> Elastic & Postgres & Redis
    EngagementDomain <--> Postgres & Redis

    Order -.->|orders.created| Kafka
    Payment -.->|payments.completed| Kafka
    Product -.->|products.updated| Kafka
    Kafka -.-> Fraud & Notification & Analytics & Recs & Search & ML & Order
```

---

## 🔍 Core Domains

1. **Core Commerce**: Identity, profile management, catalog browsing, shopping cart, checkout, payments, and ratings.
2. **Intelligence & Search**: Full-text faceted queries, user behavior tracking, ML collaborative filtering, and transaction risk evaluation.
3. **Realtime & Engagement**: WebSocket buyer-seller chat, transactional emails, and platform telemetry.

---

## 🔗 Related Architecture Documents
- [[Current Architecture]] — Current state analysis and anti-patterns.
- [[Target Architecture]] — Target state blueprint and improvements.
- [[Problem Tracker]] — Registry of architectural deficiencies.
- [[Event-Driven Architecture]] — Asynchronous messaging details.

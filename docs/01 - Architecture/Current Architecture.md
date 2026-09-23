---
title: Current Architecture
tags:
  - architecture
  - current-state
  - anti-patterns
aliases:
  - Current Architecture
  - Current State
created: 2026-09-10
type: architecture
---

# 🔎 Current Architecture: Analysis & Known Limitations

> [!warning] Engineering Assessment
> **Current State**: Functional distributed application composed of 14 services, but with several architectural gaps that prevent it from being considered production-ready.

This document describes the actual state of the ShopHub repository as verified directly from the codebase.

---

## ⚠️ Key Identified Anti-Patterns & Deficiencies

### 1. Direct Client-to-Service Coupling (No API Gateway)
- **Status Quo**: Clients directly interact with ports `3001`, `3003`, `3004`, `3005`, `3006`, etc.
- **Risks**: Exposes internal service topology, creates severe CORS configuration friction, and forces clients to manage 14 distinct endpoints.
- **Link**: [[Problem Tracker#ARCH-001]], [[API Gateway]].

### 2. Port Collision (Order vs. Payment Service)
- **Status Quo**: Both `order-service` and `payment-service` default to `PORT=3004` in configuration and code.
- **Risks**: Immediate `EADDRINUSE` collision when booting services locally.
- **Link**: [[Problem Tracker#ARCH-002]], [[Network & Port Matrix]].

### 3. Silent Kafka Publishing Failures
- **Status Quo**: Event publishing errors in `order-service/src/services/kafka.service.ts` are caught and swallowed:
  ```typescript
  } catch (error) {
    logger.error('Failed to publish event', { topic, error });
    // Don't throw - event publishing failure shouldn't block the main operation
  }
  ```
- **Risks**: Dual-write inconsistency. If Kafka is down during order creation, the order is saved in Postgres, but the event is dropped forever.
- **Link**: [[Problem Tracker#ARCH-003]], [[Transactional Outbox]].

### 4. Shared Database Coupling (`ecommerce_db`)
- **Status Quo**: `auth-service`, `product-service`, `order-service`, and `notification-service` all connect to the same physical PostgreSQL database (`ecommerce_db`).
- **Risks**: Violates microservice bounded context isolation; database connection pool starvation; noisy neighbor crashes.
- **Link**: [[Problem Tracker#ARCH-004]], [[Database Isolation]].

### 5. Absence of Root Orchestration
- **Status Quo**: Each microservice has an isolated `Dockerfile`, but no top-level `docker-compose.yml` coordinates the mesh.
- **Risks**: Manual developer onboarding requires opening 14 terminals and manually seeding multiple databases.
- **Link**: [[Problem Tracker#INFRA-001]], [[Docker Compose]].

---

## 🔗 Next Steps
- Review [[Target Architecture]] for the blueprint resolving these challenges.
- Review [[Improvement Roadmap/Phase 1 - Critical]] for remediation steps.

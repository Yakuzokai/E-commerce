---
title: Problem Tracker
tags:
  - architecture
  - issues
  - tracker
aliases:
  - Problem Tracker
  - Issue Tracker
created: 2026-09-10
type: architecture
---

# 📋 Architectural Problem Tracker

This tracker documents all verified technical debts, anti-patterns, and architectural gaps in the ShopHub platform.

---

## 🚨 Master Issue Table

| ID | Issue Title | Severity | Affected Services | Resolution Document | Migration Phase |
|---|---|---|---|---|---|
| **ARCH-001** | No API Gateway / Ingress Layer | 🔴 Critical | All 14 Services | [[API Gateway]], [[API Gateway Routes]] | [[Phase 1 - Critical]] |
| **ARCH-002** | Payment / Order Port 3004 Collision | 🔴 Critical | [[Order Service]], [[Payment Service]] | [[Network & Port Matrix]], [[Network & Service Discovery]] | [[Phase 1 - Critical]] |
| **ARCH-003** | Silent Kafka Publishing Failures | 🔴 Critical | [[Order Service]], [[Payment Service]] | [[Transactional Outbox]], [[Kafka Architecture]] | [[Phase 1 - Critical]] |
| **ARCH-004** | Shared \`ecommerce_db\` Database Instance | 🟠 High | Auth, Product, Order, Notification | [[Database Isolation]], [[PostgreSQL Architecture]] | [[Phase 3 - Reliability]] |
| **INFRA-001** | Missing Master Root Docker Compose | 🟠 High | All 14 Services | [[Docker Compose]], [[Container Architecture]] | [[Phase 2 - Infrastructure]] |
| **REL-001** | No Distributed Tracing / Correlation IDs | 🟡 Medium | All 14 Services | [[Correlation IDs]], [[Distributed Tracing]] | [[Phase 3 - Reliability]] |
| **REL-002** | Inventory Race Conditions (Overselling) | 🟡 Medium | [[Product Service]], [[Cart Service]] | [[Distributed Locks]], [[Inventory Reservation]] | [[Phase 3 - Reliability]] |
| **REL-003** | Missing Kafka Dead Letter Queues (DLQ) | 🟡 Medium | All Kafka Consumers | [[Dead Letter Queues]], [[Retry Strategy]] | [[Phase 3 - Reliability]] |

---

## 🔍 Detailed Issue Breakdown

### ARCH-001: No API Gateway / Ingress Layer
- **Severity**: 🔴 Critical
- **Affected Services**: All 14 Services
- **Problem**: Internal ports are directly exposed to clients.
- **Resolution**: Implement [[API Gateway]] on port 443 with centralized routing rules in [[API Gateway Routes]].

### ARCH-002: Payment / Order Port 3004 Collision
- **Severity**: 🔴 Critical
- **Affected Services**: [[Order Service]], [[Payment Service]]
- **Problem**: Both services default to port 3004 in configuration and source code.
- **Resolution**: Reassign Payment to port 3015 in [[Network & Port Matrix]].

### ARCH-003: Silent Kafka Publishing Failures
- **Severity**: 🔴 Critical
- **Affected Services**: [[Order Service]], [[Payment Service]]
- **Problem**: Exceptions during \`publishEvent\` are caught and discarded, risking dual-write data loss.
- **Resolution**: Implement the [[Transactional Outbox]] pattern.

### ARCH-004: Shared ecommerce_db Instance
- **Severity**: 🟠 High
- **Affected Services**: [[Auth Service]], [[Product Service]], [[Order Service]], [[Notification Service]]
- **Problem**: Four microservices share a single physical PostgreSQL database.
- **Resolution**: Execute database decomposition into dedicated databases via [[Database Isolation]].

### INFRA-001: Missing Master Root Docker Compose
- **Severity**: 🟠 High
- **Affected Services**: All 14 Services
- **Problem**: No single command boots backing infrastructure and microservices together.
- **Resolution**: Deploy unified root [[Docker Compose]] configuration.

### REL-001: No Distributed Tracing / Correlation IDs
- **Severity**: 🟡 Medium
- **Affected Services**: All 14 Services
- **Problem**: Cascading transactions cannot be traced end-to-end across Kafka and HTTP.
- **Resolution**: Implement \`x-correlation-id\` injection in [[Correlation IDs]].

### REL-002: Inventory Race Conditions
- **Severity**: 🟡 Medium
- **Affected Services**: [[Product Service]], [[Cart Service]]
- **Problem**: High-concurrency flash sales can result in overselling inventory.
- **Resolution**: Implement Redis Redlock algorithms via [[Distributed Locks]] and [[Inventory Reservation]].

### REL-003: Missing Kafka Dead Letter Queues
- **Severity**: 🟡 Medium
- **Affected Services**: All Kafka Consumers
- **Problem**: Corrupt or unprocessable messages can block consumer partition processing.
- **Resolution**: Route poison-pill messages to [[Dead Letter Queues]] using [[Retry Strategy]].

---

## 🔗 Issue-to-Service Traceability Links

- [[Order Service]] $\rightarrow$ [[Transactional Outbox]] $\rightarrow$ [[Kafka Architecture]]
- [[Product Service]] $\rightarrow$ [[Distributed Locks]] $\rightarrow$ [[Inventory Reservation]]
- [[API Gateway]] $\rightarrow$ [[Authentication & Authorization]]
- [[Payment Service]] $\rightarrow$ [[Idempotency]] $\rightarrow$ [[Failure Handling]]
- [[Kafka Architecture]] $\rightarrow$ [[Retry Strategy]] $\rightarrow$ [[Dead Letter Queues]]

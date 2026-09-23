---
title: Critical Issues
tags:
  - roadmap
  - issues
  - tech-debt
aliases:
  - Critical Issues
created: 2026-09-10
type: roadmap
---

# 🚨 Critical Architectural Issues (Deep Dive)

This document provides deep technical analysis of the top 4 structural blockers identified during codebase inspection:

### ARCH-001: No API Gateway
- **Impact**: Security vulnerability, port exposure, severe CORS issues.
- **Resolution Plan**: [[Phase 1 - Critical]].

### ARCH-002: Port 3004 Collision (Order vs. Payment)
- **Impact**: Inability to boot all services locally; misconfigured `PAYMENT_SERVICE_URL`.
- **Resolution Plan**: [[Phase 1 - Critical]].

### ARCH-003: Silent Kafka Publishing Failures
- **Impact**: Dropped events on transient network blips; dual-write inconsistency.
- **Resolution Plan**: [[Phase 1 - Critical]], [[Transactional Outbox]].

### ARCH-004: Shared PostgreSQL Database (`ecommerce_db`)
- **Impact**: Database coupling; blast radius risks across Auth, Product, Order, Notification.
- **Resolution Plan**: [[Phase 3 - Reliability]], [[Database Isolation]].

---

## 🔗 Related Documents
- [[Problem Tracker]]
- [[Migration Checklist]]

---
title: Deployment Strategy
tags:
  - operations
  - deployment
  - kubernetes
aliases:
  - Deployment Strategy
created: 2026-09-10
type: operations
---

# 🚀 Deployment Strategy

In the **Target State**, services are deployed as independent pods on **Kubernetes** using **Rolling Updates** with zero-downtime:

- `maxSurge: 25%`
- `maxUnavailable: 0`
- Pre-stop hook with 15-second grace period for in-flight Kafka batches and HTTP requests.

---

## 🔗 Related Documents
- [[Container Architecture]]
- [[Docker Compose]]

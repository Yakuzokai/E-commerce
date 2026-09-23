---
title: Docker Compose
tags:
  - infrastructure
  - docker
  - orchestration
aliases:
  - Docker Compose
  - Root Docker Compose
created: 2026-09-10
type: infrastructure
---

# 🐳 Docker Compose Orchestration (Resolving INFRA-001)

> [!important] Resolving INFRA-001
> There is currently no unified root `docker-compose.yml` coordinating backing services and the 14 microservices. Developers must manually launch backing databases and separate terminal sessions.

---

## 🏗️ Master Root Docker Compose Architecture

The target root `docker-compose.yml` specifies three tiers:

```mermaid
flowchart TD
    subgraph IngressTier["Ingress Tier"]
        GW["API Gateway<br/>:443 / :80"]
    end

    subgraph ServiceTier["Application Tier (14 Services)"]
        S1["Auth (:3001)"]
        S2["Product (:3003)"]
        S3["Order (:3004)"]
        S4["Payment (:3015)"]
        S5["Search (:3005)"]
        S_More["Remaining 9 Services..."]
    end

    subgraph InfraTier["Backing Infrastructure Tier"]
        PG["PostgreSQL (:5433)"]
        RD["Redis (:6379)"]
        KF["Kafka (:9092)"]
        ES["Elasticsearch (:9200)"]
    end

    IngressTier --> ServiceTier
    ServiceTier --> InfraTier
```

---

## 🔗 Related Documents
- [[Container Architecture]]
- [[Local Development Setup]]
- [[Problem Tracker]]

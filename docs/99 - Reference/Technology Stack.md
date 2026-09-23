---
title: Technology Stack
tags:
  - reference
  - tech-stack
aliases:
  - Technology Stack
created: 2026-09-10
type: reference
---

# 🛠️ Technology Stack Inventory

Verified versions and libraries across the ShopHub repository:

- **Runtime**: Node.js `>= 20.0.0`
- **Language**: TypeScript `^5.3.2`
- **Web Framework**: Express.js `^4.18.2`
- **Schema Validation**: Zod `^3.22.4`
- **Logging**: Winston `^3.11.0`
- **Messaging**: Apache Kafka (`kafkajs` `^2.2.4`)
- **Databases**:
  - PostgreSQL `16` (`pg` `^8.11.3`)
  - Redis `7` (`ioredis` `^5.3.2`, `redis` `^4.6.10`)
  - Elasticsearch `8.11` (`@elastic/elasticsearch` `^8.11.0`)
- **Realtime**: Socket.IO `^4.7.2` with `@socket.io/redis-adapter` `^8.1.1`
- **Machine Learning**: `natural` `^6.10.4`, `csv-parse` `^5.5.3`, `node-cron` `^3.0.3`
- **Security**: `jsonwebtoken` `^9.0.2`, `bcryptjs` `^2.4.3`, `helmet` `^7.1.0`

---

## 🔗 Related Documents
- [[Glossary]]
- [[System Overview]]

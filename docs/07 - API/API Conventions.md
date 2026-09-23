---
title: API Conventions
tags:
  - api
  - rest
  - standards
aliases:
  - API Conventions
created: 2026-09-10
type: api
---

# 📐 API Conventions

Standards adhered to across all RESTful APIs:

- **Plural Nouns**: Resource paths use plural nouns (`/api/v1/orders`, `/api/v1/products`).
- **Pagination**: `page` (1-indexed) and `limit` (default 20, max 100).
- **Envelopes**: Standard response wrapper with `data` and `pagination`.
- **Header**: `Authorization: Bearer <token>`.

---

## 🔗 Related Documents
- [[Error Handling]]
- [[API Gateway Routes]]

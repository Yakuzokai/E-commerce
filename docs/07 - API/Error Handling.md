---
title: Error Handling
tags:
  - api
  - errors
aliases:
  - Error Handling
created: 2026-09-10
type: api
---

# ⚠️ Error Handling

All services return structured error envelopes:

```json
{
  "error": "Descriptive message",
  "code": "SPECIFIC_ERROR_CODE",
  "details": []
}
```

Common codes: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `RESOURCE_CONFLICT` (409), `RATE_LIMIT_EXCEEDED` (429), `INTERNAL_ERROR` (500).

---

## 🔗 Related Documents
- [[API Conventions]]
- [[Monitoring & Observability]]

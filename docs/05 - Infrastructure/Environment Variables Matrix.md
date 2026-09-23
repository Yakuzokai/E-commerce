---
title: Environment Variables Matrix
tags:
  - infrastructure
  - env
  - configuration
aliases:
  - Environment Variables Matrix
created: 2026-09-10
type: infrastructure
---

# ⚙️ Environment Variables Matrix

Master reference of configuration parameters:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | *(See [[Network & Port Matrix]])* | HTTP listen port |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | `postgresql://ecommerce:postgres_secret_password@localhost:5433/...` | Database URL |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `JWT_SECRET` | *(Random string)* | HMAC secret for JWT signing in [[Auth Service]] |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe API credentials in [[Payment Service]] |
| `ELASTICSEARCH_URL`| `http://localhost:9200` | Search cluster URL in [[Search Service]] |

---

## 🔗 Related Documents
- [[Local Development Setup]]
- [[Network & Port Matrix]]

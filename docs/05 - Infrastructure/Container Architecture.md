---
title: Container Architecture
tags:
  - infrastructure
  - docker
  - containers
aliases:
  - Container Architecture
created: 2026-09-10
type: infrastructure
---

# 📦 Container Architecture

Every microservice in ShopHub contains a standardized, multi-stage `Dockerfile` optimized for caching and minimal image size:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## 🔗 Related Documents
- [[Docker Compose]]
- [[Local Development Setup]]

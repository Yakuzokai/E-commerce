# Docker Deployment Guide

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM available
- 20GB+ disk space

## Quick Start

### 1. Clone and Setup

```bash
cd infrastructure/docker
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start Infrastructure

```bash
# Start all services
docker-compose -f docker-compose.yml up -d

# Or start only infrastructure (Postgres, Redis, Kafka, etc.)
docker-compose -f docker-compose.yml up -d postgres redis kafka zookeeper elasticsearch
```

### 3. Verify Services

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service_name]

# Check specific service
docker-compose exec postgres pg_isready
docker-compose exec redis redis-cli ping
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

## Production Deployment

### 1. Configure Environment

```bash
cp .env.example .env
vim .env  # Update with production values
```

### 2. Build and Deploy

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

### 3. Initialize Database

```bash
# Run migrations for each service
docker-compose -f docker-compose.prod.yml exec auth-service npm run migrate
docker-compose -f docker-compose.prod.yml exec product-service npm run migrate
docker-compose -f docker-compose.prod.yml exec order-service npm run migrate
```

## Service Endpoints

| Service | Port | URL |
|---------|------|-----|
| Frontend | 80 | http://localhost |
| API Gateway | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001 |
| Product Service | 3002 | http://localhost:3002 |
| Order Service | 3003 | http://localhost:3003 |
| Kafka UI | 8090 | http://localhost:8090 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3001 | http://localhost:3001 |
| Loki | 3100 | http://localhost:3100 |

## Health Checks

```bash
# Check all services health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
```

## Troubleshooting

### Kafka Issues

```bash
# Reset Kafka offsets
docker-compose exec kafka kafka-consumer-groups --bootstrap-server localhost:9092 --group consumer-group --reset-offsets --to-earliest --all-topics --execute

# Recreate Kafka topics
docker-compose down
docker volume rm infrastructure-docker_kafka_data
docker-compose up -d kafka
```

### Database Issues

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U shophub -d auth_db

# Reset database
docker-compose exec postgres psql -U shophub -c "DROP DATABASE IF EXISTS auth_db;"
docker-compose restart postgres
```

### Redis Issues

```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL

# Check Redis memory
docker-compose exec redis redis-cli INFO memory
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 auth-service
```

### Prometheus Queries

Access Prometheus at http://localhost:9090

Example queries:
- `rate(http_requests_total[5m])` - Request rate
- `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` - P95 latency
- `rate(http_requests_total{service="auth-service",status="500"}[5m])` - Error rate

## Maintenance

### Backup Database

```bash
# Backup
docker-compose exec postgres pg_dump -U shophub auth_db > auth_db_backup.sql

# Restore
docker-compose exec -T postgres psql -U shophub auth_db < auth_db_backup.sql
```

### Update Services

```bash
# Pull latest images
docker-compose pull

# Rebuild and restart
docker-compose up -d --build
```

### Clean Up

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (DESTRUCTIVE)
docker-compose down -v

# Remove unused images
docker image prune -a
```

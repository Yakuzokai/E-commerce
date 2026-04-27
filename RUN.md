# 🚀 Running ShopHub

This guide provides instructions on how to get the ShopHub platform up and running in different environments.

## 🛠️ Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Docker & Docker Desktop**: Latest version
- **RAM**: Minimum 8GB (recommended 16GB for running all services)

---

## 🐳 Option 1: Full Docker Setup (Recommended)

This is the fastest way to run the entire stack (Infrastructure + Microservices) with a single command.

### 1. Start Infrastructure & Services
Run everything using the combined docker-compose files:
```bash
cd infrastructure/docker
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d
```

This will start:
- **Infrastructure**: PostgreSQL, Redis, Kafka, Elasticsearch, Prometheus, Grafana.
- **Microservices**: Auth, Product, Order, Payment, Search, Cart, Notification, etc.
- **Gateways**: API Gateway (Nginx).

### 2. Access the Platform
- **Frontend**: [http://localhost:80](http://localhost:80)
- **API Gateway**: [http://localhost:3000](http://localhost:3000)
- **Kafka UI**: [http://localhost:8080](http://localhost:8080)
- **Kibana**: [http://localhost:5601](http://localhost:5601)
- **Grafana**: [http://localhost:3002](http://localhost:3002) (Login: admin/admin)

---

## 💻 Option 2: Hybrid Development (Docker + Local)

Recommended for active development. Run heavy infrastructure in Docker and microservices locally for faster debugging.

### 1. Start Infrastructure Only
```bash
cd infrastructure/docker
docker-compose up -d
```
*This starts Postgres (5433), Redis (6379), Kafka (9092), and Elasticsearch (9200).*

### 2. Install & Start Microservices
Open a new terminal for each service you're working on:
```bash
# Example for Auth Service
cd microservices/auth-service
npm install
npm run dev
```

### 3. Start Frontend
```bash
cd frontend/ecommerce-frontend
npm install
npm run dev
```
*Frontend will be available at [http://localhost:5173](http://localhost:5173)*

---

## ⚡ Quick Run (Windows)

If you are on Windows, you can use the provided batch script to automate the hybrid setup:

```bash
./run_all.bat
```
*This script starts Docker infrastructure, then opens new command prompts for each microservice and the frontend.*

---

## 📋 Service Registry (Local Development)

| Service | Port | Description |
|---------|------|-------------|
| **Auth** | 3001 | Authentication & JWT |
| **Product** | 3002 | Catalog & Inventory |
| **Order** | 3003 | Order Processing |
| **Payment** | 3004 | Stripe Integration |
| **Search** | 3005 | Elasticsearch Queries |
| **Cart** | 3006 | Redis-based Shopping Cart |
| **Notification** | 3007 | Email/SMS Notifications |
| **User** | 3008 | User Profile Management |

---

## 🔍 Troubleshooting

1. **Kafka Connection Issues**: Ensure Zookeeper is fully started before Kafka. If services fail to connect, restart the Kafka container: `docker-compose restart kafka`.
2. **Database Migrations**: Microservices may require migrations on the first run:
   ```bash
   cd microservices/<service-name>
   npm run migrate
   ```
3. **Memory Limits**: Running all services in Docker is resource-intensive. Ensure Docker Desktop has at least 8GB of RAM allocated.

---

## 🛑 Stopping Everything

```bash
cd infrastructure/docker
docker-compose -f docker-compose.yml -f docker-compose.services.yml down
```
To also remove volumes (reset all data):
```bash
docker-compose -f docker-compose.yml -f docker-compose.services.yml down -v
```

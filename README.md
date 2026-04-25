# 🛒 ShopHub - Enterprise E-Commerce Platform

A production-ready, microservices-based e-commerce platform inspired by **Shopee** and **Amazon**, designed to handle millions of users with intelligent recommendations, real-time features, and cloud-native deployment.

## 🚀 Quick Start

### Prerequisites
- Node.js 20 LTS
- Docker & Docker Compose
- 4GB+ RAM available

### Local Development Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd ecommerce-platform

# 2. Start infrastructure services
cd infrastructure/docker
docker-compose up -d postgres redis kafka zookeeper elasticsearch

# 3. Start a microservice
cd microservices/auth-service
npm install
npm run dev

# 4. Start frontend
cd frontend/ecommerce-frontend
npm install
npm run dev
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│  │   Web App       │  │   Mobile App    │  │   Admin Dashboard           │ │
│  │   (React)       │  │   (React Native)│  │   (React)                  │ │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY (Nginx)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Rate Limiting │ Load Balancing │ SSL Termination │ Caching         │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Auth Service │         │Product Service│         │  Order Svc    │
│   Port: 3001  │         │   Port: 3002  │         │   Port: 3003  │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│Payment Service│         │ Search Svc    │         │  Cart Svc      │
│   Port: 3004  │         │   Port: 3005  │         │   Port: 3006  │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────────────────────────────────────┐
│Notification Svc│        │              Message Broker (Kafka)          │
│   Port: 3007  │         │  Topics: orders.*, payments.*, products.*     │
└───────────────┘         └───────────────────────────────────────────────┘
```

## 📦 Microservices

| Service | Port | Description | Database |
|---------|------|------------|----------|
| **Auth Service** | 3001 | JWT authentication, OAuth, RBAC, session management | PostgreSQL |
| **Product Service** | 3002 | Product catalog, inventory, categories, flash sales | PostgreSQL |
| **Order Service** | 3003 | Order management, status tracking, returns | PostgreSQL |
| **Payment Service** | 3004 | Payment processing, refunds, transactions | PostgreSQL |
| **Search Service** | 3005 | Full-text search, autocomplete, recommendations | Elasticsearch |
| **Cart Service** | 3006 | Shopping cart, vouchers, cart merging | Redis |
| **Notification Service** | 3007 | Email, push, SMS notifications | PostgreSQL |

## 📁 Project Structure

```
ecommerce-platform/
├── .github/
│   └── workflows/           # CI/CD pipelines
│       ├── ci.yml           # Continuous Integration
│       └── cd.yml           # Continuous Deployment
├── docs/                    # Architecture documentation
│   ├── PHASE1_ARCHITECTURE.md
│   └── PROJECT_ROADMAP.md
├── frontend/
│   └── ecommerce-frontend/  # React application (deployed)
├── infrastructure/
│   ├── docker/              # Docker Compose files
│   ├── api-gateway/         # Nginx configuration
│   ├── prometheus/          # Monitoring config
│   └── grafana/             # Dashboards
└── microservices/
    ├── auth-service/        # Authentication
    ├── product-service/     # Product catalog
    ├── order-service/       # Order management
    ├── payment-service/     # Payment processing
    ├── search-service/      # Search engine
    ├── cart-service/        # Shopping cart
    └── notification-service/# Notifications
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Databases**: PostgreSQL 15, Redis 7, Elasticsearch 8
- **Message Broker**: Apache Kafka
- **Authentication**: JWT + Refresh Tokens

### Frontend
- **Framework**: React 18 with Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **API Client**: React Query

### Infrastructure
- **Containerization**: Docker, Docker Compose
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus, Grafana
- **Logging**: Loki, Promtail
- **CI/CD**: GitHub Actions

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products |
| GET | /api/products/:id | Get product details |
| POST | /api/products | Create product (admin) |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete product |
| GET | /api/categories | List categories |
| GET | /api/flash-sales | Get active flash sales |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/search | Full-text search |
| GET | /api/search/suggest | Autocomplete suggestions |
| GET | /api/search/similar/:id | Similar products |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/cart | Get cart |
| POST | /api/cart/items | Add item to cart |
| PATCH | /api/cart/items/:id | Update item quantity |
| DELETE | /api/cart/items/:id | Remove item |
| POST | /api/cart/vouchers | Apply voucher |
| DELETE | /api/cart | Clear cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Create order |
| GET | /api/orders/:id | Get order details |
| GET | /api/users/:id/orders | Get user orders |
| PATCH | /api/orders/:id/cancel | Cancel order |
| POST | /api/orders/:id/return | Request return |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments | Create payment |
| GET | /api/payments/:id | Get payment status |
| POST | /api/payments/:id/refund | Process refund |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/notifications | Get notifications |
| PATCH | /api/notifications/:id/read | Mark as read |
| POST | /api/notifications/read-all | Mark all as read |
| PUT | /api/users/:id/preferences | Update preferences |

## ⚡ Event-Driven Architecture

### Kafka Topics

| Topic | Publisher | Subscribers |
|-------|-----------|-------------|
| `orders.created` | Order Service | Payment, Notification, Inventory |
| `orders.status_changed` | Order Service | Notification, Cart |
| `payments.completed` | Payment Service | Order, Notification |
| `products.created` | Product Service | Search, Notification |
| `cart.updated` | Cart Service | Recommendation |

## 📊 Monitoring & Observability

### Prometheus Metrics
- HTTP request rate & latency
- Error rates
- Database connection pool
- Kafka consumer lag

### Grafana Dashboards
- Service overview
- Request latency (P50, P95, P99)
- Error rates
- Resource utilization

Access Grafana at: `http://localhost:3001`

## 🔐 Security Features

- JWT + Refresh Token authentication
- RBAC (Role-Based Access Control)
- Rate limiting per endpoint
- CORS configuration
- Helmet.js security headers
- Password hashing (bcrypt)
- SQL injection prevention
- XSS protection

## 🚢 Deployment

### Docker Deployment

```bash
# Start infrastructure
cd infrastructure/docker
docker-compose up -d postgres redis kafka elasticsearch

# Start all services
docker-compose -f docker-compose.services.yml up -d

# Run migrations
docker-compose exec order-service npm run migrate
```

### Production Deployment

```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Deploy with health checks
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific service tests
cd microservices/auth-service
npm test
```

## 📚 Documentation

- [Architecture Overview](docs/PHASE1_ARCHITECTURE.md)
- [Project Roadmap](docs/PROJECT_ROADMAP.md)
- [Infrastructure Setup](infrastructure/docker/README.md)

## 🤝 Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## 📄 License

MIT License - See LICENSE file for details

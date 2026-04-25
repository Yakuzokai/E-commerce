# E-Commerce Platform - Phase 1: System Architecture

## 1. SYSTEM OVERVIEW

A production-ready, microservices-based e-commerce platform inspired by **Shopee** (UX, seller ecosystem) and **Amazon** (distributed systems, performance, recommendation engine).

### 1.1 Architecture Style
- **Microservices Architecture** with Domain-Driven Design
- **Event-Driven System** using Kafka for async communication
- **API Gateway** as single entry point
- **Service-to-Service Communication** via REST/gRPC and Events

### 1.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Web App   │  │ Mobile App  │  │   Seller    │  │    Admin Dashboard      │  │
│  │  (Next.js)  │  │  (React     │  │   Portal    │  │                         │  │
│  │             │  │   Native)   │  │             │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
└─────────┼────────────────┼────────────────┼──────────────────────┼────────────────┘
          │                │                │                      │
          ▼                ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            EDGE LAYER (CDN + WAF)                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │  CloudFront / CloudFlare  │  WAF  │  DDoS Protection  │  SSL Termination   │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY (Kong/AWS API Gateway)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Rate Limiter │ │ Auth Filter  │ │ Load Balancer│ │ Circuit      │             │
│  │              │ │              │ │              │ │ Breaker      │             │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘             │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                │                │                      │
          ▼                ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            CORE SERVICES LAYER                                    │
│                                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Auth Service│  │User Service │  │Product Svc  │  │Search Svc   │              │
│  │             │  │             │  │             │  │(Elasticsearch│             │
│  │ - JWT/Auth  │  │ - Profiles  │  │ - Catalog   │  │ - Autocomplete│            │
│  │ - OAuth     │  │ - Addresses  │  │ - Inventory │  │ - Typo tolerance│          │
│  │ - Sessions  │  │ - Preferences│ │ - Pricing   │  │ - Ranking   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │               │                │                │                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Cart Service│  │Order Service│  │Payment Svc  │  │Review Svc   │              │
│  │             │  │             │  │             │  │             │              │
│  │ - Cart Mgmt │  │ - Lifecycle │  │ - PGW      │  │ - Ratings   │              │
│  │ - Wishlist  │  │ - Tracking  │  │ - Wallets  │  │ - Moderation│              │
│  │ - Sharing   │  │ - Returns   │  │ - Refunds  │  │ - Sentiment │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘              │
│         │               │                │                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │Notif Service│  │ Chat Service│  │Recom Service│  │Seller Svc   │              │
│  │             │  │             │  │             │  │             │              │
│  │ - Email     │  │ - WebSocket │  │ - ML Engine │  │ - Onboarding│              │
│  │ - Push      │  │ - Messages  │  │ - Collab    │  │ - Analytics │              │
│  │ - SMS       │  │ - History   │  │   Filter    │  │ - Payouts   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
          │                │                │                      │
          ▼                ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          DATA & MESSAGING LAYER                                   │
│                                                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────┐   │
│  │                           MESSAGE BROKER (Kafka)                          │   │
│  │  Topics: orders.created │ payments.completed │ products.updated │ user.* │   │
│  └───────────────────────────────────────────────────────────────────────────┘   │
│                                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │ PostgreSQL│  │ PostgreSQL│  │ PostgreSQL│  │ PostgreSQL│                  │
│  │  (Auth)   │  │  (Users)   │  │ (Products) │  │ (Orders)   │                  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐                  │
│  │    Redis   │  │Elasticsearch│ │    S3      │  │   Grafana  │                  │
│  │  (Cache)   │  │  (Search)   │  │  (Media)   │  │  (Metrics) │                  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘                  │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CORE SERVICES BREAKDOWN

### 2.1 Service Catalog

| Service | Description | DB | Cache | Events Published | Events Subscribed |
|---------|-------------|-----|-------|------------------|-------------------|
| **Auth Service** | Authentication, Authorization, Sessions | PostgreSQL | Redis (sessions) | user.logged_in, user.logged_out, token.revoked | - |
| **User Service** | User profiles, addresses, preferences | PostgreSQL | Redis (profiles) | user.created, user.updated, user.deleted | auth.user_created |
| **Product Service** | Product catalog, inventory, pricing | PostgreSQL | Redis (hot products) | product.created, product.updated, product.stock_changed | order.inventory_reserved |
| **Search Service** | Full-text search, autocomplete | Elasticsearch | Redis (suggestions) | - | product.*, user.behavior |
| **Cart Service** | Shopping cart, wishlist | PostgreSQL | Redis (carts) | cart.updated, wishlist.added | product.* |
| **Order Service** | Order lifecycle, tracking | PostgreSQL | Redis (order cache) | order.created, order.paid, order.shipped, order.completed, order.cancelled | payment.*, cart.* |
| **Payment Service** | Payment processing, wallets | PostgreSQL | Redis (transactions) | payment.initiated, payment.completed, payment.failed | order.created |
| **Review Service** | Reviews, ratings, Q&A | PostgreSQL | Redis (cached reviews) | review.created, review.moderated | order.completed |
| **Recommendation Service** | ML recommendations, trending | - | Redis (recs cache) | - | user.*, order.*, product.* |
| **Notification Service** | Email, SMS, push notifications | PostgreSQL | Redis (queue) | - | order.*, payment.*, review.* |
| **Chat Service** | Buyer-seller messaging | PostgreSQL | Redis (sessions) | message.sent | - |
| **Seller Service** | Seller onboarding, analytics, payouts | PostgreSQL | Redis (stats) | seller.*, payout.* | order.* |

### 2.2 Service Responsibilities

#### Auth Service
```
Responsibilities:
├── Authentication (email/password, OAuth2)
├── JWT token management
├── Session management
├── Password reset & verification
├── Rate limiting per user/IP
├── RBAC (Role-Based Access Control)
└── API key management for services
```

#### Product Service
```
Responsibilities:
├── Product CRUD operations
├── Category & attribute management
├── Inventory tracking
├── Price management (supports flash sales)
├── Product media (images, videos)
├── Product variants (size, color)
└── Seller product approval workflow
```

#### Order Service
```
Responsibilities:
├── Order creation & validation
├── Order status management
├── Order fulfillment workflow
├── Shipping integration
├── Order cancellation & returns
├── Order history & tracking
└── Split order handling
```

#### Recommendation Service
```
Responsibilities:
├── Collaborative filtering
├── Content-based recommendations
├── Recently viewed products
├── Trending products calculation
├── Personalized home feed
├── Flash sale recommendations
└── Cart abandonment recovery
```

---

## 3. API GATEWAY DESIGN

### 3.1 Gateway Configuration

```yaml
api_gateway:
  name: "ecommerce-api-gateway"
  version: "v1"

  routes:
    - path: /api/v1/auth/*
      service: auth-service
      methods: [POST, DELETE]

    - path: /api/v1/users/*
      service: user-service
      methods: [GET, PUT, PATCH, DELETE]

    - path: /api/v1/products/*
      service: product-service
      methods: [GET, POST]

    - path: /api/v1/search/*
      service: search-service
      methods: [GET]

    - path: /api/v1/cart/*
      service: cart-service
      methods: [GET, POST, PUT, DELETE]

    - path: /api/v1/orders/*
      service: order-service
      methods: [GET, POST, PUT]

    - path: /api/v1/payments/*
      service: payment-service
      methods: [POST]

    - path: /api/v1/reviews/*
      service: review-service
      methods: [GET, POST]

    - path: /api/v1/recommendations/*
      service: recommendation-service
      methods: [GET]

    - path: /api/v1/notifications/*
      service: notification-service
      methods: [GET]

    - path: /api/v1/chat/*
      service: chat-service
      methods: [GET, POST]
      websocket: true

    - path: /api/v1/sellers/*
      service: seller-service
      methods: [GET, POST, PUT]

  plugins:
    - cors
    - rate_limiting
    - auth
    - logging
    - circuit_breaker
    - request_transformer
    - response_transformer
```

### 3.2 Rate Limiting Strategy

```
Rate Limits:
├── Anonymous: 100 req/min
├── Authenticated User: 1000 req/min
├── Premium User: 5000 req/min
├── Seller API: 10000 req/min
└── Internal Service: Unlimited
```

---

## 4. DATABASE SCHEMA PER SERVICE

### 4.1 Auth Service Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'customer',
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address INET,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- OAuth accounts
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- API keys for service-to-service
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    service_name VARCHAR(100) NOT NULL,
    permissions JSONB,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_oauth_user_provider ON oauth_accounts(user_id, provider);
```

### 4.2 Product Service Schema (PostgreSQL)

```sql
-- Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id),
    level INT DEFAULT 0,
    path TEXT, -- Materialized path for hierarchy
    image_url TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Brands
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    category_id UUID REFERENCES categories(id),
    brand_id UUID REFERENCES brands(id),
    name VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    description TEXT,
    condition VARCHAR(50), -- new, refurbished, used
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending, active, inactive, deleted
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INT DEFAULT 0,
    review_count INT DEFAULT 0,
    sold_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    wishlist_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    UNIQUE(seller_id, slug)
);

-- Product variants (size, color combinations)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255),
    price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    stock_quantity INT DEFAULT 0,
    reserved_quantity INT DEFAULT 0,
    low_stock_threshold INT DEFAULT 10,
    weight_kg DECIMAL(8,3),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product images
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Product attributes (dynamic attributes per category)
CREATE TABLE product_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT NOT NULL,
    UNIQUE(product_id, attribute_name)
);

-- Flash sales
CREATE TABLE flash_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Flash sale items
CREATE TABLE flash_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flash_sale_id UUID REFERENCES flash_sales(id),
    product_id UUID REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    flash_price DECIMAL(12,2) NOT NULL,
    original_price DECIMAL(12,2),
    stock_quantity INT NOT NULL,
    sold_quantity INT DEFAULT 0,
    purchase_limit INT DEFAULT 1,
    UNIQUE(flash_sale_id, variant_id)
);

-- Indexes
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_flash_sale_items_variant ON flash_sale_items(variant_id);
CREATE INDEX idx_flash_sale_time ON flash_sales(start_time, end_time);
```

### 4.3 Order Service Schema (PostgreSQL)

```sql
-- Orders
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    shipping_fee DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_status VARCHAR(50) DEFAULT 'pending',
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    notes TEXT,
    estimated_delivery DATE,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

-- Order items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    seller_id UUID NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    variant_name VARCHAR(255),
    sku VARCHAR(100),
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    subtotal DECIMAL(12,2) NOT NULL,
    item_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order status history
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    description TEXT,
    changed_by UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order shipments (for multi-seller orders)
CREATE TABLE order_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    shipping_method VARCHAR(100),
    shipped_at TIMESTAMP,
    estimated_delivery DATE,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Returns and refunds
CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    order_item_id UUID REFERENCES order_items(id),
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'requested',
    resolution VARCHAR(50), -- refund, replacement
    refund_amount DECIMAL(12,2),
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_seller ON orders(seller_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 4.4 Cart Service Schema (PostgreSQL)

```sql
-- Carts (one per user)
CREATE TABLE carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    total_items INT DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cart items
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL,
    variant_id UUID,
    quantity INT NOT NULL DEFAULT 1,
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id, variant_id)
);

-- Wishlists
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    variant_id UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_id)
);

-- Shared carts
CREATE TABLE shared_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES carts(id) ON DELETE CASCADE,
    share_token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_wishlists_user ON wishlists(user_id);
CREATE INDEX idx_wishlists_product ON wishlists(product_id);
CREATE INDEX idx_shared_carts_token ON shared_carts(share_token);
```

---

## 5. EVENT FLOW DESIGN (KAFKA)

### 5.1 Kafka Topics Architecture

```
Topics (Partitioned by entity ID for ordering):
─────────────────────────────────────────────────
📦 orders.created              → payment-service, notification-service, inventory-service
💳 payments.initiated          → order-service
💳 payments.completed           → order-service, notification-service, recommendation-service
💳 payments.failed              → order-service, notification-service
📦 orders.status_changed        → notification-service, chat-service, analytics
🚚 orders.shipped               → notification-service, tracking-service
📦 products.created             → search-service, recommendation-service
📦 products.updated             → search-service, cache-service
📦 products.stock_changed       → search-service, cart-service, flash-sale-service
👤 users.behavior              → analytics-service, recommendation-service
👤 users.created               → notification-service, loyalty-service
⭐ reviews.created             → product-service, recommendation-service, analytics
💬 messages.sent               → notification-service
🎫 vouchers.claimed            → order-service
🏷️ flash_sales.started         → notification-service, search-service
🏷️ flash_sales.ended          → analytics-service
```

### 5.2 Event Schemas

```typescript
// Order Created Event
interface OrderCreatedEvent {
  eventId: string;
  eventType: 'ORDER_CREATED';
  timestamp: string;
  version: string;
  data: {
    orderId: string;
    orderNumber: string;
    userId: string;
    sellerId: string;
    items: Array<{
      productId: string;
      variantId: string;
      quantity: number;
      unitPrice: number;
    }>;
    totalAmount: number;
    shippingAddress: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
  };
}

// Payment Completed Event
interface PaymentCompletedEvent {
  eventId: string;
  eventType: 'PAYMENT_COMPLETED';
  timestamp: string;
  version: string;
  data: {
    paymentId: string;
    orderId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  };
}

// Product Viewed Event (for recommendations)
interface ProductViewedEvent {
  eventId: string;
  eventType: 'PRODUCT_VIEWED';
  timestamp: string;
  version: string;
  data: {
    userId: string;
    productId: string;
    variantId?: string;
    sessionId: string;
    source: 'search' | 'recommendation' | 'direct' | 'social';
    duration: number; // seconds
  };
}
```

### 5.3 Event Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           EVENT FLOW EXAMPLE: Order Lifecycle                   │
└────────────────────────────────────────────────────────────────────────────────┘

    User                  Cart Svc          Order Svc         Payment Svc        Inventory Svc
      │                      │                   │                  │                 │
      │  addToCart            │                   │                  │                 │
      │──────────────────────>│                   │                  │                 │
      │                      │                   │                  │                 │
      │  checkout             │                   │                  │                 │
      │──────────────────────>│                   │                  │                 │
      │                      │                   │                  │                 │
      │                      │  createOrder       │                  │                 │
      │                      │──────────────────>│                  │                 │
      │                      │                   │                  │                 │
      │                      │                   │  reserveStock    │                 │
      │                      │                   │───────────────────────────────────>│
      │                      │                   │                  │                 │
      │                      │                   │  publish: ORDER_CREATED          │
      │                      │                   │─────────┬────────────────────────┘
      │                      │                   │         │
      │                      │                   │         ▼
      │                      │                   │  ┌────────────────────────────────┐
      │                      │                   │  │ KAFKA: orders.created         │
      │                      │                   │  │ Subscribers:                  │
      │                      │                   │  │  - payment-service (pay)      │
      │                      │                   │  │  - notification-service      │
      │                      │                   │  │  - inventory-service          │
      │                      │                   │  └────────────────────────────────┘
      │                      │                   │         │
      │                      │                   │         ▼
      │                      │                   │  initiatePayment              │
      │                      │                   │──────────────────────────────>│
      │                      │                   │         │
      │                      │                   │         │  publish: PAYMENT_INITIATED
      │                      │                   │         │
      │                      │                   │<────────┘
      │                      │                   │
      │                      │                   │  processPayment (async)
      │                      │                   │──────────────────────────────>│
      │                      │                   │         │
      │                      │                   │         │  publish: PAYMENT_COMPLETED
      │                      │                   │         │
      │                      │                   │<────────┘
      │                      │                   │
      │                      │                   │  updateOrderStatus (paid)
      │                      │                   │
      │                      │                   │  publish: ORDER_STATUS_CHANGED
      │                      │                   │
      │                      │                   │
      │  orderConfirmation    │                   │
      │<──────────────────────│                   │
      │                      │                   │
```

---

## 6. CACHING STRATEGY (REDIS)

### 6.1 Cache Layers

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CACHE TIERING                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

Layer 1: CDN (CloudFront)
├── Static assets (images, CSS, JS)
├── Product images
└── User-uploaded content

Layer 2: Redis (Application Cache)
├── L1: Hot data (products, categories)
├── L2: Session data
├── L3: API response cache
└── L4: Rate limiting counters

Layer 3: Elasticsearch (Search Cache)
├── Search results
├── Autocomplete suggestions
└── Popular queries
```

### 6.2 Cache Keys Pattern

```
Pattern: {service}:{entity}:{id}:{variant}

Examples:
├── auth:session:{user_id}           → Session data (TTL: 7 days)
├── auth:refresh:{token_hash}        → Refresh token (TTL: 30 days)
├── user:profile:{user_id}           → User profile (TTL: 1 hour)
├── product:detail:{product_id}      → Product details (TTL: 15 min)
├── product:list:{category}:{page}   → Product listings (TTL: 5 min)
├── product:flash:{variant_id}       → Flash sale price (TTL: 1 min)
├── cart:{user_id}                   → Shopping cart (TTL: 7 days)
├── search:autocomplete:{query}      → Autocomplete results (TTL: 1 hour)
├── rec:homefeed:{user_id}           → Home feed recommendations (TTL: 30 min)
├── rec:trending:{category}          → Trending products (TTL: 15 min)
├── rate:{ip}                        → Rate limit counter (TTL: 1 min)
└── lock:order:{user_id}            → Distributed lock (TTL: 30 sec)
```

### 6.3 Cache Invalidation Strategy

```
Event-Driven Invalidation:
├── Product Updated → Invalidate product:detail:* → Update cache
├── Price Changed → Invalidate product:detail:* → Update cache
├── Stock Changed → Invalidate product:detail:* → Update cache (if critical)
├── Category Changed → Invalidate product:list:* → Update cache
```

---

## 7. SEARCH ARCHITECTURE (ELASTICSEARCH)

### 7.1 Index Mappings

```json
{
  "products_index": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1,
      "analysis": {
        "analyzer": {
          "product_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "asciifolding", "product_synonym"]
          }
        }
      }
    },
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "name": {
          "type": "text",
          "analyzer": "product_analyzer",
          "fields": {
            "keyword": { "type": "keyword" },
            "suggest": { "type": "completion" }
          }
        },
        "description": { "type": "text", "analyzer": "product_analyzer" },
        "category_path": { "type": "keyword" },
        "brand": { "type": "keyword" },
        "seller_id": { "type": "keyword" },
        "price": {
          "type": "nested",
          "properties": {
            "variant_id": { "type": "keyword" },
            "current": { "type": "float" },
            "original": { "type": "float" },
            "discount": { "type": "float" }
          }
        },
        "rating": { "type": "float" },
        "rating_count": { "type": "integer" },
        "sold_count": { "type": "integer" },
        "is_flash_sale": { "type": "boolean" },
        "flash_price": { "type": "float" },
        "attributes": {
          "type": "nested",
          "properties": {
            "name": { "type": "keyword" },
            "value": { "type": "keyword" }
          }
        },
        "tags": { "type": "keyword" },
        "created_at": { "type": "date" },
        "updated_at": { "type": "date" },
        "status": { "type": "keyword" }
      }
    }
  }
}
```

### 7.2 Search Features

```
✅ Full-text search with typo tolerance
✅ Autocomplete (typeahead)
✅ Faceted filtering (category, brand, price range)
✅ Sorting (relevance, price, rating, popularity)
✅ Pagination with deep pagination protection
✅ Highlighting
✅ Synonym handling
✅ Stopwords removal
✅ Fuzzy matching
✅ Boosting (by popularity, rating, recency)
```

---

## 8. SECURITY ARCHITECTURE

### 8.1 Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           AUTHENTICATION FLOW                                    │
└────────────────────────────────────────────────────────────────────────────────┘

    Client                      API Gateway                Auth Service
      │                              │                           │
      │  POST /auth/login            │                           │
      │  {email, password}          │                           │
      │─────────────────────────────>│                           │
      │                              │                           │
      │                              │  validate credentials     │
      │                              │──────────────────────────>│
      │                              │                           │
      │                              │  create tokens            │
      │                              │<──────────────────────────│
      │                              │                           │
      │  {access_token,              │                           │
      │   refresh_token,             │                           │
      │   expires_in}                │                           │
      │<─────────────────────────────│                           │
      │                              │                           │
      │                              │                           │
      │  GET /api/v1/products        │                           │
      │  Authorization: Bearer ...   │                           │
      │─────────────────────────────>│                           │
      │                              │                           │
      │                              │  verify token             │
      │                              │──────────────────────────>│
      │                              │                           │
      │                              │  user_id, role            │
      │                              │<──────────────────────────│
      │                              │                           │
      │                              │  forward with user ctx    │
      │                              │──────────> product-service│
      │                              │                           │
      │  {products...}               │                           │
      │<─────────────────────────────│                           │
```

### 8.2 JWT Token Structure

```json
{
  "access_token": {
    "header": {
      "alg": "RS256",
      "typ": "JWT",
      "kid": "key-id-1"
    },
    "payload": {
      "sub": "user-uuid",
      "email": "user@example.com",
      "role": "customer",
      "permissions": ["read:products", "write:cart"],
      "iat": 1704067200,
      "exp": 1704070800,
      "jti": "unique-token-id"
    }
  },
  "refresh_token": {
    "header": {
      "alg": "RS256",
      "typ": "JWT"
    },
    "payload": {
      "sub": "user-uuid",
      "type": "refresh",
      "iat": 1704067200,
      "exp": 1706659200,
      "jti": "unique-refresh-id"
    }
  }
}
```

### 8.3 RBAC Permissions Matrix

```
Role          │ Auth │ Users │ Products │ Cart │ Orders │ Payments │ Reviews │ Admin
──────────────┼──────┼───────┼──────────┼──────┼────────┼──────────┼─────────�───────
customer      │  ✓   │  own  │    R     │ CRUD │ CRUD   │   CRUD   │   CRUD  │  -
premium_user  │  ✓   │  own  │    R     │ CRUD │ CRUD   │   CRUD   │   CRUD  │  -
seller        │  ✓   │  own  │   CRUD   │  R   │   R    │    R     │   R     │  -
senior_seller │  ✓  │  own  │   CRUD   │  R   │   R    │    R     │   R     │  -
support       │  ✓   │  all  │    R     │ all  │   R    │    R     │   CRUD  │  -
admin         │  ✓   │ CRUD  │   CRUD   │ all  │  CRUD  │   CRUD   │  CRUD   │ ✓

R = Read only, CRUD = Full access, all = Access to all resources, own = Own resources only
```

---

## 9. RELIABILITY PATTERNS

### 9.1 Circuit Breaker Implementation

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        CIRCUIT BREAKER STATE MACHINE                            │
└────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   CLOSED    │  Normal operation
                              │  (healthy)  │  All requests pass
                              └──────┬──────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │ threshold exceeded              │
                    ▼                                   ▼
           ┌─────────────┐                       ┌─────────────┐
           │   OPEN      │                       │ HALF-OPEN   │
           │  (failing) │  timeout elapsed      │  (testing)  │
           └──────┬──────┘                       └──────┬──────┘
                  │                                      │
                  │  failure                              │ success
                  ▼                                      ▼
           ┌─────────────┐                       ┌─────────────┐
           │   OPEN      │                       │   CLOSED   │
           │  (failing) │                       │  (healthy) │
           └─────────────┘                       └─────────────┘

Configuration:
├── Failure threshold: 5 failures in 10 seconds
├── Open duration: 30 seconds
├── Half-open requests: 3 test requests
└── Success threshold: 2 successes to close
```

### 9.2 Retry Strategy

```
Exponential Backoff with Jitter:

Attempt 1: immediate
Attempt 2: 1s + random(0-1s)
Attempt 3: 2s + random(0-2s)
Attempt 4: 4s + random(0-4s)
Attempt 5: 8s + random(0-8s)

Max attempts: 5
Timeout per attempt: 3s, 6s, 12s, 24s, 48s
```

### 9.3 Graceful Degradation

```
Service Degradation Strategy:

✅ Search Service Down
   → Fallback to database LIKE query
   → Show "Limited search" banner
   → Log for monitoring

✅ Recommendation Service Down
   → Fallback to popularity-based recommendations
   → Show "Popular items" section

✅ Payment Service Down
   → Queue orders for later processing
   → Show "Payment temporarily unavailable"

✅ Image CDN Down
   → Serve from backup CDN
   → Show placeholder images
```

---

## 10. DEPLOYMENT ARCHITECTURE (AWS)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              AWS ARCHITECTURE                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Route 53      │
                              │   (DNS)         │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  CloudFront     │
                              │  (CDN + WAF)    │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  ALB            │
                              │  (Load Balancer)│
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
           ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
           │  ECS Cluster    │ │  ECS Cluster    │ │  ECS Cluster    │
           │  (API Gateway)  │ │  (Core Services)│ │  (Workers)     │
           │  2-10 instances │ │  Auto-scaling   │ │  (Background)  │
           └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │                  │                  │
           ┌────────▼────────┐ ┌────────▼────────┐ ┌────────▼────────┐
           │  RDS Aurora     │ │  ElastiCache    │ │  MSK           │
           │  (PostgreSQL)   │ │  (Redis)        │ │  (Kafka)       │
           │  Multi-AZ       │ │  Cluster Mode   │ │  3 Brokers     │
           └─────────────────┘ └─────────────────┘ └─────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  S3            │
                              │  (Media/Static)│
                              └─────────────────┘
```

---

## 11. NEXT STEPS - PHASE 1 APPROVAL

**Phase 1 includes:**
1. ✅ System Architecture Diagram
2. ✅ Service Breakdown + Responsibilities
3. ✅ API Gateway Design
4. ✅ Database Schema per Service
5. ✅ Event Flow Design (Kafka)
6. ✅ Caching Strategy (Redis)
7. ✅ Search Architecture (Elasticsearch)
8. ✅ Security Architecture
9. ✅ Reliability Patterns
10. ✅ Deployment Architecture (AWS)

**Ready for Phase 2: Service Design & Database Implementation**

---

**Please confirm if you'd like to proceed to Phase 2**, which includes:
- Detailed API contracts per service
- Database migration scripts
- Service-to-service communication patterns
- Infrastructure as Code (Terraform)

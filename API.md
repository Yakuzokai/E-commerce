# 📖 ShopHub API Reference

This document lists all available API endpoints across the ShopHub microservices.

## 🔐 Auth Service (Port 3001)
Base URL: `http://localhost:3001`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login with email and password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout current session |
| POST | `/api/auth/logout-all` | Logout from all devices |
| GET | `/api/auth/me` | Get current user info |
| GET | `/api/users/profile` | Get current user's profile |
| PATCH | `/api/users/profile` | Update current user's profile |
| GET | `/api/users` | List all users (Admin only) |
| GET | `/api/users/:id` | Get user by ID |
| PATCH | `/api/users/:id/role` | Update user role (Admin only) |
| DELETE | `/api/users/:id` | Delete user (Admin only) |

---

## 📦 Product Service (Port 3002)
Base URL: `http://localhost:3002`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | List all categories |
| GET | `/api/v1/products` | List products (with filtering/pagination) |
| GET | `/api/v1/products/:id` | Get product details by ID |
| GET | `/api/v1/products/slug/:slug` | Get product details by slug |
| GET | `/api/v1/products/trending` | Get trending products |
| GET | `/api/v1/products/flash-sales` | Get active flash sale products |

---

## 🛒 Order Service (Port 3003)
Base URL: `http://localhost:3003`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create a new order |
| GET | `/api/orders/:id` | Get order details |
| GET | `/api/orders/number/:orderNumber` | Get order by order number |
| GET | `/api/users/:userId/orders` | Get all orders for a user |
| GET | `/api/sellers/:sellerId/orders` | Get all orders for a seller |
| PATCH | `/api/orders/:id/status` | Update order status |
| PATCH | `/api/orders/:id/payment` | Update order payment status |
| POST | `/api/orders/:id/cancel` | Cancel an order |
| POST | `/api/orders/:id/returns` | Initiate a return |
| GET | `/api/sellers/:sellerId/stats` | Get seller order statistics |

---

## 💳 Payment Service (Port 3004)
Base URL: `http://localhost:3004`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Create a payment intent |
| GET | `/api/payments/:id` | Get payment status |
| GET | `/api/payments/order/:orderId` | Get payment by order ID |
| GET | `/api/users/:userId/payments` | Get user payment history |
| POST | `/api/payments/:id/process` | Process a payment |
| POST | `/api/payments/:id/refund` | Initiate a refund |
| GET | `/api/payments/:id/refunds` | Get refunds for a payment |
| POST | `/webhooks/stripe` | Stripe webhook listener |

---

## 🔍 Search Service (Port 3005)
Base URL: `http://localhost:3005`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Search products (Elasticsearch) |
| GET | `/api/search/suggest` | Search suggestions / autocomplete |
| GET | `/api/search/similar/:productId` | Find similar products |

---

## 🛒 Cart Service (Port 3006)
Base URL: `http://localhost:3006`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/cart` | Get user's shopping cart |
| POST | `/api/users/:userId/cart/items` | Add item to cart |
| PATCH | `/api/users/:userId/cart/items/:itemId` | Update cart item quantity |
| DELETE | `/api/users/:userId/cart/items/:itemId` | Remove item from cart |
| DELETE | `/api/users/:userId/cart` | Clear entire cart |
| POST | `/api/users/:userId/cart/vouchers` | Apply voucher to cart |

---

## 🔔 Notification Service (Port 3007)
Base URL: `http://localhost:3007`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/notifications` | Get user notifications |
| GET | `/api/users/:userId/notifications/unread-count` | Get unread notification count |
| PATCH | `/api/notifications/:id/read` | Mark notification as read |
| POST | `/api/users/:userId/notifications/read-all` | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Delete a notification |
| GET | `/api/users/:userId/preferences` | Get notification preferences |
| PUT | `/api/users/:userId/preferences` | Update notification preferences |

---

## 👤 User Service (Port 3008)
Base URL: `http://localhost:3008`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:id` | Get user profile details |
| PATCH | `/api/users/:id` | Update user profile |
| GET | `/api/users/:userId/addresses` | List user addresses |
| POST | `/api/users/:userId/addresses` | Add new address |
| PATCH | `/api/users/:userId/addresses/:addressId` | Update address |
| DELETE | `/api/users/:userId/addresses/:addressId` | Delete address |
| POST | `/api/users/:userId/addresses/:addressId/default` | Set default address |
| GET | `/api/users/:userId/preferences` | Get user app preferences |
| PUT | `/api/users/:userId/preferences` | Update user app preferences |
| POST | `/api/users/:userId/follow/:sellerId` | Follow a seller |
| DELETE | `/api/users/:userId/follow/:sellerId` | Unfollow a seller |
| GET | `/api/sellers/:sellerId/followers` | Get seller followers |

---

## ⭐ Review Service (Port 3009)
Base URL: `http://localhost:3009`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:productId/reviews` | List reviews for a product |
| GET | `/api/products/:productId/rating-summary` | Get product rating statistics |
| POST | `/api/reviews` | Create a new review |
| GET | `/api/reviews/:id` | Get review details |
| PATCH | `/api/reviews/:id` | Update a review |
| DELETE | `/api/reviews/:id` | Delete a review |
| POST | `/api/reviews/:id/vote` | Upvote/downvote a review |
| POST | `/api/reviews/:id/response` | Respond to a review (Sellers) |
| GET | `/api/users/:userId/reviews` | Get all reviews by a user |

---

## 🤖 Recommendation Service (Port 3010)
Base URL: `http://localhost:3010`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/behavior` | Track user behavior for recommendations |
| GET | `/api/recommendations/trending` | Get trending products |
| GET | `/api/recommendations/personalized/:userId` | Get personalized recommendations |
| GET | `/api/recommendations/similar/:productId` | Get similar product recommendations |
| POST | `/api/recommendations/frequently-bought-together` | Get complementary products |
| GET | `/api/recommendations/recently-viewed/:userId` | Get user's recently viewed items |
| GET | `/api/recommendations/new-arrivals` | Get new arrival recommendations |
| GET | `/api/recommendations/flash-sale/:userId` | Get personalized flash sales |

---

## 💬 Chat Service (Port 3011)
Base URL: `http://localhost:3011`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/:userId/conversations` | Get user's conversations |
| POST | `/api/conversations/direct` | Get/create direct message chat |
| POST | `/api/conversations` | Create a new conversation |
| GET | `/api/conversations/:id` | Get conversation details |
| GET | `/api/conversations/:id/messages` | Get messages in a conversation |
| POST | `/api/conversations/:id/messages` | Send a message |
| DELETE | `/api/messages/:id` | Delete a message |
| POST | `/api/conversations/:id/mute` | Mute/unmute conversation |
| POST | `/api/conversations/:id/block` | Block/unblock conversation |
| GET | `/api/users/:userId/unread-count` | Get total unread message count |

---

## 🧠 ML Service (Port 3012)
Base URL: `http://localhost:3012`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/recommendations/collab/train` | Trigger training for collab filtering |
| GET | `/api/recommendations/collab/:userId` | Get collab filtering recommendations |
| GET | `/api/recommendations/collab/status` | Get ML training status |
| POST | `/api/embeddings/products` | Generate product embeddings |
| GET | `/api/similar/:productId` | Find similar products via embeddings |
| POST | `/api/experiments` | Create A/B testing experiment |
| GET | `/api/experiments` | List experiments |
| POST | `/api/experiments/:id/start` | Start an experiment |

---

## 🛡️ Fraud Detection Service (Port 3013)
Base URL: `http://localhost:3013`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/check` | Check a transaction for fraud |
| GET | `/api/profile/:userId` | Get user fraud risk profile |

---

## 📊 Analytics Service (Port 3014)
Base URL: `http://localhost:3014`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/metrics` | Get general system metrics |
| GET | `/api/dashboard` | Get summary dashboard data |
| GET | `/api/realtime` | Get real-time event analytics |
| GET | `/api/trend` | Get historical trends |
| POST | `/api/track` | Manually track an analytics event |

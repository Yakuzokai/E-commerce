---
title: Elasticsearch Architecture
tags:
  - data
  - search
  - elasticsearch
aliases:
  - Elasticsearch Architecture
created: 2026-09-10
type: data
---

# 🔍 Elasticsearch Architecture

Elasticsearch powers catalog search queries and behavioral interaction datasets.

---

## 📑 Index Inventory

### 1. `products` Index ([[Search Service]])
- **Analyzers**: Standard English analyzer with edge n-gram filter for autocomplete typeahead.
- **Fields**: `name`, `description`, `category`, `brand`, `price`, `rating`, `inStock`.

### 2. `user_behavior` Index ([[Recommendation Service]])
- **Fields**: `userId`, `productId`, `eventType` (`view`, `cart`, `purchase`), `timestamp`.

---

## 🔗 Related Documents
- [[Search Service]]
- [[Recommendation Service]]

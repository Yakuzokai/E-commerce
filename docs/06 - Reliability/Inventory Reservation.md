---
title: Inventory Reservation
tags:
  - reliability
  - inventory
  - e-commerce
aliases:
  - Inventory Reservation
created: 2026-09-10
type: reliability
---

# 📦 Inventory Reservation Workflow

ShopHub adopts a two-phase inventory reservation model:

1. **Temporary Hold**: When an order is placed, stock is held for 15 minutes using [[Distributed Locks]].
2. **Permanent Deduct**: Upon receipt of `payments.completed` from [[Payment Service]], inventory is permanently decremented.
3. **Auto Release**: If payment fails or times out, stock is released back to available inventory.

---

## 🔗 Related Documents
- [[Distributed Locks]]
- [[Product Service]]
- [[Order Service]]

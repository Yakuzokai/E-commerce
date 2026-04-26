@echo off
title ShopHub - Enterprise E-Commerce Platform

echo ===================================================
echo [1/3] Starting Infrastructure (Docker)...
echo ===================================================
cd infrastructure/docker
docker-compose up -d
cd ../..

echo Waiting for database and kafka to be ready...
timeout /t 10 /nobreak

echo ===================================================
echo [2/3] Starting Backend Microservices...
echo ===================================================

:: Start Auth Service
start "Auth Service" cmd /k "cd microservices/auth-service && npm run dev"

:: Start Product Service
start "Product Service" cmd /k "cd microservices/product-service && npm run dev"

:: Start Order Service
start "Order Service" cmd /k "cd microservices/order-service && npm run dev"

:: Start Cart Service
start "Cart Service" cmd /k "cd microservices/cart-service && npm run dev"

:: Start Payment Service
start "Payment Service" cmd /k "cd microservices/payment-service && npm run dev"

:: Start Search Service
start "Search Service" cmd /k "cd microservices/search-service && npm run dev"

:: Start Notification Service
start "Notification Service" cmd /k "cd microservices/notification-service && npm run dev"

echo ===================================================
echo [3/3] Starting Frontend...
echo ===================================================

:: Start Frontend
start "Frontend UI" cmd /k "cd frontend/ecommerce-frontend && npm run dev"

echo ---------------------------------------------------
echo All services are starting! 
echo Dashboard URLs:
echo - Frontend: http://localhost:5173
echo - Kafka UI: http://localhost:8080
echo - Kibana:   http://localhost:5601
echo - Grafana:  http://localhost:3002
echo ---------------------------------------------------
pause

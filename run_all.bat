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

:: Core Services
start "Auth" cmd /k "cd microservices/auth-service && npm run dev"
start "User" cmd /k "cd microservices/user-service && npm run dev"
start "Product" cmd /k "cd microservices/product-service && npm run dev"
start "Cart" cmd /k "cd microservices/cart-service && npm run dev"
start "Order" cmd /k "cd microservices/order-service && npm run dev"
start "Payment" cmd /k "cd microservices/payment-service && npm run dev"

:: Search & AI
start "Search" cmd /k "cd microservices/search-service && npm run dev"
start "ML" cmd /k "cd microservices/ml-service && npm run dev"
start "Recommendation" cmd /k "cd microservices/recommendation-service && npm run dev"

:: Communications & Support
start "Notification" cmd /k "cd microservices/notification-service && npm run dev"
start "Chat" cmd /k "cd microservices/chat-service && npm run dev"
start "Review" cmd /k "cd microservices/review-service && npm run dev"

:: Operations
start "Analytics" cmd /k "cd microservices/analytics-service && npm run dev"
start "Fraud" cmd /k "cd microservices/fraud-detection-service && npm run dev"

echo ===================================================
echo [3/3] Starting Frontend...
echo ===================================================

:: Start Frontend
start "Frontend UI" cmd /k "cd frontend/ecommerce-frontend && npm run dev"

echo ---------------------------------------------------
echo All 14 services and Frontend are starting! 
echo 
echo Important: Some services may take a minute to initialize.
echo ---------------------------------------------------
pause

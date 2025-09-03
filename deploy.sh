#!/bin/bash

echo "🚀 Starting AniWay deployment..."

# Остановка и удаление старых контейнеров
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Удаление старых образов (опционально)
echo "🧹 Cleaning up old images..."
docker system prune -f

# Сборка и запуск новых контейнеров
echo "🔨 Building and starting new containers..."
docker-compose -f docker-compose.prod.yml up -d --build

# Ожидание запуска всех сервисов
echo "⏳ Waiting for services to start..."
sleep 30

# Проверка статуса
echo "📊 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

echo "✅ Deployment completed!"
echo "🌐 Frontend available at: http://your-server-ip"
echo "🔧 Gateway API available at: http://your-server-ip:8080"
echo "📸 Images served from: https://storage.yandexcloud.net/manga-images-bucket/"
echo ""
echo "📋 Next steps:"
echo "1. Test image upload via API"
echo "2. Verify images display in browser"
echo "3. Set up domain (optional)"
echo "4. Configure HTTPS (recommended for production)"

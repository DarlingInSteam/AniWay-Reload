#!/bin/bash

echo "🚀 Starting AniWay deployment..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "🔧 Запустите ./check-env.sh для создания и настройки .env файла"
    exit 1
fi

# Проверяем, заполнены ли критически важные переменные
if grep -q "YOUR_.*_HERE" .env; then
    echo "❌ В .env файле найдены незаполненные поля!"
    echo "🔧 Отредактируйте .env файл и заполните все необходимые поля"
    echo "📄 Запустите: nano .env"
    exit 1
fi

# Проверяем наличие Yandex Cloud ключей
source .env
if [ -z "$YC_ACCESS_KEY" ] || [ -z "$YC_SECRET_KEY" ]; then
    echo "❌ Yandex Cloud ключи не заполнены в .env файле!"
    echo "🔧 Заполните YC_ACCESS_KEY и YC_SECRET_KEY"
    exit 1
fi

echo "✅ .env файл корректно настроен"

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

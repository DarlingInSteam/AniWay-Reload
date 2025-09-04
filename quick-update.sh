#!/bin/bash

echo "🔄 Быстрое обновление AniWay..."

# Остановка всех контейнеров
echo "⏹️ Остановка контейнеров..."
docker-compose -f docker-compose.prod.yml down

# Обновление кода
echo "📥 Обновление кода..."
git pull origin experimental-branch

# Удаление старых образов только для измененных сервисов
echo "🗑️ Удаление старых образов..."
docker image rm -f aniway-reload-auth-service 2>/dev/null || true
docker image rm -f aniway-reload-gateway-service 2>/dev/null || true
docker image rm -f aniway-reload-chapter-service 2>/dev/null || true
docker image rm -f aniway-reload-comment-service 2>/dev/null || true
docker image rm -f aniway-reload-manga-service 2>/dev/null || true
docker image rm -f aniway-reload-image-storage-service 2>/dev/null || true

# Пересборка и запуск
echo "🔨 Пересборка и запуск сервисов..."
docker-compose -f docker-compose.prod.yml up -d --build

# Ожидание запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 30

# Проверка статуса
echo "📊 Статус сервисов:"
docker-compose -f docker-compose.prod.yml ps

echo "✅ Обновление завершено!"
echo "🌐 Сайт доступен по адресу: http://$(curl -s ifconfig.me)"

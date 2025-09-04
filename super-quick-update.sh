#!/bin/bash

echo "⚡ Сверхбыстрое обновление AniWay..."

# Сохраняем изменения в .env если они есть
if [ -f .env ]; then
    cp .env .env.backup
    echo "💾 .env файл сохранен"
fi

# Обновляем код
echo "📥 Обновление кода..."
git stash 2>/dev/null || true
git pull origin experimental-branch
git stash pop 2>/dev/null || true

# Восстанавливаем .env
if [ -f .env.backup ]; then
    mv .env.backup .env
    echo "🔄 .env файл восстановлен"
fi

# Перезапуск только измененных сервисов без полной пересборки
echo "🔄 Перезапуск сервисов..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-build auth-service gateway-service chapter-service comment-service manga-service image-storage-service

echo "✅ Быстрое обновление завершено!"

#!/bin/bash

echo "🎨 Обновление только фронтенда..."

# Обновляем код
git pull origin experimental-branch

# Пересборка только фронтенда
echo "🔨 Пересборка фронтенда..."
docker-compose -f docker-compose.prod.yml up -d --build --no-deps aniway-frontend

echo "✅ Фронтенд обновлен!"

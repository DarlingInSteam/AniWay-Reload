#!/bin/bash

echo "============================================"
echo "    ИСПРАВЛЕНИЕ ПРОБЛЕМ С DOCKER VOLUMES"
echo "============================================"
echo

echo "ШАГ 1: Создаем необходимые директории..."
sudo mkdir -p /var/lib/aniway/auth_data
sudo mkdir -p /var/lib/aniway/manga_data
sudo mkdir -p /var/lib/aniway/comment_data
sudo mkdir -p /var/lib/aniway/chapter_data
sudo mkdir -p /var/lib/aniway/image_data

echo "Директории созданы!"

echo
echo "ШАГ 2: Останавливаем все сервисы..."
cd "$(dirname "$0")"
docker-compose down

echo
echo "ШАГ 3: Удаляем проблемный volume..."
docker volume rm aniway-reload_manga_postgres_data 2>/dev/null || true

echo
echo "ШАГ 4: Принудительно удаляем все volumes проекта..."
docker volume rm aniway-reload_chapter_postgres_data 2>/dev/null || true
docker volume rm aniway-reload_auth_postgres_data 2>/dev/null || true
docker volume rm aniway-reload_comment_postgres_data 2>/dev/null || true
docker volume rm aniway-reload_image_storage_postgres_data 2>/dev/null || true
docker volume rm aniway-reload_minio_data 2>/dev/null || true
docker volume rm aniway-reload_redis_data 2>/dev/null || true
docker volume rm aniway-reload_melon_data 2>/dev/null || true
docker volume rm aniway-reload_melon_logs 2>/dev/null || true
docker volume rm aniway-reload_melon_temp 2>/dev/null || true

echo
echo "ШАГ 5: Очищаем неиспользуемые volumes..."
docker volume prune -f

echo
echo "ШАГ 6: Перезапускаем Docker daemon..."
echo "Если проблема persists, попробуйте:"
echo "- Перезагрузить Docker Desktop"
echo "- Перезагрузить компьютер"
echo "- docker system prune -a"

echo
echo "Теперь попробуйте запустить сервисы:"
echo "docker-compose up -d"

read -p "Нажмите Enter для выхода..."
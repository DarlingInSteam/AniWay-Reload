#!/bin/bash

echo "============================================"
echo "    ПОЛНОЕ УНИЧТОЖЕНИЕ ВСЕХ ДАННЫХ ANIWAY"
echo "============================================"
echo
echo "ВНИМАНИЕ: Эта операция НЕОБРАТИМА!"
echo "Все данные будут потеряны навсегда."
echo
echo "Будут удалены:"
echo "- Все Docker volumes"
echo "- Все bind mounts (/var/lib/aniway/*)"
echo "- Все MinIO данные"
echo "- Все Redis данные"
echo "- Все логи и временные файлы"
echo

read -p "Вы уверены что хотите продолжить? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo "Операция отменена."
    exit 1
fi

echo
echo "ШАГ 1: Останавливаем все сервисы..."
cd "$(dirname "$0")"
docker-compose down
docker-compose -f docker-compose.prod.yml down 2>/dev/null
docker-compose -f docker-compose.dev.yml down 2>/dev/null

echo
echo "ШАГ 2: Удаляем все Docker volumes..."
docker volume rm aniway-reload_manga_postgres_data 2>/dev/null || true
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
echo "ШАГ 3: Удаляем bind mounts..."
if [[ -d "/var/lib/aniway" ]]; then
    echo "Удаляем /var/lib/aniway..."
    sudo rm -rf /var/lib/aniway
fi

echo
echo "ШАГ 4: Удаляем все неиспользуемые volumes..."
docker volume prune -f

echo
echo "ШАГ 5: Удаляем все остановленные контейнеры..."
docker container prune -f

echo
echo "ШАГ 6: Удаляем все неиспользуемые образы..."
docker image prune -f

echo
echo "ШАГ 7: Удаляем все неиспользуемые сети..."
docker network prune -f

echo
echo "============================================"
echo "      ВСЕ ДАННЫЕ УНИЧТОЖЕНЫ!"
echo "============================================"
echo
echo "Теперь вы можете пересоздать все сервисы:"
echo "docker-compose up -d"
echo
echo "Или для продакшена:"
echo "docker-compose -f docker-compose.prod.yml up -d"
echo

read -p "Нажмите Enter для выхода..."
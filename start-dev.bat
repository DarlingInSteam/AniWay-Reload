@echo off
echo 🚀 Запуск AniWay системы в режиме разработки...

REM Останавливаем все контейнеры проекта
echo 🛑 Остановка контейнеров...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --volumes --remove-orphans

REM Очищаем build кэш Docker (это решит проблему с кэшем)
echo 🗑️ Очистка build кэша...
docker builder prune -af

REM Очищаем неиспользуемые образы
echo 🖼️ Удаление неиспользуемых образов...
docker image prune -af

REM Очищаем volumes (осторожно - удалит данные БД)
echo 💾 Очистка volumes...
docker volume prune -f

REM Удаляем конкретные образы проекта для полной пересборки
echo 🗂️ Удаление образов проекта...
for /f "tokens=*" %%i in ('docker images --format "{{.Repository}}:{{.Tag}}" 2^>nul ^| findstr /i "aniway"') do (
    echo Удаляем %%i
    docker rmi %%i -f 2>nul
)

REM Проверяем Docker Buildx
echo 🔧 Проверка Docker Buildx...
docker buildx create --use --name dev-builder 2>nul || echo Builder уже существует

echo.
echo 🔨 Сборка и запуск в dev режиме...
echo Это может занять несколько минут при первом запуске...
echo.

REM Собираем и запускаем все сервисы в режиме разработки
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build --force-recreate

echo.
echo 🎉 Система запущена в режиме разработки!
echo 🌐 Фронтенд (dev): http://localhost:5173
echo 🚪 Gateway: http://localhost:8080
echo 📚 Manga Service: http://localhost:8081
echo 📖 Chapter Service: http://localhost:8082
echo 🖼️ Image Storage: http://localhost:8083
echo 💾 MinIO Console: http://localhost:9001 (admin/minioadmin)
echo 🗄️ Базы данных:
echo   - Manga DB: localhost:5435
echo   - Chapter DB: localhost:5433
echo   - Image Storage DB: localhost:5434
echo.
echo ✨ Hot-reload включен для всех сервисов!
echo 🔄 Изменения в коде будут автоматически применяться
pause
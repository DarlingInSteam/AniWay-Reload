@echo off
echo 🚀 Быстрый запуск AniWay в режиме разработки...
echo ⚡ Без полной очистки кэша - используйте только если нет проблем с контейнерами

REM Останавливаем контейнеры
echo 🛑 Остановка контейнеров...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

echo.
echo 🔨 Запуск в dev режиме...
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

echo.
echo 🎉 Система запущена в режиме разработки!
echo 🌐 Фронтенд (dev): http://localhost:5173
echo 🚪 Gateway: http://localhost:8080
echo 📚 Manga Service: http://localhost:8081
echo 📖 Chapter Service: http://localhost:8082
echo 🖼️ Image Storage: http://localhost:8083
echo 💾 MinIO Console: http://localhost:9001 (admin/minioadmin)
echo.
echo ✨ Hot-reload включен!
pause

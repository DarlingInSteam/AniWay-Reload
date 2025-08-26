@echo off
echo 🚀 Запуск AniWay в production режиме...

REM Останавливаем все контейнеры проекта
echo 🛑 Остановка контейнеров...
docker-compose down --volumes --remove-orphans

echo.
echo 🔨 Сборка и запуск в production режиме...
echo Это может занять несколько минут при первом запуске...
echo.

REM Собираем и запускаем все сервисы в production режиме
docker-compose up --build

echo.
echo 🎉 Система запущена в production режиме!
echo 🌐 Фронтенд: http://localhost:3000
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
pause

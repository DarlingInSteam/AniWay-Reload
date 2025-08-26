@echo off
echo 🚀 Запуск AniWay системы...

REM Проверяем, есть ли уже запущенные контейнеры
docker-compose ps -q >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️ Обнаружены запущенные контейнеры. Останавливаем...
    docker-compose down
)

REM Собираем и запускаем все сервисы
echo 🔨 Сборка и запуск контейнеров...
docker-compose up --build -d

echo ⏳ Ожидание готовности сервисов...
timeout /t 30 /nobreak >nul

echo 🔍 Проверка состояния сервисов...
docker-compose ps

echo.
echo 🎉 Система запущена! Доступные сервисы:
echo 🌐 Фронтенд: http://localhost:3000
echo 🚪 Gateway: http://localhost:8080
echo 📚 Manga Service: http://localhost:8081
echo 📖 Chapter Service: http://localhost:8082
echo 🖼️ Image Storage: http://localhost:8083
echo 📦 MinIO Console: http://localhost:9001 (admin:minioadmin)
echo.
echo 📋 Для просмотра логов используйте: docker-compose logs -f [service-name]
echo 🛑 Для остановки системы: docker-compose down
pause

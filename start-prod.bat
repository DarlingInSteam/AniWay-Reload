@echo off
echo 🚀 Запуск AniWay в production режиме (с Yandex Object Storage)...

REM Check if .env file exists
if not exist .env (
    echo ❌ Ошибка: .env файл не найден!
    echo 📋 Скопируйте .env.example в .env и заполните данные Yandex Cloud
    pause
    exit /b 1
)

echo 🔧 Загрузка переменных окружения из .env файла...
for /f "tokens=1,2 delims==" %%i in (.env) do (
    if not "%%i"=="" if not "%%j"=="" (
        set %%i=%%j
    )
)

REM Останавливаем все контейнеры проекта
echo 🛑 Остановка контейнеров...
docker-compose down --volumes --remove-orphans

echo.
echo 🔨 Сборка и запуск в production режиме с Yandex Object Storage...
echo Это может занять несколько минут при первом запуске...
echo.

REM Собираем и запускаем все сервисы в production режиме
docker-compose -f docker-compose.yml up --build

echo.
echo 🎉 Система запущена в production режиме!
echo 🌐 Фронтенд: http://localhost (порт 80)
echo 🚪 Gateway: http://localhost:8080
echo 📚 Manga Service: http://localhost:8081
echo 📖 Chapter Service: http://localhost:8082
echo 🖼️ Image Storage: http://localhost:8083
echo ☁️ Yandex Object Storage для изображений
echo 🗄️ Базы данных:
echo   - Manga DB: localhost:5435
echo   - Chapter DB: localhost:5433
echo   - Image Storage DB: localhost:5434
echo   - Auth DB: localhost:5436
echo   - Comment DB: localhost:5437
echo.
echo 📝 Логи: docker-compose logs -f
pause

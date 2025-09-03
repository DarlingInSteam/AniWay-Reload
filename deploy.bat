@echo off
echo 🚀 Starting AniWay deployment...

REM Остановка и удаление старых контейнеров
echo 📦 Stopping existing containers...
docker-compose -f docker-compose.prod.yml down

REM Удаление старых образов (опционально)
echo 🧹 Cleaning up old images...
docker system prune -f

REM Сборка и запуск новых контейнеров
echo 🔨 Building and starting new containers...
docker-compose -f docker-compose.prod.yml up -d --build

REM Ожидание запуска всех сервисов
echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak

REM Проверка статуса
echo 📊 Checking service status...
docker-compose -f docker-compose.prod.yml ps

echo ✅ Deployment completed!
echo 🌐 Frontend available at: http://your-server-ip
echo 🔧 Gateway API available at: http://your-server-ip:8080
pause

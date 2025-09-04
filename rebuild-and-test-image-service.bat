@echo off
echo Rebuilding ImageStorageService with Yandex Object Storage fixes...

REM Stop the service
docker-compose -f docker-compose.prod.yml stop image-storage-service

REM Remove the old container and image
docker-compose -f docker-compose.prod.yml rm -f image-storage-service
docker rmi aniway-reload-image-storage-service 2>nul

REM Build and start the service
docker-compose -f docker-compose.prod.yml up -d --build image-storage-service

echo.
echo Waiting for service to start...
timeout /t 10 /nobreak

echo.
echo Checking service status...
docker-compose -f docker-compose.prod.yml ps image-storage-service

echo.
echo Service logs (last 20 lines):
docker-compose -f docker-compose.prod.yml logs --tail=20 image-storage-service

echo.
echo You can now test the Yandex connection with:
echo curl http://localhost:8080/api/images/test/yandex-connection

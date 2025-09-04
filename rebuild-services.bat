@echo off
echo Rebuilding services with fixes...

echo.
echo 1. Rebuilding ChapterService...
docker-compose -f docker-compose.prod.yml stop chapter-service
docker-compose -f docker-compose.prod.yml build chapter-service
docker-compose -f docker-compose.prod.yml up -d chapter-service

echo.
echo 2. Rebuilding ImageStorageService...
docker-compose -f docker-compose.prod.yml stop image-storage-service
docker-compose -f docker-compose.prod.yml build image-storage-service
docker-compose -f docker-compose.prod.yml up -d image-storage-service

echo.
echo 3. Rebuilding MangaService...
docker-compose -f docker-compose.prod.yml stop manga-service
docker-compose -f docker-compose.prod.yml build manga-service
docker-compose -f docker-compose.prod.yml up -d manga-service

echo.
echo All services rebuilt and restarted.
echo.
echo Testing URLs:
echo - Test chapter images: http://localhost:8080/api/images/test/chapter/40/images
echo - Test Yandex connection: http://localhost:8080/api/images/test/yandex-connection
echo - Chapter 40 images: http://localhost:8080/api/images/chapter/40
echo - Chapter 40 count: http://localhost:8080/api/images/chapter/40/count

pause

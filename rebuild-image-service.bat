@echo off
echo Rebuilding and restarting ImageStorageService...

REM Stop the service
docker-compose -f docker-compose.prod.yml stop image-storage-service

REM Remove the old image
docker-compose -f docker-compose.prod.yml rm -f image-storage-service

REM Build and start the service
docker-compose -f docker-compose.prod.yml up -d --build image-storage-service

echo ImageStorageService has been rebuilt and restarted.
echo Checking service status...
docker-compose -f docker-compose.prod.yml ps image-storage-service

echo.
echo To view logs, run:
echo docker-compose -f docker-compose.prod.yml logs -f image-storage-service

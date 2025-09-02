#!/bin/bash

# Ожидание запуска MinIO
sleep 10

# Настройка алиаса
mc alias set minio-local http://localhost:9000 minioadmin minioadmin

# Создание bucket если не существует
mc mb minio-local/manga-images --ignore-existing

# Установка публичной политики для bucket
mc anonymous set public minio-local/manga-images

echo "MinIO initialization completed"

FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements.txt и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Устанавливаем FastAPI и uvicorn для API сервера
RUN pip install fastapi uvicorn

# Копируем весь проект
COPY . .

# Применяем критический UTF-8 патч
RUN if [ -f "dublib/Methods/Filesystem.py" ]; then \
    sed -i 's/open(path, "w")/open(path, "w", encoding="utf-8")/g' dublib/Methods/Filesystem.py; \
    echo "UTF-8 patch applied"; \
fi

# Применяем патч для исправления cross-device link ошибки
RUN if [ -f "Source/Core/Base/Builders/MangaBuilder.py" ]; then \
    sed -i 's/os\.replace(/shutil.move(/g' Source/Core/Base/Builders/MangaBuilder.py; \
    echo "Cross-device link patch applied"; \
fi

# Создаем необходимые директории
RUN mkdir -p Output/mangalib/titles Output/mangalib/archives Output/mangalib/images Logs Temp

# Открываем порт для API
EXPOSE 8084

# Запускаем API сервер
CMD ["python", "api_server.py"]
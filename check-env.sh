#!/bin/bash

echo "⚠️  ВАЖНО: Настройка переменных окружения для Yandex Cloud"
echo ""
echo "📝 Перед запуском deployment выполните следующие шаги:"
echo ""

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "🔧 Создаю .env файл с шаблоном..."
    
    cat > .env << EOL
# Yandex Cloud Object Storage credentials
YC_ACCESS_KEY=YOUR_ACCESS_KEY_HERE
YC_SECRET_KEY=YOUR_SECRET_KEY_HERE  
YC_BUCKET_NAME=manga-images-bucket

# Database passwords - замените на сильные пароли
AUTH_DB_PASSWORD=Secure_Auth_Pass_2024!
MANGA_DB_PASSWORD=Secure_Manga_Pass_2024!
COMMENT_DB_PASSWORD=Secure_Comment_Pass_2024!
CHAPTER_DB_PASSWORD=Secure_Chapter_Pass_2024!
IMAGE_DB_PASSWORD=Secure_Image_Pass_2024!
EOL

    echo "✅ Файл .env создан"
fi

echo ""
echo "🔑 ОБЯЗАТЕЛЬНО отредактируйте .env файл:"
echo "   nano .env"
echo ""
echo "📋 Замените следующие значения:"
echo "   YC_ACCESS_KEY=YOUR_ACCESS_KEY_HERE    <- Ваш Access Key из Yandex Cloud"
echo "   YC_SECRET_KEY=YOUR_SECRET_KEY_HERE    <- Ваш Secret Key из Yandex Cloud"
echo "   YC_BUCKET_NAME=manga-images-bucket    <- Название вашего бакета"
echo ""
echo "🔐 Опционально: измените пароли баз данных на более сложные"
echo ""
echo "✅ После редактирования .env файла запустите:"
echo "   ./deploy.sh"
echo ""

# Проверяем существующий .env
if [ -f .env ]; then
    echo "📄 Текущий .env файл:"
    echo "----------------------------------------"
    # Показываем .env но скрываем секретные ключи
    sed 's/YC_SECRET_KEY=.*/YC_SECRET_KEY=***HIDDEN***/' .env
    echo "----------------------------------------"
    echo ""
    
    # Проверяем, заполнены ли ключи
    if grep -q "YOUR_.*_HERE" .env; then
        echo "⚠️  ВНИМАНИЕ: В .env файле найдены незаполненные поля!"
        echo "🔧 Обязательно отредактируйте файл перед deployment"
    else
        echo "✅ .env файл выглядит корректно"
    fi
fi

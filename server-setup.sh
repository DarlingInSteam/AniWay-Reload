#!/bin/bash

echo "🚀 Setting up AniWay production server..."

# Обновление системы
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Установка Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
echo "🛠️ Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Установка Git
echo "📚 Installing Git..."
sudo apt install git -y

# Клонирование репозитория
echo "📥 Cloning AniWay repository..."
git clone https://github.com/DarlingInSteam/AniWay-Reload.git
cd AniWay-Reload
git checkout experimental-branch

# Настройка файрвола
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (Frontend Production)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5173/tcp  # Frontend Dev Server (Vite)
sudo ufw allow 8080/tcp  # API Gateway
sudo ufw allow 9000/tcp  # MinIO (if needed for dev)
sudo ufw --force enable

# Создание директорий для данных
echo "📁 Creating data directories..."
sudo mkdir -p /var/lib/aniway/{auth,manga,comment,chapter,image}_data
sudo chown -R $USER:$USER /var/lib/aniway/

# Настройка окружения
echo "⚙️ Setting up environment..."
cp .env.example .env
echo "❗ ВАЖНО: Отредактируйте файл .env с вашими Yandex Cloud credentials!"
echo "nano .env"

echo "✅ Server setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your credentials: nano .env"
echo "2. Run deployment: ./deploy.sh"
echo "3. Check status: docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "🌐 Your server will be available at: http://$(curl -s ifconfig.me)"

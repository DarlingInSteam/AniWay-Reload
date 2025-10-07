# Поддержка Shadowsocks VPN как прокси

## Ваш VPN провайдер

Вы упомянули, что можете сгенерировать ключи:
- **Shadowsocks** ✅ ЛУЧШИЙ ВЫБОР
- Trojan ⚠️ Сложнее
- VLESS ⚠️ Сложнее

## Решение: Shadowsocks как SOCKS5 прокси

### Архитектура

```
MelonService (Python/requests)
    ↓
SOCKS5 прокси (127.0.0.1:1080)
    ↓
Shadowsocks Client
    ↓
VPN Server (ваш провайдер)
    ↓
MangaLib API
```

### Вариант 1: Shadowsocks клиент на сервере (РЕКОМЕНДУЕТСЯ)

#### Установка shadowsocks

**На вашем сервере:**

```bash
# Вариант A: pip (если есть Python)
pip3 install shadowsocks

# Вариант B: shadowsocks-libev (нативный, быстрее)
apt-get update
apt-get install shadowsocks-libev
```

#### Конфигурация

Создайте файл `/etc/shadowsocks/config.json`:

```json
{
  "server": "ваш-vpn-сервер.com",
  "server_port": 8388,
  "local_address": "127.0.0.1",
  "local_port": 1080,
  "password": "ваш-пароль-из-vpn",
  "timeout": 300,
  "method": "aes-256-gcm"
}
```

**Параметры:**
- `server` - адрес вашего VPN сервера
- `server_port` - порт VPN сервера (обычно 8388, 443, или другой)
- `local_port` - локальный порт SOCKS5 прокси (1080 стандартный)
- `password` - пароль из ключа VPN
- `method` - метод шифрования (обычно aes-256-gcm, chacha20-ietf-poly1305)

#### Запуск как сервис

```bash
# Создайте systemd сервис
sudo nano /etc/systemd/system/shadowsocks.service
```

Вставьте:

```ini
[Unit]
Description=Shadowsocks Client
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/sslocal -c /etc/shadowsocks/config.json
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Запустите:

```bash
sudo systemctl enable shadowsocks
sudo systemctl start shadowsocks
sudo systemctl status shadowsocks
```

Проверьте:

```bash
curl --socks5 127.0.0.1:1080 https://api.ipify.org
# Должен вернуть IP вашего VPN сервера, а не IP сервера
```

#### Настройка MelonService

В `MelonService/Parsers/mangalib/settings.json`:

```json
"proxy": {
  "enable": true,
  "host": "127.0.0.1",
  "port": "1080",
  "login": "",
  "password": ""
}
```

**ВАЖНО:** Нужно доработать код для поддержки SOCKS5!

### Вариант 2: Docker контейнер с Shadowsocks (УДОБНЕЕ)

Добавьте Shadowsocks контейнер в docker-compose.yml:

```yaml
services:
  # Существующие сервисы...
  
  shadowsocks:
    image: shadowsocks/shadowsocks-libev
    container_name: shadowsocks-proxy
    environment:
      - SERVER_ADDR=ваш-vpn-сервер.com
      - SERVER_PORT=8388
      - PASSWORD=ваш-пароль
      - METHOD=aes-256-gcm
      - LOCAL_PORT=1080
    ports:
      - "1080:1080"
    restart: unless-stopped

  melon-service:
    # ... остальные настройки
    depends_on:
      - shadowsocks
    # В settings.json используйте:
    # "host": "shadowsocks", "port": "1080"
```

Запустите:

```bash
docker-compose up -d shadowsocks
docker-compose up -d melon-service
```

### Вариант 3: Преобразовать Shadowsocks в HTTP прокси (ПРОЩЕ ДЛЯ КОДА)

Используйте `privoxy` для преобразования SOCKS5 в HTTP:

```bash
apt-get install privoxy
```

Настройте `/etc/privoxy/config`:

```
forward-socks5 / 127.0.0.1:1080 .
listen-address 127.0.0.1:8118
```

Перезапустите:

```bash
systemctl restart privoxy
```

Теперь у вас HTTP прокси на `127.0.0.1:8118`!

В `settings.json`:

```json
"proxy": {
  "enable": true,
  "host": "127.0.0.1",
  "port": "8118",
  "login": "",
  "password": ""
}
```

**Преимущество:** Не нужно менять код - текущий код уже поддерживает HTTP прокси!

## Доработка кода для SOCKS5

Если хотите использовать SOCKS5 напрямую (без privoxy), нужно изменить `api_server.py`:

```python
def load_proxy_settings(parser: str = "mangalib"):
    # ... существующий код ...
    
    proxy_type = proxy_config.get("type", "http")  # Добавить поле "type"
    
    if not host or not port:
        return None
    
    # Формируем URL прокси с учетом типа
    if login and password:
        proxy_url = f"{proxy_type}://{login}:{password}@{host}:{port}"
    else:
        proxy_url = f"{proxy_type}://{host}:{port}"
    
    return {'http': proxy_url, 'https': proxy_url}
```

И в `settings.json` добавьте поле `"type"`:

```json
"proxy": {
  "enable": true,
  "type": "socks5",  ← Добавить это!
  "host": "127.0.0.1",
  "port": "1080",
  "login": "",
  "password": ""
}
```

**Также убедитесь, что установлен PySocks:**

```bash
pip install pysocks
# Уже добавлено в requirements.txt
```

## Как получить параметры Shadowsocks

Ваш VPN провайдер должен дать вам:

1. **ss:// ссылку**, например:
   ```
   ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@server.com:8388#name
   ```

2. **Или явные параметры:**
   - Server: `server.vpn.com`
   - Port: `8388`
   - Password: `your-password`
   - Method: `aes-256-gcm`

### Декодирование ss:// ссылки

```python
import base64
import urllib.parse

ss_url = "ss://YWVzLTI1Ni1nY206cGFzc3dvcmQ=@server.com:8388#name"

# Убираем ss://
encoded = ss_url.replace("ss://", "").split("#")[0]

# Разбираем
if "@" in encoded:
    method_password, server_port = encoded.split("@")
    method_password_decoded = base64.b64decode(method_password).decode()
    method, password = method_password_decoded.split(":")
    server, port = server_port.split(":")
    
    print(f"Server: {server}")
    print(f"Port: {port}")
    print(f"Method: {method}")
    print(f"Password: {password}")
```

## Пошаговый план

### Самый простой способ (РЕКОМЕНДУЕТСЯ):

1. **Установить shadowsocks-libev на сервере:**
   ```bash
   apt-get install shadowsocks-libev
   ```

2. **Создать конфиг `/etc/shadowsocks/config.json`:**
   ```json
   {
     "server": "ваш-vpn-сервер",
     "server_port": 8388,
     "local_address": "127.0.0.1",
     "local_port": 1080,
     "password": "ваш-пароль",
     "method": "aes-256-gcm"
   }
   ```

3. **Установить privoxy (для HTTP прокси):**
   ```bash
   apt-get install privoxy
   ```

4. **Настроить privoxy `/etc/privoxy/config`:**
   ```
   forward-socks5 / 127.0.0.1:1080 .
   listen-address 127.0.0.1:8118
   ```

5. **Запустить сервисы:**
   ```bash
   systemctl start shadowsocks-libev
   systemctl start privoxy
   ```

6. **Настроить settings.json:**
   ```json
   "proxy": {
     "enable": true,
     "host": "127.0.0.1",
     "port": "8118",
     "login": "",
     "password": ""
   }
   ```

7. **Пересобрать и перезапустить MelonService:**
   ```bash
   docker-compose build melon-service
   docker-compose up -d melon-service
   ```

8. **Проверить:**
   ```bash
   docker logs aniway-reload-melon-service-1 --tail=50
   # Должно быть: "✅ Proxy configured and ready to use"
   ```

## Trojan/VLESS (если все же хотите)

Для этих протоколов нужен **v2ray/xray клиент**:

```bash
# Установка xray
wget https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip
unzip Xray-linux-64.zip
mv xray /usr/local/bin/

# Конфиг /etc/xray/config.json
{
  "inbounds": [{
    "port": 1080,
    "protocol": "socks",
    "settings": {"udp": true}
  }],
  "outbounds": [{
    "protocol": "trojan",  // или "vless"
    "settings": {
      "servers": [{
        "address": "ваш-сервер",
        "port": 443,
        "password": "ваш-пароль"
      }]
    }
  }]
}

# Запуск
xray run -c /etc/xray/config.json
```

Затем используйте `127.0.0.1:1080` как SOCKS5 прокси.

## Проверка работы VPN прокси

```bash
# Без прокси (должен показать IP сервера)
curl https://api.ipify.org

# С прокси (должен показать IP VPN)
curl --proxy http://127.0.0.1:8118 https://api.ipify.org
# ИЛИ
curl --socks5 127.0.0.1:1080 https://api.ipify.org

# Тест MangaLib API
curl --proxy http://127.0.0.1:8118 \
  -H "Site-Id: 1" \
  "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&page=1"
# Должно вернуть 200 OK с данными манги
```

## Итого

**ЛУЧШИЙ ВАРИАНТ ДЛЯ ВАС:**

1. Shadowsocks клиент → SOCKS5 (127.0.0.1:1080)
2. Privoxy → HTTP прокси (127.0.0.1:8118)
3. MelonService → использует HTTP прокси

**Преимущества:**
- ✅ Не нужно менять код (текущий код уже работает с HTTP)
- ✅ VPN обходит блокировку IP
- ✅ Быстро и надежно
- ✅ Можно использовать для всех сервисов

Дайте знать параметры вашего VPN (сервер, порт, метод) и я помогу создать конфиги!

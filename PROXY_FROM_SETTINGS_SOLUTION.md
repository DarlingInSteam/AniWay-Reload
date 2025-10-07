# ✅ РЕШЕНИЕ: Использование встроенной поддержки прокси в MelonService

## Открытие

MelonService **УЖЕ ИМЕЕТ** встроенную поддержку прокси в `settings.json`! Не нужно было добавлять новый код.

## Что изменено

### 1. api_server.py теперь читает прокси из settings.json

**Старый подход:** Переменные окружения `PROXY_ENABLED` + `PROXY_URL`  
**Новый подход:** Читает из `Parsers/mangalib/settings.json` → секция `"proxy"`

**Код (строки 27-80):**
```python
def load_proxy_settings(parser: str = "mangalib"):
    """Загружает настройки прокси из settings.json парсера"""
    settings_path = Path(__file__).parent / "Parsers" / parser / "settings.json"
    settings = json.load(open(settings_path, 'r', encoding='utf-8'))
    proxy_config = settings.get("proxy", {})
    
    if proxy_config.get("enable"):
        host = proxy_config["host"]
        port = proxy_config["port"]
        login = proxy_config.get("login", "")
        password = proxy_config.get("password", "")
        
        if login and password:
            proxy_url = f"http://{login}:{password}@{host}:{port}"
        else:
            proxy_url = f"http://{host}:{port}"
        
        return {'http': proxy_url, 'https': proxy_url}
    
    return None

# Загружаем при старте
PROXY_SETTINGS = load_proxy_settings("mangalib")
```

### 2. Использование в запросах

```python
# get_catalog()
response = requests.get(api_url, headers=headers, proxies=PROXY_SETTINGS, timeout=30)

# get_chapters_metadata_only_endpoint()
response = requests.get(api_url, headers=headers, proxies=PROXY_SETTINGS, timeout=30)
```

## Инструкция по настройке

### Шаг 1: Отредактируйте settings.json

**Файл:** `MelonService/Parsers/mangalib/settings.json`

```json
{
  "common": { ... },
  "filters": { ... },
  "proxy": {
    "enable": true,           ← Включить прокси
    "host": "ваш-прокси-хост",  ← IP или домен
    "port": "порт",            ← Например: "1080" или "8080"
    "login": "логин",          ← Опционально (если требуется авторизация)
    "password": "пароль"       ← Опционально
  },
  "custom": { ... }
}
```

### Примеры конфигурации:

#### Вариант 1: SOCKS5 прокси без авторизации

```json
"proxy": {
  "enable": true,
  "host": "127.0.0.1",
  "port": "1080",
  "login": "",
  "password": ""
}
```

**Результат:** `http://127.0.0.1:1080`

#### Вариант 2: HTTP прокси с авторизацией

```json
"proxy": {
  "enable": true,
  "host": "proxy.example.com",
  "port": "8080",
  "login": "username",
  "password": "password123"
}
```

**Результат:** `http://username:password123@proxy.example.com:8080`

#### Вариант 3: Платный residential прокси (ProxyRack)

```json
"proxy": {
  "enable": true,
  "host": "proxy.proxyrack.com",
  "port": "10000",
  "login": "your-username",
  "password": "your-api-key"
}
```

#### Вариант 4: Ваш компьютер как прокси

На вашем Windows компьютере:

```powershell
# Запустите SOCKS5 прокси (например, microsocks)
microsocks.exe -i 0.0.0.0 -p 1080

# Или SSH туннель
ssh -D 0.0.0.0:1080 -N localhost

# Узнайте ваш внешний IP
(Invoke-WebRequest -Uri "https://api.ipify.org").Content
```

В settings.json:

```json
"proxy": {
  "enable": true,
  "host": "ваш-внешний-ip",  ← IP из команды выше
  "port": "1080",
  "login": "",
  "password": ""
}
```

### Шаг 2: Пересоберите и перезапустите MelonService

**На сервере:**

```bash
cd /root/AniWay-Reload

# Скопируйте изменения из локального репо
# ИЛИ отредактируйте settings.json напрямую:
nano MelonService/Parsers/mangalib/settings.json

# Обновите код api_server.py (git pull или scp)
git pull origin develop

# Пересоберите контейнер
docker-compose build melon-service

# Перезапустите
docker-compose up -d melon-service

# Проверьте логи
docker logs aniway-reload-melon-service-1 --tail=50
```

**Ожидаемые логи при старте:**

```
INFO: ✅ Proxy configured and ready to use
INFO: Proxy loaded from mangalib settings: ваш-прокси-хост:порт
INFO: Waiting for application startup.
INFO: Application startup complete.
```

**Или (если прокси отключен):**

```
INFO: Proxy disabled in mangalib settings.json
INFO: ℹ️  No proxy configured (requests will go directly)
```

### Шаг 3: Проверка работы

```bash
# Тест каталога
curl "http://localhost:8084/catalog/1?parser=mangalib&limit=10"

# Ожидаемо: {"success": true, "count": 10, "slugs": [...]}
```

**Логи при успешном запросе:**

```
INFO: Fetching catalog page 1 for mangalib, limit: 60
INFO: Successfully fetched 60 manga slugs from page 1  ← ✅ УСПЕХ!
```

**НЕ должно быть:**

```
ERROR: Request error fetching catalog: 403 Client Error: Forbidden  ← ❌
```

## Поддерживаемые типы прокси

### HTTP/HTTPS прокси ✅

```json
"host": "proxy.example.com",
"port": "8080"
```

Результат: `http://proxy.example.com:8080`

### SOCKS5 прокси ⚠️ (требует PySocks)

**ВАЖНО:** Стандартный `requests` не поддерживает SOCKS5 напрямую!

Нужно установить `pysocks` (уже добавлено в requirements.txt):

```bash
pip install pysocks
```

Использование:

```python
# В коде нужно указывать socks5://
proxies = {'http': 'socks5://host:port', 'https': 'socks5://host:port'}
```

**Для поддержки SOCKS5 в settings.json нужно добавить поле "type":**

```json
"proxy": {
  "enable": true,
  "type": "socks5",  ← Добавить это поле
  "host": "127.0.0.1",
  "port": "1080",
  "login": "",
  "password": ""
}
```

**И изменить код в api_server.py:**

```python
proxy_type = proxy_config.get("type", "http")  # По умолчанию http

if login and password:
    proxy_url = f"{proxy_type}://{login}:{password}@{host}:{port}"
else:
    proxy_url = f"{proxy_type}://{host}:{port}"
```

## Troubleshooting

### Ошибка: "Proxy disabled in mangalib settings.json"

**Причина:** `"enable": false` в settings.json

**Решение:** Установите `"enable": true`

### Ошибка: "Proxy enabled but host/port not set"

**Причина:** Пустые `"host"` или `"port"`

**Решение:** Заполните поля:
```json
"host": "ваш-прокси",
"port": "порт"
```

### Ошибка: "Settings file not found"

**Причина:** Неправильный путь к settings.json

**Решение:** Проверьте, что файл существует:
```bash
ls MelonService/Parsers/mangalib/settings.json
```

### Ошибка: "ProxyError" или "Cannot connect to proxy"

**Причины:**
1. Прокси сервер недоступен
2. Неправильный host/port
3. Требуется авторизация (login/password)
4. Firewall блокирует соединение

**Проверка прокси:**
```bash
# На сервере
curl --proxy http://host:port https://api.ipify.org
# Должен вернуть IP прокси

# С авторизацией
curl --proxy http://login:password@host:port https://api.ipify.org
```

### Все еще 403 даже с прокси

**Причины:**
1. IP прокси тоже заблокирован MangaLib
2. Прокси требует дополнительную настройку
3. Нужен residential proxy вместо datacenter

**Решение:**
- Используйте residential proxy (ProxyRack, Smartproxy)
- Попробуйте ваш домашний компьютер как прокси

## Измененные файлы

1. **MelonService/api_server.py**
   - Удалено: `PROXY_ENABLED` и `PROXY_URL` (переменные окружения)
   - Удалено: `get_proxies()` функция
   - Добавлено: `load_proxy_settings()` - читает из settings.json
   - Добавлено: `PROXY_SETTINGS` - глобальная переменная с настройками
   - Изменено: `get_catalog()` - использует `PROXY_SETTINGS`
   - Изменено: `get_chapters_metadata_only_endpoint()` - использует `PROXY_SETTINGS`

2. **MelonService/requirements.txt**
   - Добавлено: `requests>=2.31.0`
   - Добавлено: `pysocks>=1.7.1`

3. **MelonService/Parsers/mangalib/settings.json**
   - Требуется редактирование: установить `"enable": true` и заполнить `host`, `port`

## Преимущества нового подхода

✅ **Единая конфигурация** - все настройки в одном месте (settings.json)  
✅ **Совместимость** - парсеры и API используют одинаковые настройки  
✅ **Простота** - не нужны переменные окружения в docker-compose.yml  
✅ **Гибкость** - легко переключать прокси для разных парсеров  
✅ **Авторизация** - поддержка login/password из коробки  

## Следующие шаги

- [ ] Настроить прокси в `settings.json`
- [ ] Обновить код на сервере (git pull или scp)
- [ ] Пересобрать: `docker-compose build melon-service`
- [ ] Перезапустить: `docker-compose up -d melon-service`
- [ ] Проверить логи: "✅ Proxy configured and ready to use"
- [ ] Протестировать: `curl /catalog/1`
- [ ] Запустить автопарсинг

## Альтернативные решения (если прокси не подходит)

1. **Парсинг HTML** вместо API
2. **Selenium/Playwright** с headless браузером
3. **Cloudflare Workers** как прокси
4. **VPN** на сервере

Но **прокси - самое простое решение** для обхода блокировки IP.

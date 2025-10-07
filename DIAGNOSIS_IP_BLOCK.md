# Диагностика 403 Forbidden на сервере

## Проблема
API работает **с локального компьютера**, но **НЕ работает с сервера** - это блокировка IP дата-центра.

## Тест 1: Проверка с сервера (простой curl)

На сервере выполните:

```bash
curl -v \
  -H "Site-Id: 1" \
  -H "User-Agent: Mozilla/5.0" \
  "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&page=1"
```

**Если получите 403** → Подтверждение блокировки IP

## Тест 2: Проверка с полными заголовками

```bash
curl -v \
  -H "Site-Id: 1" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: ru-RU,ru;q=0.9" \
  -H "Origin: https://mangalib.me" \
  -H "Referer: https://mangalib.me/manga-list" \
  "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&page=1"
```

**Если все еще 403** → Блокировка IP, заголовки не помогут

## Решение 1: Прокси-сервер (РЕКОМЕНДУЕТСЯ)

### Вариант A: Бесплатный прокси (ненадежно)

1. Найдите бесплатный SOCKS5/HTTP прокси
2. Настройте в Python:

```python
proxies = {
    'http': 'socks5://proxy-server:port',
    'https': 'socks5://proxy-server:port'
}
response = requests.get(url, headers=headers, proxies=proxies)
```

### Вариант B: Платный residential прокси (надежно)

Сервисы:
- **BrightData** (ex-Luminati) - ~$500/мес
- **Smartproxy** - ~$75/мес
- **Oxylabs** - ~$300/мес
- **ProxyRack** - ~$50/мес (дешевле)

### Вариант C: Свой VPN/прокси через обычный ISP

1. Арендовать VPS у **обычного ISP** (не дата-центр):
   - **Linode** (обычные IP)
   - **DigitalOcean** в некоторых регионах
   - Или домашний компьютер с белым IP

2. Настроить SOCKS5 прокси:

```bash
# На VPS с обычным IP
ssh -D 1080 user@your-vps-ip
```

3. Использовать в Python:
```python
proxies = {
    'http': 'socks5://your-vps-ip:1080',
    'https': 'socks5://your-vps-ip:1080'
}
```

## Решение 2: Изменение кода для прокси

### В api_server.py добавить поддержку прокси:

```python
import os

# В начале файла
PROXY_ENABLED = os.getenv("PROXY_ENABLED", "false").lower() == "true"
PROXY_URL = os.getenv("PROXY_URL", None)  # Например: socks5://proxy-server:1080

# В get_catalog()
proxies = None
if PROXY_ENABLED and PROXY_URL:
    proxies = {
        'http': PROXY_URL,
        'https': PROXY_URL
    }
    logger.info(f"Using proxy: {PROXY_URL}")

response = requests.get(api_url, headers=headers, proxies=proxies, timeout=30)
```

### В docker-compose.yml:

```yaml
melon-service:
  environment:
    - PROXY_ENABLED=true
    - PROXY_URL=socks5://your-proxy:1080
```

## Решение 3: Туннелирование через локальный компьютер

### Если API работает с вашего компьютера:

1. На вашем компьютере запустить прокси:

```bash
# Windows (PowerShell)
ssh -R 8888:localhost:8888 user@server-ip

# Или использовать ngrok
ngrok tcp 8888
```

2. На сервере использовать этот туннель как прокси

## Решение 4: Cloudflare bypass (если это Cloudflare)

Проверьте response headers на наличие `cf-ray`:

```bash
curl -I "https://api.cdnlibs.org/api/manga"
```

Если есть Cloudflare, используйте:

```python
pip install cloudscraper

import cloudscraper
scraper = cloudscraper.create_scraper()
response = scraper.get(api_url, headers=headers)
```

## Быстрое решение для теста

### Прокси через ваш компьютер (временно):

1. **На вашем Windows компьютере** установите прокси-сервер:

```powershell
# Установить tinyproxy или использовать SSH туннель
ssh -D 1080 -N -f user@localhost
```

2. **Пробросить порт на сервер:**

Используйте SSH reverse tunnel или ngrok

3. **Настроить в api_server.py:**

```python
proxies = {
    'http': 'socks5://your-home-ip:1080',
    'https': 'socks5://your-home-ip:1080'
}
```

## Рекомендация

**Для продакшена:**
- Арендовать **residential proxy** (ProxyRack ~$50/мес)
- Или VPS у обычного ISP, не дата-центра

**Для теста:**
- Использовать ваш компьютер как прокси
- Или найти бесплатный SOCKS5 прокси (ненадежно)

## Проверка прокси

После настройки проверьте:

```python
import requests

proxies = {
    'http': 'socks5://proxy:port',
    'https': 'socks5://proxy:port'
}

# Проверка IP
response = requests.get('https://api.ipify.org?format=json', proxies=proxies)
print(f"Your IP: {response.json()['ip']}")

# Проверка MangaLib API
response = requests.get(
    'https://api.cdnlibs.org/api/manga?fields[]=rate_avg&page=1',
    headers={'Site-Id': '1'},
    proxies=proxies
)
print(f"Status: {response.status_code}")
```

## Альтернатива: Парсинг HTML вместо API

Если прокси не вариант, можно парсить HTML страницы:

```python
# Вместо API запроса
response = requests.get('https://mangalib.me/manga-list?page=1')
# Парсить HTML через BeautifulSoup
```

Но это **медленнее** и **менее надежно**.

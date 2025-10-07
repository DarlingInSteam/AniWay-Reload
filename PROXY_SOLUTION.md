# Решение: Блокировка IP дата-центра MangaLib API

## Диагноз подтвержден

✅ **С локального компьютера API работает** (даже с простыми заголовками)  
❌ **С сервера (Compute Engine) API возвращает 403** - это блокировка IP дата-центра

## Что сделано

### 1. Добавлена поддержка прокси в api_server.py ✅

**Изменения:**

1. **Конфигурация прокси** (строки 27-46):
   ```python
   PROXY_ENABLED = os.getenv("PROXY_ENABLED", "false").lower() == "true"
   PROXY_URL = os.getenv("PROXY_URL", None)
   
   def get_proxies():
       if PROXY_ENABLED and PROXY_URL:
           return {'http': PROXY_URL, 'https': PROXY_URL}
       return None
   ```

2. **Использование в get_catalog()** (строка ~930):
   ```python
   proxies = get_proxies()
   response = requests.get(api_url, headers=headers, proxies=proxies, timeout=30)
   ```

3. **Использование в get_chapters_metadata_only_endpoint()** (строка ~1010):
   ```python
   proxies = get_proxies()
   response = requests.get(api_url, headers=headers, proxies=proxies, timeout=30)
   ```

### 2. Обновлен requirements.txt ✅

Добавлены:
- `requests>=2.31.0`
- `pysocks>=1.7.1` (для SOCKS proxy)

## Варианты решения

### Вариант 1: Использовать ваш компьютер как прокси (БЫСТРО, БЕСПЛАТНО)

#### Шаг 1: На вашем Windows компьютере

Установите SSH туннель:

```powershell
# Вариант A: SSH туннель (если есть SSH сервер на компьютере)
ssh -D 1080 -N localhost

# Вариант B: Использовать готовый прокси-сервер
# Установите Privoxy или 3proxy
```

**Или используйте готовое решение - Ngrok:**

```powershell
# Скачайте https://ngrok.com/download
ngrok tcp 1080
# Получите публичный адрес типа: tcp://0.tcp.ngrok.io:12345
```

#### Шаг 2: На сервере настройте docker-compose.yml

```yaml
melon-service:
  environment:
    - PROXY_ENABLED=true
    - PROXY_URL=socks5://ваш-ip:1080  # Или ngrok адрес
```

**Проблема:** Если ваш компьютер выключен - прокси не работает.

---

### Вариант 2: Платный residential proxy (НАДЕЖНО)

#### ProxyRack (~$50/месяц, самый дешевый)

1. Зарегистрируйтесь на https://www.proxyrack.com/
2. Получите данные прокси
3. Настройте docker-compose.yml:

```yaml
melon-service:
  environment:
    - PROXY_ENABLED=true
    - PROXY_URL=http://username:password@proxy.proxyrack.com:10000
```

#### Другие провайдеры:

- **Smartproxy** - $75/мес
- **BrightData** - $500/мес (очень надежный)
- **Oxylabs** - $300/мес

---

### Вариант 3: VPS с обычным ISP IP (СРЕДНЕ)

Арендовать **второй VPS** у провайдера с **обычными IP** (не дата-центр):

1. **Linode** - обычные IP адреса
2. **Vultr** - некоторые локации
3. **Hetzner** - могут работать

На VPS установить SOCKS5 прокси:

```bash
# Установить dante-server (SOCKS5)
apt-get install dante-server

# Настроить /etc/danted.conf
# Запустить: systemctl start danted
```

Использовать как прокси на основном сервере.

---

### Вариант 4: Cloudflare Worker (БЕСПЛАТНО, экспериментально)

Создать Cloudflare Worker, который будет проксировать запросы к MangaLib API:

```javascript
// worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const apiUrl = 'https://api.cdnlibs.org' + url.pathname + url.search
  
  const response = await fetch(apiUrl, {
    headers: {
      'Site-Id': request.headers.get('Site-Id') || '1',
      // ... другие заголовки
    }
  })
  
  return response
}
```

Деплоить на Cloudflare Workers (бесплатно до 100k запросов/день).

## Рекомендация

**Для продакшена:** Вариант 2 (ProxyRack) - надежно, недорого  
**Для теста:** Вариант 1 (ваш компьютер) - быстро, бесплатно  
**Альтернатива:** Вариант 3 (VPS с обычным IP) - если нужна стабильность

## Инструкция по развертыванию (Вариант 1 - ваш компьютер)

### 1. На вашем Windows компьютере

Установите простой SOCKS5 прокси:

```powershell
# Вариант A: Использовать SSH (если установлен OpenSSH)
# Проверка: Get-Service sshd
ssh -D 0.0.0.0:1080 -N localhost

# Вариант B: Использовать microsocks (легче)
# Скачать: https://github.com/rofl0r/microsocks/releases
microsocks.exe -i 0.0.0.0 -p 1080
```

Откройте порт 1080 в firewall:

```powershell
New-NetFirewallRule -DisplayName "SOCKS Proxy" -Direction Inbound -LocalPort 1080 -Protocol TCP -Action Allow
```

Узнайте ваш внешний IP:

```powershell
(Invoke-WebRequest -Uri "https://api.ipify.org").Content
# Или curl https://api.ipify.org
```

### 2. На сервере

Обновите код:

```bash
cd /root/AniWay-Reload
git pull  # Или скопируйте файлы

# Отредактируйте docker-compose.yml
nano docker-compose.yml
```

Добавьте в секцию `melon-service`:

```yaml
melon-service:
  # ... остальные настройки
  environment:
    - PROXY_ENABLED=true
    - PROXY_URL=socks5://ваш-внешний-ip:1080
```

Пересоберите и перезапустите:

```bash
docker-compose build melon-service
docker-compose up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50
```

**Ожидаемые логи:**

```
INFO: Proxy enabled: socks5://ваш-ip:1080
INFO: Fetching catalog page 1 for mangalib, limit: 60
INFO: Using proxy for catalog request: socks5://ваш-ip:1080
INFO: Successfully fetched 60 manga slugs from page 1  ← ✅ УСПЕХ!
```

### 3. Тестирование

```bash
# Запрос каталога
curl "http://localhost:8084/catalog/1?parser=mangalib&limit=10"

# Автопарсинг
curl -X POST "http://localhost:8083/api/manga/auto-parse?page=1&limit=5"
```

## Проверка прокси

Перед использованием проверьте доступность:

```bash
# На сервере проверьте подключение к вашему прокси
telnet ваш-ip 1080

# Или curl через прокси
curl --socks5 ваш-ip:1080 https://api.ipify.org
# Должен вернуть IP вашего компьютера
```

## Альтернатива: Без прокси (парсинг HTML)

Если прокси не вариант, можно изменить подход:

1. **Парсить HTML страницы** вместо API
2. **Использовать Selenium** с headless браузером
3. **Использовать Playwright** для обхода защиты

Но это **медленнее** и **сложнее**.

## Troubleshooting

### Ошибка: "PySocks not installed"

```bash
# На сервере
docker exec aniway-reload-melon-service-1 pip install pysocks
# Или пересобрать образ
docker-compose build melon-service
```

### Ошибка: "Cannot connect to proxy"

1. Проверьте firewall на компьютере
2. Проверьте, что прокси запущен
3. Проверьте правильность IP и порта
4. Попробуйте `http://` вместо `socks5://`

### Прокси работает, но все еще 403

1. MangaLib может блокировать прокси IP
2. Попробуйте другой прокси провайдер
3. Используйте residential proxy вместо datacenter

## Измененные файлы

1. **MelonService/api_server.py**
   - Добавлена конфигурация прокси
   - Добавлена функция `get_proxies()`
   - Использование прокси в `get_catalog()`
   - Использование прокси в `get_chapters_metadata_only_endpoint()`

2. **MelonService/requirements.txt**
   - Добавлено: `requests>=2.31.0`
   - Добавлено: `pysocks>=1.7.1`

## Статус

- ✅ **Код готов** с поддержкой прокси
- ⏳ **Требуется настройка прокси** (один из вариантов выше)
- ⏳ **Пересборка контейнера** после настройки
- ⏳ **Тестирование**

## Итоговый чеклист

- [ ] Выбрать вариант прокси (1, 2, 3 или 4)
- [ ] Настроить прокси (на компьютере или арендовать)
- [ ] Обновить код на сервере (git pull)
- [ ] Настроить docker-compose.yml (PROXY_ENABLED + PROXY_URL)
- [ ] Пересобрать: `docker-compose build melon-service`
- [ ] Перезапустить: `docker-compose up -d melon-service`
- [ ] Проверить логи: должно быть "Successfully fetched X manga"
- [ ] Протестировать автопарсинг

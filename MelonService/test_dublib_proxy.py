#!/usr/bin/env python3
"""Тест прокси через dublib.WebRequestor (как в парсере)"""

import json
from pathlib import Path

# Загружаем настройки прокси
settings_path = Path(__file__).parent / "Parsers" / "mangalib" / "settings.json"

with open(settings_path, 'r', encoding='utf-8') as f:
    settings = json.load(f)

proxy_config = settings.get("proxy", {})

print("=" * 60)
print("🧪 ТЕСТ ПРОКСИ ЧЕРЕЗ DUBLIB.WEBREQUESTOR")
print("=" * 60)

print(f"\n📋 Настройки прокси:")
print(f"   enable: {proxy_config.get('enable')}")
print(f"   {proxy_config.get('login')}:***@{proxy_config.get('host')}:{proxy_config.get('port')}")

# Тест 1: Прокси в формате для requests (как в api_server.py)
print(f"\n" + "=" * 60)
print(f"📦 ТЕСТ 1: Прокси через requests (как в api_server.py)")
print("=" * 60)

if proxy_config.get('enable'):
    import requests
    
    host = proxy_config.get('host')
    port = proxy_config.get('port')
    login = proxy_config.get('login')
    password = proxy_config.get('password')
    
    if login and password:
        proxy_url = f"http://{login}:{password}@{host}:{port}"
    else:
        proxy_url = f"http://{host}:{port}"
    
    proxies = {'http': proxy_url, 'https': proxy_url}
    
    print(f"🌐 Прокси URL: {proxy_url[:30]}...")
    
    try:
        # Тест API MangaLib
        api_url = "https://api.cdnlibs.org/api/manga/sweet-home-kim-carnby-"
        headers = {
            "Site-Id": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        print(f"🔄 Запрос: GET {api_url}")
        response = requests.get(api_url, headers=headers, proxies=proxies, timeout=15)
        
        print(f"📊 Статус: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ УСПЕХ! Получены данные манги:")
            print(f"   - ID: {data['data'].get('id')}")
            print(f"   - Название: {data['data'].get('rus_name')}")
        elif response.status_code == 403:
            print(f"❌ 403 Forbidden - Прокси НЕ работает или тоже заблокирован!")
        else:
            print(f"⚠️  Неожиданный статус: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

print(f"\n" + "=" * 60)
print(f"💡 ВЫВОДЫ")
print("=" * 60)

print(f"""
Если ТЕСТ 1 показал:
  ✅ 200 OK - прокси работает в requests
  ❌ 403 Forbidden - прокси не работает ИЛИ сам прокси заблокирован

ВОЗМОЖНЫЕ ПРИЧИНЫ 403 В ПАРСЕРЕ:
  1. dublib.WebRequestor НЕ загружает прокси из settings.json
  2. Формат прокси в settings.json неправильный для dublib
  3. Прокси IP тоже заблокирован MangaLib (маловероятно)
  4. User-Agent или headers парсера отличаются от api_server.py

РЕШЕНИЕ:
  - Если requests работает (200), а парсер получает 403 →
    Проблема в dublib.WebRequestor (не использует прокси)
  
  - Если оба получают 403 →
    Прокси заблокирован, нужен другой прокси
""")

print("=" * 60)
print("✅ ТЕСТ ЗАВЕРШЕН")
print("=" * 60)

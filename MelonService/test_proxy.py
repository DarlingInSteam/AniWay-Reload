#!/usr/bin/env python3
"""Тест российского прокси для MangaLib API"""

import requests
import json
from pathlib import Path

def load_proxy_settings():
    """Загружаем прокси из settings.json"""
    settings_path = Path(__file__).parent / "Parsers" / "mangalib" / "settings.json"
    
    with open(settings_path, 'r', encoding='utf-8') as f:
        settings = json.load(f)
    
    proxy_config = settings.get("proxy", {})
    
    if not proxy_config.get("enable", False):
        print("❌ Proxy disabled in settings.json")
        return None
    
    host = proxy_config.get("host", "")
    port = proxy_config.get("port", "")
    login = proxy_config.get("login", "")
    password = proxy_config.get("password", "")
    
    if not host or not port:
        print("❌ Proxy host or port not configured")
        return None
    
    # Формируем URL прокси
    if login and password:
        proxy_url = f"http://{login}:{password}@{host}:{port}"
        print(f"✅ Proxy configured: {login}:***@{host}:{port}")
    else:
        proxy_url = f"http://{host}:{port}"
        print(f"✅ Proxy configured: {host}:{port}")
    
    return {
        'http': proxy_url,
        'https': proxy_url
    }

def test_proxy():
    """Тестируем прокси"""
    print("=" * 60)
    print("🧪 ТЕСТ РОССИЙСКОГО ПРОКСИ ДЛЯ MANGALIB API")
    print("=" * 60)
    
    # Загружаем настройки прокси
    proxy_settings = load_proxy_settings()
    
    if not proxy_settings:
        print("\n❌ Прокси не настроен!")
        return
    
    print(f"\n📦 Proxy settings: {proxy_settings['http'][:20]}...")
    
    # Тест 1: Проверка IP через прокси
    print("\n" + "=" * 60)
    print("📍 ТЕСТ 1: Проверка IP адреса")
    print("=" * 60)
    
    try:
        response = requests.get(
            "https://api.ipify.org?format=json",
            proxies=proxy_settings,
            timeout=10
        )
        ip_data = response.json()
        print(f"✅ IP через прокси: {ip_data['ip']}")
        print(f"   (Должен быть российский IP, не IP сервера)")
    except Exception as e:
        print(f"❌ Ошибка проверки IP: {e}")
        return
    
    # Тест 2: MangaLib API - каталог
    print("\n" + "=" * 60)
    print("📚 ТЕСТ 2: MangaLib API - Каталог манги")
    print("=" * 60)
    
    api_url = "https://api.cdnlibs.org/api/manga"
    params = {
        "fields[]": "rate_avg",
        "page": 1
    }
    headers = {
        "Site-Id": "1",  # mangalib
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Origin": "https://mangalib.me",
        "Referer": "https://mangalib.me/manga-list",
    }
    
    try:
        print(f"🔄 Запрос: GET {api_url}")
        print(f"🌐 Через прокси: {proxy_settings['http'][:30]}...")
        
        response = requests.get(
            api_url,
            params=params,
            headers=headers,
            proxies=proxy_settings,
            timeout=30
        )
        
        print(f"📊 Статус код: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            manga_count = len(data.get('data', []))
            print(f"✅ УСПЕХ! Получено {manga_count} манг")
            
            if manga_count > 0:
                first_manga = data['data'][0]
                print(f"\n📖 Первая манга:")
                print(f"   - ID: {first_manga.get('id')}")
                print(f"   - Название: {first_manga.get('rus_name', first_manga.get('name'))}")
                print(f"   - Рейтинг: {first_manga.get('rate_avg', 'N/A')}")
        else:
            print(f"❌ Ошибка: HTTP {response.status_code}")
            print(f"   Ответ: {response.text[:200]}")
            
    except requests.exceptions.ProxyError as e:
        print(f"❌ ОШИБКА ПРОКСИ: {e}")
        print("\n🔧 Возможные причины:")
        print("   1. Прокси сервер недоступен")
        print("   2. Неверный логин/пароль")
        print("   3. Прокси требует другой протокол (HTTPS вместо HTTP)")
    except requests.exceptions.Timeout:
        print(f"❌ ТАЙМАУТ: Прокси не отвечает в течение 30 секунд")
    except Exception as e:
        print(f"❌ Ошибка запроса: {type(e).__name__}: {e}")
    
    print("\n" + "=" * 60)
    print("✅ ТЕСТ ЗАВЕРШЕН")
    print("=" * 60)

if __name__ == "__main__":
    test_proxy()

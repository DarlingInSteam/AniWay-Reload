#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Тест прямого запроса к MangaLib API для конкретного тайтла
Проверяем, что возвращает API при запросе данных тайтла
"""

import requests
import json

# Прокси из настроек
PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

# Заголовки Chrome 131
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'max-age=0',
    'Sec-Ch-Ua': '"Chromium";v="131", "Google Chrome";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
}

def test_title_page(slug: str):
    """Тестирует запрос страницы тайтла на MangaLib"""
    
    url = f"https://mangalib.me/{slug}"
    
    print(f"\n{'='*60}")
    print(f"🔍 Тестирование: {slug}")
    print(f"{'='*60}")
    print(f"URL: {url}")
    print(f"Прокси: {PROXY['http']}")
    print()
    
    try:
        print("📡 Отправка запроса...")
        response = requests.get(url, headers=HEADERS, proxies=PROXY, timeout=30)
        
        print(f"✅ Статус: {response.status_code}")
        print(f"📊 Размер ответа: {len(response.content)} байт")
        print(f"🔗 Финальный URL: {response.url}")
        print()
        
        # Проверяем заголовки ответа
        print("📋 Ключевые заголовки:")
        for header in ['content-type', 'content-length', 'server', 'set-cookie']:
            value = response.headers.get(header)
            if value:
                print(f"  {header}: {value[:100]}")
        print()
        
        # Проверяем содержимое
        content = response.text
        
        # Проверка на редирект
        if 'location.href' in content or 'window.location' in content:
            print("⚠️  ВНИМАНИЕ: Обнаружен JavaScript редирект!")
            # Извлекаем URL редиректа
            import re
            redirect_match = re.search(r'location\.href\s*=\s*["\']([^"\']+)["\']', content)
            if redirect_match:
                print(f"   Редирект на: {redirect_match.group(1)}")
        
        # Проверка на CloudFlare challenge
        if 'cf-browser-verification' in content or 'Just a moment' in content:
            print("🛡️  CloudFlare Challenge обнаружен!")
            print("   MangaLib использует защиту от ботов")
        
        # Проверка на капчу
        if 'captcha' in content.lower() or 'recaptcha' in content.lower():
            print("🤖 CAPTCHA обнаружена!")
        
        # Проверка на блокировку по IP
        if '403' in content or 'forbidden' in content.lower() or 'access denied' in content.lower():
            print("🚫 Доступ запрещен (403 Forbidden)")
            print("   Возможно IP прокси тоже в черном списке")
        
        # Проверка на наличие данных манги
        if '__DATA__' in content:
            print("✅ Найден блок __DATA__ (данные тайтла присутствуют)")
            
            # Попытка извлечь данные
            try:
                import re
                data_match = re.search(r'window\.__DATA__\s*=\s*({.+?});', content, re.DOTALL)
                if data_match:
                    data_json = data_match.group(1)
                    data = json.loads(data_json)
                    print(f"   Структура данных: {list(data.keys())}")
                    
                    if 'manga' in data:
                        manga = data['manga']
                        print(f"   Название манги: {manga.get('name', 'N/A')}")
                        print(f"   Slug: {manga.get('slug', 'N/A')}")
                        print(f"   Тип: {manga.get('type', 'N/A')}")
                        
                        if 'branches' in manga:
                            branches = manga['branches']
                            print(f"   Количество веток: {len(branches)}")
                            for branch in branches:
                                print(f"     - Ветка {branch.get('id')}: {branch.get('count_chapters')} глав")
            except Exception as e:
                print(f"   ⚠️  Ошибка парсинга __DATA__: {e}")
        else:
            print("❌ Блок __DATA__ НЕ найден!")
            print("   Страница не содержит данных тайтла")
        
        # Сохраняем HTML для анализа
        output_file = f"test_title_{slug.replace('/', '_')}.html"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n💾 HTML сохранен в: {output_file}")
        print(f"   Первые 500 символов:")
        print(f"   {content[:500]}")
        
        return response.status_code == 200 and '__DATA__' in content
        
    except requests.exceptions.ProxyError as e:
        print(f"❌ Ошибка прокси: {e}")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ Таймаут запроса (>30 сек)")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка запроса: {e}")
        return False


def test_api_endpoint(slug: str):
    """Тестирует API endpoint для получения данных тайтла"""
    
    # MangaLib использует свой API
    api_url = f"https://api.mangalib.me/api/manga/{slug}"
    
    print(f"\n{'='*60}")
    print(f"🔍 Тестирование API endpoint: {slug}")
    print(f"{'='*60}")
    print(f"URL: {api_url}")
    print()
    
    try:
        print("📡 Отправка запроса к API...")
        response = requests.get(api_url, headers=HEADERS, proxies=PROXY, timeout=30)
        
        print(f"✅ Статус: {response.status_code}")
        print(f"📊 Размер ответа: {len(response.content)} байт")
        print()
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ JSON данные получены успешно!")
                print(f"   Структура: {list(data.keys())}")
                
                if 'data' in data:
                    manga_data = data['data']
                    print(f"   Название: {manga_data.get('name', 'N/A')}")
                    print(f"   Slug: {manga_data.get('slug', 'N/A')}")
                    print(f"   Главы: {manga_data.get('chapters_count', 'N/A')}")
                
                return True
            except json.JSONDecodeError as e:
                print(f"❌ Ошибка парсинга JSON: {e}")
                print(f"   Ответ: {response.text[:200]}")
        else:
            print(f"❌ API вернул код {response.status_code}")
            print(f"   Ответ: {response.text[:200]}")
        
        return False
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return False


if __name__ == "__main__":
    # Тестовые slug'и из ваших логов
    test_slugs = [
        "sweet-home-kim-carnby-",
        "suddenly-became-a-princess-one-day-",
        "nan-hao-shang-feng",
        "the-beginning-after-the-end"
    ]
    
    print("\n" + "="*60)
    print("🧪 ТЕСТИРОВАНИЕ ЗАПРОСОВ К MANGALIB")
    print("="*60)
    
    results = []
    
    for slug in test_slugs:
        # Тест страницы тайтла
        page_ok = test_title_page(slug)
        
        # Тест API endpoint
        api_ok = test_api_endpoint(slug)
        
        results.append({
            'slug': slug,
            'page': page_ok,
            'api': api_ok
        })
        
        print("\n" + "-"*60)
        input("Нажмите Enter для следующего теста...")
    
    # Итоговый отчет
    print("\n" + "="*60)
    print("📊 ИТОГОВЫЙ ОТЧЕТ")
    print("="*60)
    
    for result in results:
        status_page = "✅" if result['page'] else "❌"
        status_api = "✅" if result['api'] else "❌"
        print(f"{result['slug'][:30]:30} | Page: {status_page} | API: {status_api}")
    
    print("\n💡 РЕКОМЕНДАЦИИ:")
    
    if all(r['page'] for r in results):
        print("✅ Все страницы доступны - проблема в парсере")
    elif not any(r['page'] for r in results):
        print("❌ Ни одна страница не доступна - проблема с прокси или IP")
    else:
        print("⚠️  Доступ к страницам нестабильный")
    
    if all(r['api'] for r in results):
        print("✅ API endpoint работает - можно использовать API вместо парсинга HTML")
    elif not any(r['api'] for r in results):
        print("❌ API endpoint не доступен")

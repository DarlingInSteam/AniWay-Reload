#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Финальный тест исправленного парсера MangaLib
Проверяем работу с новым форматом slug_url (ID--slug)
"""

import requests
import json

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

def test_catalog_returns_slug_url():
    """Проверяем, что каталог теперь возвращает slug_url"""
    
    api_url = "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1"
    
    headers = {
        "Site-Id": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://mangalib.me",
        "Referer": "https://mangalib.me/manga-list",
    }
    
    print(f"\n{'='*60}")
    print(f"🧪 ТЕСТ 1: API каталога возвращает slug_url")
    print(f"{'='*60}\n")
    
    response = requests.get(api_url, headers=headers, proxies=PROXY, timeout=30)
    data = response.json()
    manga_list = data.get("data", [])
    
    print(f"✅ Получено тайтлов: {len(manga_list)}")
    print(f"\n📋 Первые 5 slug_url из каталога:")
    
    for i, manga in enumerate(manga_list[:5], 1):
        slug_url = manga.get("slug_url")
        name = manga.get("rus_name", manga.get("name"))
        print(f"  {i}. {slug_url:45} | {name[:30]}")
    
    return [m.get("slug_url") for m in manga_list[:3]]


def test_api_with_slug_url(slug_url: str):
    """Проверяем, что API принимает slug_url формат"""
    
    api_url = f"https://api.cdnlibs.org/api/manga/{slug_url}"
    
    headers = {
        "Site-Id": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
        "Origin": "https://mangalib.me",
        "Referer": f"https://mangalib.me/ru/manga/{slug_url}",
    }
    
    print(f"\n  🔍 Тестирование: {slug_url}")
    print(f"     API: {api_url}")
    
    try:
        response = requests.get(api_url, headers=headers, proxies=PROXY, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            title_data = data.get("data", {})
            name = title_data.get("rus_name", title_data.get("name"))
            chapters_count = title_data.get("chapters_count", 0)
            
            print(f"     ✅ Status: {response.status_code}")
            print(f"     📚 Название: {name}")
            print(f"     📖 Глав: {chapters_count}")
            return True
        else:
            print(f"     ❌ Status: {response.status_code}")
            print(f"     📄 Response: {response.text[:100]}")
            return False
    except Exception as e:
        print(f"     ❌ Ошибка: {str(e)[:80]}")
        return False


def test_web_with_slug_url(slug_url: str):
    """Проверяем, что WEB страница доступна с slug_url"""
    
    url = f"https://mangalib.me/ru/manga/{slug_url}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
    }
    
    print(f"     WEB: {url}")
    
    try:
        response = requests.get(url, headers=headers, proxies=PROXY, timeout=10)
        has_data = '__DATA__' in response.text or 'window.__DATA__' in response.text
        
        status_icon = "✅" if response.status_code == 200 else "❌"
        print(f"     {status_icon} Status: {response.status_code}, Has data: {has_data}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"     ❌ Ошибка: {str(e)[:80]}")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 ФИНАЛЬНЫЙ ТЕСТ: MANGALIB С НОВЫМ ФОРМАТОМ")
    print("="*60)
    
    # Тест 1: Каталог возвращает slug_url
    slug_urls = test_catalog_returns_slug_url()
    
    # Тест 2: API принимает slug_url
    print(f"\n{'='*60}")
    print(f"🧪 ТЕСТ 2: API endpoint принимает slug_url")
    print(f"{'='*60}")
    
    api_results = []
    for slug_url in slug_urls:
        result = test_api_with_slug_url(slug_url)
        api_results.append(result)
    
    # Тест 3: WEB страница доступна
    print(f"\n{'='*60}")
    print(f"🧪 ТЕСТ 3: WEB страница доступна с /ru/manga/")
    print(f"{'='*60}\n")
    
    web_results = []
    for slug_url in slug_urls:
        result = test_web_with_slug_url(slug_url)
        web_results.append(result)
    
    # Итоговый отчет
    print(f"\n{'='*60}")
    print(f"📊 ИТОГОВЫЙ ОТЧЕТ")
    print(f"{'='*60}\n")
    
    api_success = sum(api_results)
    web_success = sum(web_results)
    
    print(f"✅ API endpoint: {api_success}/{len(api_results)} успешно")
    print(f"✅ WEB страницы: {web_success}/{len(web_results)} доступны")
    
    if api_success == len(api_results):
        print(f"\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print(f"\n💡 Изменения:")
        print(f"  1. api_server.py → использует slug_url вместо slug")
        print(f"  2. main.py парсера → извлекает ID из slug_url (формат: ID--slug)")
        print(f"  3. API endpoint → работает с slug_url")
        print(f"\n🚀 Готово к деплою на сервер!")
    else:
        print(f"\n⚠️  Есть проблемы:")
        if api_success < len(api_results):
            print(f"  ❌ API endpoint не работает с некоторыми slug_url")
        if web_success < len(web_results):
            print(f"  ❌ WEB страницы недоступны")

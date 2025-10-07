#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Тест API MangaLib (api.cdnlibs.org) - проверка slug'ов и данных тайтлов
"""

import requests
import json

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

def test_catalog_api():
    """Тестирует API каталога"""
    
    api_url = "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1"
    
    headers = {
        "Site-Id": "1",  # 1 = mangalib
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Origin": "https://mangalib.me",
        "Referer": "https://mangalib.me/manga-list",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"'
    }
    
    print(f"\n{'='*60}")
    print(f"🔍 Тестирование API каталога MangaLib")
    print(f"{'='*60}")
    print(f"URL: {api_url}")
    print(f"Прокси: {PROXY['http']}")
    print()
    
    try:
        response = requests.get(api_url, headers=headers, proxies=PROXY, timeout=30)
        
        print(f"✅ Статус: {response.status_code}")
        print(f"📊 Размер: {len(response.content)} байт")
        print()
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"📋 Структура ответа: {list(data.keys())}")
            
            manga_list = data.get("data", [])
            print(f"✅ Получено манги: {len(manga_list)}")
            print()
            
            # Показываем первые 10 slug'ов
            print("📚 Первые 10 slug'ов из каталога:")
            for i, manga in enumerate(manga_list[:10], 1):
                slug = manga.get("slug", "NO SLUG")
                name = manga.get("name", manga.get("rus_name", "NO NAME"))
                print(f"  {i:2}. {slug:40} | {name[:40]}")
            
            # Тестируем первые 3 slug'а
            print(f"\n{'='*60}")
            print("🧪 Проверка доступности тайтлов по slug'ам")
            print(f"{'='*60}")
            
            for manga in manga_list[:3]:
                slug = manga.get("slug")
                if slug:
                    test_title_by_slug(slug)
                    print()
            
            return manga_list[:5]  # Возвращаем первые 5 для дальнейшего тестирования
        
        else:
            print(f"❌ API вернул код {response.status_code}")
            print(f"Ответ: {response.text[:500]}")
            return []
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return []


def test_title_by_slug(slug: str):
    """Тестирует получение данных тайтла по slug через web и API"""
    
    print(f"\n  🔍 Тестирование slug: {slug}")
    
    # 1. Проверка WEB страницы
    web_url = f"https://mangalib.me/{slug}"
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        r = requests.get(web_url, headers=headers, proxies=PROXY, timeout=10)
        has_data = '__DATA__' in r.text
        web_status = "✅" if (r.status_code == 200 and has_data) else "❌"
        print(f"    WEB: {web_status} {web_url} - {r.status_code} - DATA: {has_data}")
    except Exception as e:
        print(f"    WEB: ❌ {web_url} - ERROR: {str(e)[:50]}")
    
    # 2. Проверка API endpoint
    api_url = f"https://api.cdnlibs.org/api/manga/{slug}"
    try:
        headers = {
            "Site-Id": "1",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Origin": "https://mangalib.me",
            "Referer": f"https://mangalib.me/{slug}",
        }
        r = requests.get(api_url, headers=headers, proxies=PROXY, timeout=10)
        if r.status_code == 200:
            data = r.json()
            title_data = data.get("data", {})
            name = title_data.get("name", title_data.get("rus_name", "NO NAME"))
            api_status = "✅"
            print(f"    API: {api_status} {api_url} - {r.status_code} - Название: {name[:40]}")
        else:
            print(f"    API: ❌ {api_url} - {r.status_code}")
    except Exception as e:
        print(f"    API: ❌ {api_url} - ERROR: {str(e)[:50]}")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🧪 ТЕСТИРОВАНИЕ API MANGALIB (api.cdnlibs.org)")
    print("="*60)
    
    # Тестируем каталог
    manga_list = test_catalog_api()
    
    print(f"\n{'='*60}")
    print("✅ ТЕСТ ЗАВЕРШЕН")
    print(f"{'='*60}")
    
    if manga_list:
        print(f"\n💡 Каталог работает, получено {len(manga_list)} тайтлов")
        print("📌 Проблема скорее всего в парсере - он не может получить данные тайтла")
        print("\n🔧 Возможные причины:")
        print("  1. Парсер использует устаревший URL или API endpoint")
        print("  2. MangaLib изменил структуру страницы (__DATA__)")
        print("  3. Требуется JavaScript для загрузки данных")
        print("  4. Прокси блокируется на уровне парсера")
    else:
        print("\n❌ Каталог не работает - проблема с прокси или API")

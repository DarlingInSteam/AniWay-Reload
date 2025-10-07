#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Тест каталога MangaLib - проверка правильных slug'ов
"""

import requests
import json
import re

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.9',
}

def check_catalog_page():
    """Проверяет главную страницу каталога"""
    
    url = "https://mangalib.me/"
    
    print(f"\n{'='*60}")
    print(f"🔍 Проверка главной страницы MangaLib")
    print(f"{'='*60}")
    print(f"URL: {url}")
    print()
    
    try:
        response = requests.get(url, headers=HEADERS, proxies=PROXY, timeout=30)
        
        print(f"✅ Статус: {response.status_code}")
        print(f"📊 Размер: {len(response.content)} байт")
        print()
        
        if response.status_code == 200:
            html = response.text
            
            # Ищем ссылки на мангу
            manga_links = re.findall(r'href="/([\w\-]+)"', html)
            
            # Фильтруем служебные страницы
            excluded = {'login', 'register', 'restore-password', 'ru', 'bookmarks', 'search'}
            manga_slugs = [s for s in set(manga_links) if s not in excluded and not s.startswith('manga-')]
            
            print(f"✅ Найдено уникальных slug'ов: {len(manga_slugs)}")
            print("\n📋 Первые 20 slug'ов:")
            for i, slug in enumerate(manga_slugs[:20], 1):
                print(f"  {i:2}. {slug}")
            
            # Проверим несколько slug'ов
            print(f"\n{'='*60}")
            print("🧪 Тестирование первых 5 slug'ов")
            print(f"{'='*60}")
            
            for slug in manga_slugs[:5]:
                test_url = f"https://mangalib.me/{slug}"
                try:
                    r = requests.get(test_url, headers=HEADERS, proxies=PROXY, timeout=10)
                    has_data = '__DATA__' in r.text
                    status_icon = "✅" if has_data else "❌"
                    print(f"{status_icon} {slug:40} - {r.status_code} - DATA: {has_data}")
                except Exception as e:
                    print(f"❌ {slug:40} - ERROR: {e}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")


def check_api_catalog():
    """Проверяет API каталога"""
    
    # Попробуем несколько возможных вариантов API
    api_urls = [
        "https://api.mangalib.me/api/manga",
        "https://api.mangalib.me/api/manga?page=1",
        "https://api.mangalib.me/api/manga?page=1&count=10",
        "https://mangalib.me/manga-list?page=1",
    ]
    
    print(f"\n{'='*60}")
    print(f"🔍 Проверка API endpoints")
    print(f"{'='*60}")
    
    for url in api_urls:
        print(f"\nПроверка: {url}")
        try:
            response = requests.get(url, headers=HEADERS, proxies=PROXY, timeout=10)
            print(f"  Статус: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"  ✅ JSON: {list(data.keys())[:5]}")
                    
                    # Попробуем найти список манги
                    if 'data' in data:
                        items = data['data']
                        if isinstance(items, list) and len(items) > 0:
                            first = items[0]
                            print(f"  📋 Первый тайтл: {first.get('slug', first.get('id', 'NO SLUG'))}")
                except:
                    print(f"  📄 HTML: {len(response.text)} байт")
        except Exception as e:
            print(f"  ❌ Ошибка: {e}")


if __name__ == "__main__":
    check_catalog_page()
    check_api_catalog()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Анализ полной структуры ответа API MangaLib
Ищем правильные поля для URL тайтлов
"""

import requests
import json

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

def analyze_api_response():
    """Полный анализ ответа API"""
    
    api_url = "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1"
    
    headers = {
        "Site-Id": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://mangalib.me",
        "Referer": "https://mangalib.me/manga-list",
    }
    
    response = requests.get(api_url, headers=headers, proxies=PROXY, timeout=30)
    data = response.json()
    
    manga_list = data.get("data", [])
    
    print(f"\n{'='*80}")
    print(f"📊 ПОЛНАЯ СТРУКТУРА ПЕРВОГО ТАЙТЛА")
    print(f"{'='*80}\n")
    
    if manga_list:
        first_manga = manga_list[0]
        
        # Выводим ВСЕ поля
        print(json.dumps(first_manga, indent=2, ensure_ascii=False))
        
        print(f"\n{'='*80}")
        print(f"🔍 ПОИСК URL/SLUG ПОЛЕЙ")
        print(f"{'='*80}\n")
        
        # Ищем все поля, которые могут быть URL/slug
        for key, value in first_manga.items():
            if any(keyword in key.lower() for keyword in ['slug', 'url', 'link', 'href', 'path']):
                print(f"  {key:25} = {value}")
        
        print(f"\n{'='*80}")
        print(f"🧪 ТЕСТИРОВАНИЕ ВОЗМОЖНЫХ SLUG'ОВ")
        print(f"{'='*80}\n")
        
        # Тестируем все возможные варианты slug
        possible_slugs = {}
        for key, value in first_manga.items():
            if isinstance(value, str) and not key.startswith('img') and len(value) > 3:
                if '-' in value or '_' in value:  # Похоже на slug
                    possible_slugs[key] = value
        
        print(f"Найдено возможных slug полей: {len(possible_slugs)}")
        for key, value in possible_slugs.items():
            print(f"  {key:25} = {value}")
            test_slug_on_web(value, key)
        
        # Проверяем ID
        if 'id' in first_manga:
            print(f"\n  🔍 Проверка по ID: {first_manga['id']}")
            test_slug_on_web(str(first_manga['id']), 'id')
    
    print(f"\n{'='*80}")
    print(f"📋 АНАЛИЗ ВСЕХ ТАЙТЛОВ (первые 10)")
    print(f"{'='*80}\n")
    
    for i, manga in enumerate(manga_list[:10], 1):
        print(f"\n{i}. {manga.get('name', 'NO NAME')}")
        
        # Показываем все slug/url поля
        slug_fields = {}
        for key in ['slug', 'slug_url', 'eng_name', 'id', 'href', 'link']:
            if key in manga:
                slug_fields[key] = manga[key]
        
        for key, value in slug_fields.items():
            print(f"   {key:15} = {value}")


def test_slug_on_web(slug: str, field_name: str):
    """Быстрая проверка slug на web"""
    
    url = f"https://mangalib.me/{slug}"
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        r = requests.get(url, headers=headers, proxies=PROXY, timeout=5, allow_redirects=True)
        has_data = '__DATA__' in r.text
        
        status = "✅ FOUND" if (r.status_code == 200 and has_data) else f"❌ {r.status_code}"
        print(f"    → {field_name:20} | {url[:60]:60} | {status}")
        
        if r.status_code == 200 and has_data:
            print(f"       ⭐ ПРАВИЛЬНЫЙ SLUG НАЙДЕН: {field_name} = {slug}")
            return True
    except:
        pass
    
    return False


if __name__ == "__main__":
    analyze_api_response()

import requests
import json

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

# Тестируем API с правильным slug_url
slug_url = "7580--i-alone-level-up"  # Формат из API каталога

api_url = f"https://api.lib.social/api/manga/{slug_url}?fields[]=summary&fields[]=genres&fields[]=tags&fields[]=teams&fields[]=authors&fields[]=publisher&fields[]=userBookmark&fields[]=manga_status_id&fields[]=status_id&fields[]=scanlate_status&fields[]=artists&fields[]=bookmarkButton"

headers = {
    "Site-Id": "1",  # 1 = mangalib
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9",
    "Origin": "https://mangalib.org",
    "Referer": f"https://mangalib.org/ru/manga/{slug_url}",
}

print(f"\n{'='*70}")
print(f"🔍 Тестирование API для получения данных тайтла")
print(f"{'='*70}")
print(f"URL: {api_url}")
print(f"Slug: {slug_url}")
print()

try:
    response = requests.get(api_url, headers=headers, proxies=PROXY, timeout=30)
    
    print(f"✅ Status: {response.status_code}")
    print(f"📊 Size: {len(response.content)} bytes")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print(f"📋 Response structure: {list(data.keys())}")
        
        if 'data' in data:
            manga = data['data']
            print(f"\n✅ Данные манги получены!")
            print(f"   ID: {manga.get('id')}")
            print(f"   Название: {manga.get('name')}")
            print(f"   Русское: {manga.get('rus_name')}")
            print(f"   Slug: {manga.get('slug')}")
            print(f"   Slug URL: {manga.get('slug_url')}")
            print(f"   Тип: {manga.get('type', {}).get('label')}")
            print(f"   Статус: {manga.get('status', {}).get('label')}")
            
            if 'branches' in manga:
                branches = manga['branches']
                print(f"   Веток: {len(branches)}")
                for branch in branches:
                    print(f"     - Ветка {branch.get('id')}: {branch.get('count_chapters')} глав")
            
            print(f"\n⭐ API РАБОТАЕТ! Можно получать данные через API")
    else:
        print(f"❌ API returned {response.status_code}")
        print(f"Response: {response.text[:200]}")

except Exception as e:
    print(f"❌ Error: {e}")

print(f"\n{'='*70}")
print(f"📌 ВЫВОД")
print(f"{'='*70}")
print(f"\nMangaLib изменил структуру:")
print(f"  1. Домен: .me → .org")
print(f"  2. URL формат: https://mangalib.org/ru/manga/{{ID}}--{{slug}}")
print(f"  3. API endpoint: https://api.lib.social/api/manga/{{slug_url}}")
print(f"  4. Slug формат из каталога: slug_url вместо slug")
print(f"\n🔧 Нужно обновить парсер:")
print(f"  - Использовать slug_url из каталога (7580--i-alone-level-up)")
print(f"  - Изменить домен на .org")
print(f"  - Добавить префикс /ru/manga/")

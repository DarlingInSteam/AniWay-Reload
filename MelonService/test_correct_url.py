import requests

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

# Тестируем правильный формат URL
test_cases = [
    ("СТАРЫЙ .me БЕЗ префикса", "https://mangalib.me/i-alone-level-up"),
    ("СТАРЫЙ .me С ID", "https://mangalib.me/7580--i-alone-level-up"),
    ("НОВЫЙ .org С /ru/manga/", "https://mangalib.org/ru/manga/7580--i-alone-level-up"),
]

for name, url in test_cases:
    print(f"\n{'='*70}")
    print(f"🧪 {name}")
    print(f"{'='*70}")
    print(f"URL: {url}")
    
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, proxies=PROXY, timeout=10, allow_redirects=True)
        has_data = '__DATA__' in r.text
        
        print(f"✅ Status: {r.status_code}")
        print(f"🔗 Final URL: {r.url}")
        print(f"📦 Has __DATA__: {has_data}")
        
        if has_data:
            print(f"\n⭐⭐⭐ ПРАВИЛЬНЫЙ URL НАЙДЕН! ⭐⭐⭐")
            
            # Извлекаем название манги
            import re
            data_match = re.search(r'window\.__DATA__\s*=\s*({.+?});', r.text, re.DOTALL)
            if data_match:
                import json
                data = json.loads(data_match.group(1))
                if 'manga' in data:
                    manga = data['manga']
                    print(f"\n📚 Данные манги:")
                    print(f"   Название: {manga.get('name', 'N/A')}")
                    print(f"   Русское: {manga.get('rus_name', 'N/A')}")
                    print(f"   Slug: {manga.get('slug', 'N/A')}")
                    print(f"   ID: {manga.get('id', 'N/A')}")
                    
                    if 'branches' in manga:
                        branches = manga['branches']
                        print(f"   Веток: {len(branches)}")
                        for branch in branches:
                            print(f"     - Ветка {branch.get('id')}: {branch.get('count_chapters')} глав")
        else:
            print(f"\n❌ __DATA__ не найден")
            
    except Exception as e:
        print(f"❌ Ошибка: {e}")

print(f"\n{'='*70}")
print(f"📊 ИТОГ")
print(f"{'='*70}")
print(f"\n✅ Правильный формат URL:")
print(f"   https://mangalib.org/ru/manga/{{ID}}--{{slug}}")
print(f"\nПример:")
print(f"   https://mangalib.org/ru/manga/7580--i-alone-level-up")

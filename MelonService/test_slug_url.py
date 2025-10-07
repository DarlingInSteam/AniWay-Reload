import requests

PROXY = {
    'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000',
    'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'
}

test_urls = [
    "7580--i-alone-level-up",  # slug_url
    "i-alone-level-up",        # slug
]

for slug in test_urls:
    url = f"https://mangalib.me/{slug}"
    print(f"\n🔍 Тестирование: {slug}")
    try:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, proxies=PROXY, timeout=10)
        has_data = '__DATA__' in r.text
        print(f"   Status: {r.status_code}")
        print(f"   Has __DATA__: {has_data}")
        print(f"   Final URL: {r.url}")
        
        if has_data:
            print(f"   ✅ РАБОТАЕТ!")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")

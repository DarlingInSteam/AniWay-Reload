import requests

# Тест 1: Простые заголовки (как было)
print("=== TEST 1: Simple headers (old) ===")
headers_old = {
    "Site-Id": "1",
    "User-Agent": "Mozilla/5.0"
}
try:
    response = requests.get(
        "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1",
        headers=headers_old,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Success! Got {len(response.json().get('data', []))} manga")
    else:
        print(f"Error: {response.text[:200]}")
except Exception as e:
    print(f"Exception: {e}")

print("\n" + "="*50 + "\n")

# Тест 2: Полные заголовки (новые)
print("=== TEST 2: Full headers (new) ===")
headers_new = {
    "Site-Id": "1",
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
try:
    response = requests.get(
        "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1",
        headers=headers_new,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        manga_list = data.get('data', [])
        print(f"Success! Got {len(manga_list)} manga")
        if manga_list:
            print(f"First manga slug: {manga_list[0].get('slug', 'N/A')}")
    else:
        print(f"Error: {response.text[:200]}")
except Exception as e:
    print(f"Exception: {e}")

print("\n" + "="*50 + "\n")

# Тест 3: Браузерные заголовки из DevTools
print("=== TEST 3: Real browser headers ===")
headers_browser = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "site-id": "1",
    "Referer": "https://mangalib.me/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}
try:
    response = requests.get(
        "https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1",
        headers=headers_browser,
        timeout=10
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        manga_list = data.get('data', [])
        print(f"Success! Got {len(manga_list)} manga")
        if manga_list:
            print(f"First manga slug: {manga_list[0].get('slug', 'N/A')}")
    else:
        print(f"Error: {response.text[:200]}")
except Exception as e:
    print(f"Exception: {e}")

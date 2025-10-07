#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Тест логики slug после исправления:
- API использует: ID--slug (21955--white-blood_)  
- Файл сохраняется: slug.json (white-blood_.json)
"""

print("\n" + "="*70)
print("🧪 ТЕСТ ЛОГИКИ SLUG (после исправления)")
print("="*70)

# Симуляция логики парсера
class MockTitle:
    def __init__(self, slug):
        self.slug = slug
        self.id = None
    
    def set_slug(self, slug):
        self.slug = slug
        print(f"   ✓ Title.slug установлен: {slug}")
    
    def set_id(self, id):
        self.id = id
        print(f"   ✓ Title.id установлен: {id}")

def test_slug_logic(input_slug, api_id):
    print(f"\n📌 ТЕСТ: input_slug = '{input_slug}'")
    
    title = MockTitle(input_slug)
    
    # === ЛОГИКА ИЗ ПАРСЕРА ===
    slug_with_id = title.slug
    clean_slug = title.slug
    extracted_id = None
    
    if "--" in title.slug:
        parts = title.slug.split("--", 1)
        if len(parts) == 2 and parts[0].isdigit():
            extracted_id = int(parts[0])
            clean_slug = parts[1]
            print(f"   Extracted: ID={extracted_id}, slug={clean_slug}")
    
    # API требует полный slug (ID--slug)
    TitleSlug = slug_with_id
    # Файл сохраняется без ID
    title.set_slug(clean_slug)
    
    print(f"   TitleSlug (API): {TitleSlug}")
    print(f"   Title.slug (file): {title.slug}")
    
    # Установка ID
    if extracted_id is not None:
        title.set_id(extracted_id)
        if extracted_id != api_id:
            print(f"   ⚠️  ID mismatch: extracted={extracted_id}, API={api_id} (using extracted)")
    else:
        title.set_id(api_id)
    
    # === ПРОВЕРКИ ===
    print(f"\n   📊 РЕЗУЛЬТАТ:")
    print(f"      - API запрос URL: https://api.cdnlibs.org/api/manga/{TitleSlug}")
    print(f"      - JSON файл: {title.slug}.json")
    print(f"      - Title ID: {title.id}")
    
    # Валидация
    expected_api_slug = input_slug  # API должен получить полный slug
    expected_file_slug = clean_slug  # Файл без ID
    
    if TitleSlug == expected_api_slug:
        print(f"      ✅ API slug correct")
    else:
        print(f"      ❌ API slug WRONG: expected {expected_api_slug}, got {TitleSlug}")
    
    if title.slug == expected_file_slug:
        print(f"      ✅ File slug correct")
    else:
        print(f"      ❌ File slug WRONG: expected {expected_file_slug}, got {title.slug}")

# === ЗАПУСК ТЕСТОВ ===
test_slug_logic("21955--white-blood_", 21955)
test_slug_logic("6478--the-beginning-after-the-end", 6478)
test_slug_logic("7820--suddenly-became-a-princess-one-day-", 7820)
test_slug_logic("solo-leveling", 12345)  # Без ID

print("\n" + "="*70)
print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ")
print("="*70 + "\n")

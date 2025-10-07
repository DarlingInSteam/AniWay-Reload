#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Тест логики slug и filename для MangaLib парсера
"""

def test_slug_logic(input_slug):
    """Тестирует логику обработки slug"""
    
    print(f"\n{'='*60}")
    print(f"INPUT SLUG: {input_slug}")
    print(f"{'='*60}")
    
    # Сохраняем ОРИГИНАЛЬНЫЙ slug для имени файла (может содержать ID--slug)
    original_slug_with_id = input_slug
    clean_slug_for_api = input_slug
    extracted_id = None
    
    if "--" in input_slug:
        # Извлекаем ID и slug из формата "ID--slug"
        parts = input_slug.split("--", 1)
        if len(parts) == 2 and parts[0].isdigit():
            extracted_id = int(parts[0])
            clean_slug_for_api = parts[1]
            print(f"[DEBUG] 📌 Extracted from slug_url: ID={extracted_id}, slug={clean_slug_for_api}")
    
    # Используем чистый slug для API запросов
    title_slug_for_api = clean_slug_for_api
    
    print(f"[DEBUG] 📛 TitleSlug for API: {title_slug_for_api}")
    print(f"[DEBUG] 💾 Original slug for filename: {original_slug_with_id}")
    
    # Симуляция получения данных от API
    api_data_id = 7820  # Пример ID из API
    api_data_slug = "suddenly-became-a-princess-one-day-"  # Пример slug из API
    
    print(f"\n[API RESPONSE]:")
    print(f"  ID: {api_data_id}")
    print(f"  slug: {api_data_slug}")
    
    # Логика установки ID
    if extracted_id is None:
        final_id = api_data_id
        print(f"\n[RESULT] ID not extracted, using from API: {final_id}")
    else:
        if extracted_id != api_data_id:
            print(f"\n[WARNING] ⚠️  ID mismatch: extracted={extracted_id}, API={api_data_id}")
            final_id = api_data_id  # Доверяем API
        else:
            final_id = extracted_id
            print(f"\n[RESULT] ID matches: {final_id}")
    
    # ВАЖНО: slug НЕ перезаписываем - оставляем оригинальный
    final_slug = original_slug_with_id
    
    print(f"\n[FINAL STATE]:")
    print(f"  Title.id: {final_id}")
    print(f"  Title.slug (for filename): {final_slug}")
    print(f"  Expected JSON file: {final_slug}.json")
    print(f"  TitleSlug (for API calls): {title_slug_for_api}")
    
    return final_id, final_slug, title_slug_for_api


if __name__ == "__main__":
    print("\n" + "="*70)
    print("🧪 ТЕСТИРОВАНИЕ ЛОГИКИ SLUG И FILENAME")
    print("="*70)
    
    # Тест 1: slug_url формат (с ID)
    test_slug_logic("7820--suddenly-became-a-princess-one-day-")
    
    # Тест 2: обычный slug (без ID)
    test_slug_logic("suddenly-became-a-princess-one-day-")
    
    # Тест 3: slug_url другой манги
    test_slug_logic("7580--i-alone-level-up")
    
    # Тест 4: slug без дефиса в конце
    test_slug_logic("3754--sweet-home")
    
    print("\n" + "="*70)
    print("✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ")
    print("="*70)

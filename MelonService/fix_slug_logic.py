#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Фиксим логику slug в main.py:
- API требует: ID--slug
- Файл: slug.json (БЕЗ ID)
"""

import re

filepath = r"Parsers\mangalib\main.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Находим старый блок (с любыми эмодзи)
old_pattern = r'''        # Сохраняем ОРИГИНАЛЬНЫЙ slug для имени файла \(может содержать ID--slug\)
        original_slug_with_id = self\._Title\.slug
        clean_slug_for_api = self\._Title\.slug
        extracted_id = None
        
        if "--" in self\._Title\.slug:
            # Извлекаем ID и slug из формата "ID--slug"
            parts = self\._Title\.slug\.split\("--", 1\)
            if len\(parts\) == 2 and parts\[0\]\.isdigit\(\):
                extracted_id = int\(parts\[0\]\)
                clean_slug_for_api = parts\[1\]
                print\(f"\[DEBUG\] .* Extracted from slug_url: ID=\{extracted_id\}, slug=\{clean_slug_for_api\}"\)
        
        # Используем чистый slug для API запросов
        self\.__TitleSlug = clean_slug_for_api

        print\(f"\[DEBUG\] .* Using TitleSlug for API: \{self\.__TitleSlug\}"\)
        print\(f"\[DEBUG\] .* Original slug for filename: \{original_slug_with_id\}"\)'''

# Новый блок
new_block = '''        slug_with_id = self._Title.slug
        clean_slug = self._Title.slug
        extracted_id = None
        
        if "--" in self._Title.slug:
            parts = self._Title.slug.split("--", 1)
            if len(parts) == 2 and parts[0].isdigit():
                extracted_id = int(parts[0])
                clean_slug = parts[1]
                print(f"[DEBUG] Extracted: ID={extracted_id}, slug={clean_slug}")
        
        # ВАЖНО:
        # - API запросы требуют: ID--slug (21955--white-blood_)
        # - JSON файл: slug.json БЕЗ ID (white-blood_.json)
        self.__TitleSlug = slug_with_id
        self._Title.set_slug(clean_slug)

        print(f"[DEBUG] TitleSlug (API): {self.__TitleSlug}")
        print(f"[DEBUG] Title.slug (file): {self._Title.slug}")'''

# Заменяем
new_content = re.sub(old_pattern, new_block, content, flags=re.DOTALL)

if new_content != content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("✅ Замена выполнена успешно!")
else:
    print("⚠️  Паттерн не найден, пробуем упрощённый вариант...")
    
    # Упрощённый pattern - ищем по ключевым строкам
    simple_pattern = r'        original_slug_with_id = self._Title.slug\s+clean_slug_for_api = self._Title.slug.*?print\(f"\[DEBUG\].*?Original slug for filename:.*?\)' 
    
    new_content = re.sub(simple_pattern, new_block, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("✅ Замена выполнена (упрощённый паттерн)!")
    else:
        print("❌ Не удалось найти блок для замены")
        print("\nИщем строку: 'original_slug_with_id'...")
        if 'original_slug_with_id' in content:
            print("Найдена! Показываю контекст:")
            idx = content.index('original_slug_with_id')
            print(content[idx-100:idx+500])
        else:
            print("Не найдена!")

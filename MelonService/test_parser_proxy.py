#!/usr/bin/env python3
"""Тест парсера mangalib с прокси"""

import sys
import os

# Добавляем путь к MelonService
sys.path.insert(0, os.path.dirname(__file__))

# Проверяем загрузку прокси из settings.json
import json
from pathlib import Path

settings_path = Path(__file__).parent / "Parsers" / "mangalib" / "settings.json"

print("=" * 60)
print("🧪 ТЕСТ ПРОКСИ В ПАРСЕРЕ MANGALIB")
print("=" * 60)

# Загрузка settings.json
with open(settings_path, 'r', encoding='utf-8') as f:
    settings = json.load(f)

proxy_config = settings.get("proxy", {})

print(f"\n📋 Настройки прокси в settings.json:")
print(f"   enable: {proxy_config.get('enable')}")
print(f"   host: {proxy_config.get('host')}")
print(f"   port: {proxy_config.get('port')} (type: {type(proxy_config.get('port')).__name__})")
print(f"   login: {proxy_config.get('login')}")
print(f"   password: {'***' if proxy_config.get('password') else 'empty'}")

# Проверка типа порта
if isinstance(proxy_config.get('port'), str):
    print(f"\n⚠️  ВНИМАНИЕ: port является строкой!")
    print(f"   Это может вызвать проблемы в dublib.WebRequestor")
    print(f"   Рекомендуется изменить на число: \"port\": 8000")
elif isinstance(proxy_config.get('port'), int):
    print(f"\n✅ Тип порта корректный (int)")

# Проверка enable
if not proxy_config.get('enable'):
    print(f"\n❌ ПРОКСИ ОТКЛЮЧЕН!")
    print(f"   Установите \"enable\": true в settings.json")
else:
    print(f"\n✅ Прокси включен")

# Попытка импортировать парсер
print(f"\n" + "=" * 60)
print(f"🔧 Попытка импортировать парсер...")
print("=" * 60)

try:
    # Меняем директорию на Parsers/mangalib
    os.chdir(os.path.join(os.path.dirname(__file__), "Parsers", "mangalib"))
    
    # Импортируем main парсера
    from main import Parser
    
    print(f"✅ Парсер импортирован успешно")
    
    # Проверяем наличие метода _InitializeRequestor
    if hasattr(Parser, '_InitializeRequestor'):
        print(f"✅ Метод _InitializeRequestor найден")
    else:
        print(f"❌ Метод _InitializeRequestor не найден!")
    
except Exception as e:
    print(f"❌ Ошибка импорта парсера: {e}")
    import traceback
    traceback.print_exc()

print(f"\n" + "=" * 60)
print(f"✅ ТЕСТ ЗАВЕРШЕН")
print("=" * 60)

print(f"\n💡 РЕКОМЕНДАЦИИ:")
print(f"   1. Убедитесь, что port - это число (int), а не строка")
print(f"   2. Проверьте, что dublib.WebRequestor загружает прокси")
print(f"   3. Запустите парсер с --verbose для отладки")

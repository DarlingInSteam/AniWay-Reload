#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Модуль ротации прокси для MelonService
Поддерживает несколько стратегий ротации и обратную совместимость
"""

import json
import threading
from pathlib import Path
from typing import Dict, List, Optional
from itertools import cycle


class ProxyRotator:
    """
    Класс для ротации прокси-серверов
    
    Поддерживает стратегии:
    - round-robin: Циклическая ротация (по кругу)
    - random: Случайный выбор
    - failover: Использовать следующий только при ошибке предыдущего
    """
    
    def __init__(self, settings_path: str = None, parser: str = "mangalib"):
        """
        Инициализация ротатора прокси
        
        Args:
            settings_path: Путь к settings.json (если None - автоопределение)
            parser: Имя парсера (mangalib, slashlib, etc.)
        """
        self.parser = parser
        self.lock = threading.Lock()  # Для потокобезопасности
        
        # Определяем путь к settings.json
        if settings_path is None:
            base_path = Path(__file__).parent / "Parsers" / parser
            settings_path = base_path / "settings.json"
        
        self.settings_path = Path(settings_path)
        
        # Загружаем настройки
        self._load_settings()
        
        # Инициализируем итератор для round-robin
        if self.proxies:
            self.proxy_iterator = cycle(self.proxies)
            self.current_proxy_index = 0
        else:
            self.proxy_iterator = None
    
    def _load_settings(self):
        """Загружает настройки прокси из settings.json"""
        try:
            with open(self.settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            
            proxy_config = settings.get("proxy", {})
            self.enabled = proxy_config.get("enable", False)
            self.rotation_strategy = proxy_config.get("rotation", "round-robin")
            
            # Поддержка старого формата (обратная совместимость)
            if "host" in proxy_config:
                # Старый формат: один прокси
                self.proxies = [{
                    "host": proxy_config.get("host"),
                    "port": proxy_config.get("port"),
                    "login": proxy_config.get("login"),
                    "password": proxy_config.get("password")
                }]
            else:
                # Новый формат: список прокси
                self.proxies = proxy_config.get("proxies", [])
            
            # Фильтруем невалидные прокси
            self.proxies = [p for p in self.proxies if p.get("host") and p.get("port")]
            
        except Exception as e:
            print(f"[ProxyRotator] ⚠️  Error loading settings: {e}")
            self.enabled = False
            self.proxies = []
            self.rotation_strategy = "round-robin"
    
    def _build_proxy_url(self, proxy: Dict) -> str:
        """
        Строит URL прокси из конфигурации
        
        Args:
            proxy: Словарь с настройками прокси (host, port, login, password)
        
        Returns:
            Строка формата "http://login:password@host:port" или "http://host:port"
        """
        host = proxy.get("host")
        port = proxy.get("port")
        login = proxy.get("login")
        password = proxy.get("password")
        
        if login and password:
            return f"http://{login}:{password}@{host}:{port}"
        else:
            return f"http://{host}:{port}"
    
    def get_next_proxy(self) -> Optional[Dict[str, str]]:
        """
        Возвращает следующий прокси согласно стратегии ротации
        
        Returns:
            Словарь {'http': '...', 'https': '...'} или None если прокси отключены
        """
        if not self.enabled or not self.proxies:
            return None
        
        with self.lock:
            if self.rotation_strategy == "round-robin":
                proxy_config = next(self.proxy_iterator)
                self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
            
            elif self.rotation_strategy == "random":
                import random
                proxy_config = random.choice(self.proxies)
            
            elif self.rotation_strategy == "failover":
                # Всегда используем первый прокси (следующий только при ошибке)
                proxy_config = self.proxies[0]
            
            else:
                # По умолчанию - round-robin
                proxy_config = next(self.proxy_iterator)
            
            proxy_url = self._build_proxy_url(proxy_config)
            
            return {
                'http': proxy_url,
                'https': proxy_url
            }
    
    def get_current_proxy(self) -> Optional[Dict[str, str]]:
        """
        Возвращает текущий прокси без ротации
        
        Returns:
            Словарь {'http': '...', 'https': '...'} или None
        """
        if not self.enabled or not self.proxies:
            return None
        
        # Берём текущий прокси по индексу
        current_index = self.current_proxy_index if hasattr(self, 'current_proxy_index') else 0
        proxy_config = self.proxies[current_index]
        proxy_url = self._build_proxy_url(proxy_config)
        
        return {
            'http': proxy_url,
            'https': proxy_url
        }
    
    def mark_proxy_failed(self, proxy_url: str):
        """
        Отмечает прокси как неработающий (для failover стратегии)
        
        Args:
            proxy_url: URL прокси который не работает
        """
        # TODO: Реализовать логику failover
        # Можно добавить список неработающих прокси
        # И автоматически переключаться на следующий
        pass
    
    def get_all_proxies(self) -> List[Dict[str, str]]:
        """
        Возвращает список всех доступных прокси
        
        Returns:
            Список словарей с прокси
        """
        if not self.enabled or not self.proxies:
            return []
        
        result = []
        for proxy_config in self.proxies:
            proxy_url = self._build_proxy_url(proxy_config)
            result.append({
                'http': proxy_url,
                'https': proxy_url
            })
        
        return result
    
    def get_proxy_count(self) -> int:
        """Возвращает количество доступных прокси"""
        return len(self.proxies) if self.enabled else 0
    
    def __str__(self) -> str:
        """Строковое представление ротатора"""
        if not self.enabled:
            return "ProxyRotator(disabled)"
        
        count = len(self.proxies)
        strategy = self.rotation_strategy
        return f"ProxyRotator(enabled, {count} proxies, strategy={strategy})"


# Глобальный экземпляр ротатора (ленивая инициализация)
_global_rotator = None


def get_proxy_rotator(parser: str = "mangalib") -> ProxyRotator:
    """
    Возвращает глобальный экземпляр ProxyRotator
    
    Args:
        parser: Имя парсера
    
    Returns:
        ProxyRotator instance
    """
    global _global_rotator
    
    if _global_rotator is None:
        _global_rotator = ProxyRotator(parser=parser)
    
    return _global_rotator


if __name__ == "__main__":
    # Тестирование ротатора
    print("\n" + "="*60)
    print("🧪 ТЕСТИРОВАНИЕ PROXY ROTATOR")
    print("="*60)
    
    rotator = ProxyRotator(parser="mangalib")
    print(f"\n{rotator}")
    print(f"Количество прокси: {rotator.get_proxy_count()}")
    
    if rotator.enabled:
        print("\n📋 Все прокси:")
        for i, proxy in enumerate(rotator.get_all_proxies(), 1):
            print(f"  {i}. {proxy['http']}")
        
        print("\n🔄 Ротация (5 запросов):")
        for i in range(5):
            proxy = rotator.get_next_proxy()
            if proxy:
                # Скрываем пароль для безопасности
                proxy_str = proxy['http']
                if '@' in proxy_str:
                    parts = proxy_str.split('@')
                    masked = parts[0].split(':')
                    masked[-1] = '***'
                    proxy_str = ':'.join(masked) + '@' + parts[1]
                print(f"  Запрос {i+1}: {proxy_str}")
    else:
        print("\n⚠️  Прокси отключены")

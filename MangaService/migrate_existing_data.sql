-- Скрипт для миграции существующих данных жанров и тегов из строковых полей в отдельные таблицы

-- Заполнение таблицы жанров из существующих данных
INSERT INTO genres (name, slug, manga_count, created_at, updated_at)
SELECT DISTINCT 
    TRIM(genre_name) as genre_name,
    LOWER(REGEXP_REPLACE(TRIM(genre_name), '[^а-яёa-z0-9\s-]', '', 'g')) as slug,
    0 as manga_count,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM (
    SELECT unnest(string_to_array(genre, ',')) as genre_name
    FROM manga 
    WHERE genre IS NOT NULL AND genre != ''
) AS genre_parts
WHERE TRIM(genre_name) != '' AND LENGTH(TRIM(genre_name)) > 1
ON CONFLICT (name) DO NOTHING;

-- Заполнение таблицы тегов из существующих данных
INSERT INTO tags (name, slug, color, manga_count, popularity_score, is_active, created_at, updated_at)
SELECT DISTINCT 
    TRIM(unnest(string_to_array(tags_string, ','))) as tag_name,
    LOWER(REGEXP_REPLACE(TRIM(unnest(string_to_array(tags_string, ','))), '[^а-яёa-z0-9\s-]', '', 'g')) as slug,
    (ARRAY['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'])[1 + (abs(hashtext(TRIM(unnest(string_to_array(tags_string, ','))))) % 10)] as color,
    0 as manga_count,
    0 as popularity_score,
    TRUE as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM manga 
WHERE tags_string IS NOT NULL 
  AND tags_string != '' 
  AND TRIM(unnest(string_to_array(tags_string, ','))) != ''
ON CONFLICT (name) DO NOTHING;

-- Создание связей между мангой и жанрами
INSERT INTO manga_genres (manga_id, genre_id)
SELECT DISTINCT m.id, g.id
FROM manga m
CROSS JOIN unnest(string_to_array(m.genre, ',')) AS genre_name
JOIN genres g ON g.name = TRIM(genre_name)
WHERE m.genre IS NOT NULL AND m.genre != ''
ON CONFLICT (manga_id, genre_id) DO NOTHING;

-- Создание связей между мангой и тегами
INSERT INTO manga_tags (manga_id, tag_id)
SELECT DISTINCT m.id, t.id
FROM manga m
CROSS JOIN unnest(string_to_array(m.tags_string, ',')) AS tag_name
JOIN tags t ON t.name = TRIM(tag_name)
WHERE m.tags_string IS NOT NULL AND m.tags_string != ''
ON CONFLICT (manga_id, tag_id) DO NOTHING;

-- Обновление счетчиков манг для жанров
UPDATE genres 
SET manga_count = (
    SELECT COUNT(DISTINCT mg.manga_id) 
    FROM manga_genres mg 
    WHERE mg.genre_id = genres.id
);

-- Обновление счетчиков манг и популярности для тегов
UPDATE tags 
SET manga_count = (
    SELECT COUNT(DISTINCT mt.manga_id) 
    FROM manga_tags mt 
    WHERE mt.tag_id = tags.id
),
popularity_score = (
    SELECT COUNT(DISTINCT mt.manga_id) 
    FROM manga_tags mt 
    WHERE mt.tag_id = tags.id
);

-- Деактивация тегов без манг
UPDATE tags SET is_active = FALSE WHERE manga_count = 0;

-- Удаление слишком коротких или некорректных названий жанров и тегов
DELETE FROM genres WHERE LENGTH(name) < 2 OR name ~* '^[0-9]+$';
DELETE FROM tags WHERE LENGTH(name) < 2 OR name ~* '^[0-9]+$';

-- Создание популярных жанров, если их нет
INSERT INTO genres (name, slug, manga_count, created_at, updated_at)
VALUES 
    ('Экшен', 'ekshen', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Романтика', 'romantika', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Комедия', 'komediya', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Драма', 'drama', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Фэнтези', 'fentezi', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Приключения', 'priklyucheniya', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Повседневность', 'povsednevnost', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Школа', 'shkola', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Сверхъестественное', 'sverhestestvennoe', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Хоррор', 'horror', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Создание популярных тегов, если их нет
INSERT INTO tags (name, slug, color, manga_count, popularity_score, is_active, created_at, updated_at)
VALUES 
    ('Гарем', 'garem', '#EC4899', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Исекай', 'isekai', '#8B5CF6', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Магия', 'magiya', '#6366F1', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Демоны', 'demony', '#EF4444', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Вампиры', 'vampiry', '#7C2D12', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Ниндзя', 'nindzya', '#374151', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Самураи', 'samurai', '#059669', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Мехи', 'mekhi', '#0F766E', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Кулинария', 'kulinariya', '#F59E0B', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Спорт', 'sport', '#10B981', 0, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
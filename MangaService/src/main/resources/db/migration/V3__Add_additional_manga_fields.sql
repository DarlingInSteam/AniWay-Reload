-- Добавление новых полей в таблицу manga для расширенной информации из парсинга

-- Добавляем новые колонки
ALTER TABLE manga ADD COLUMN tags VARCHAR(1000);
ALTER TABLE manga ADD COLUMN eng_name VARCHAR(255);
ALTER TABLE manga ADD COLUMN alternative_names VARCHAR(1000);
ALTER TABLE manga ADD COLUMN manga_type VARCHAR(50) DEFAULT 'MANGA';
ALTER TABLE manga ADD COLUMN age_limit INTEGER;
ALTER TABLE manga ADD COLUMN is_licensed BOOLEAN DEFAULT FALSE;

-- Добавляем индексы для оптимизации поиска
CREATE INDEX idx_manga_type ON manga(manga_type);
CREATE INDEX idx_manga_age_limit ON manga(age_limit);
CREATE INDEX idx_manga_is_licensed ON manga(is_licensed);

-- Добавляем ограничения проверки
ALTER TABLE manga ADD CONSTRAINT chk_manga_type 
    CHECK (manga_type IN ('MANGA', 'MANHWA', 'MANHUA', 'WESTERN_COMIC', 'RUSSIAN_COMIC', 'OEL', 'OTHER'));

ALTER TABLE manga ADD CONSTRAINT chk_age_limit 
    CHECK (age_limit IS NULL OR (age_limit >= 0 AND age_limit <= 21));

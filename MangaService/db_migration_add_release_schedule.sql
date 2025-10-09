-- Добавление нового поля release_schedule в таблицу manga
ALTER TABLE manga
    ADD COLUMN IF NOT EXISTS release_schedule VARCHAR(255);

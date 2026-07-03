-- 0055: naczepa na karcie pojazdu (#250) — rejestracja + typ naczepy, jeśli auto ją posiada.
-- Kolumny opcjonalne (tekst). Aplikacja wysyła je tylko gdy wypełnione (schema-safe: bez tej
-- migracji zapis pojazdu bez naczepy działa bez zmian). Idempotentne (`if not exists`).

alter table vehicles add column if not exists trailer_registration text;
alter table vehicles add column if not exists trailer_type text;

-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0086 · Twarde limity bucketów Storage (#368, audyt)
--
--  Do tej pory KAŻDY uwierzytelniony członek mógł wgrać plik dowolnego
--  rozmiaru i dowolnego typu — polityki RLS na `storage.objects` pilnują
--  tylko KTO i GDZIE zapisuje, nie CO. Kontrola po stronie aplikacji
--  (`accept=` w formularzu) jest omijalna wywołaniem Storage API wprost.
--  Skutki: koszt/DoS (wielogigabajtowy upload) oraz — w PUBLICZNYM
--  buckecie `avatars` — hosting złośliwej treści pod adresem naszej
--  domeny storage (SVG/HTML z <script> dostaje publiczny URL = XSS).
--
--  Limity dobrane pod REALNE użycie w kodzie (nie „na oko"):
--   • avatars      — publiczny, tylko zdjęcie profilowe → rastry, bez SVG
--   • cargo-photos — wspólny bucket zdjęć: ładunek, szkody (PDF!), checklisty,
--                    paragony, załączniki czatu ORAZ podpis POD zapisywany
--                    jako `image/svg+xml` (CargoPhotosMobile.savePod) —
--                    dlatego SVG MUSI tu zostać dozwolony. Bucket jest
--                    prywatny (dostęp przez signed URL), więc ryzyko jest
--                    nieporównanie mniejsze niż w publicznym `avatars`.
--   • documents    — sejf: PDF i skany.
--  Pliki tachografu (.ddd/.esm/.tgd/.c1b) NIE trafiają do Storage —
--  są parsowane w przeglądarce (#328), więc nie wymagają whitelisty.
--
--  Idempotentna: sam UPDATE po id, bez zakładania istnienia bucketu.
-- ════════════════════════════════════════════════════════════════════

-- ── avatars (PUBLICZNY) — 3 MB, wyłącznie obrazy rastrowe ────────────
-- Brak svg/html/xml jest tu celowy i najważniejszy w całej migracji.
update storage.buckets
set file_size_limit = 3 * 1024 * 1024,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
    ]
where id = 'avatars';

-- ── cargo-photos (prywatny) — 15 MB; zdjęcia z telefonu + PDF + POD (SVG) ──
-- UI deklaruje `accept="image/*"` (CargoPhotos, DamagePhotos, czat), więc lista musi
-- obejmować także formaty spoza „wielkiej trójki" — inaczej plik przechodzi przez
-- formularz i dopiero Storage odrzuca go z 415, co dla kierowcy wygląda na awarię.
update storage.buckets
set file_size_limit = 15 * 1024 * 1024,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'image/gif', 'image/bmp', 'image/tiff', 'image/avif',
      'image/svg+xml',            -- podpis odbiorcy (POD) — generowany przez naszą apkę
      'application/pdf'           -- załączniki do szkód (DamagePhotos: accept="image/*,.pdf")
    ]
where id = 'cargo-photos';

-- ── documents (prywatny) — 25 MB; sejf dokumentów firmy ──────────────
-- UWAGA: formularz sejfu (`documents/page.tsx`) to `<input type="file">` BEZ atrybutu
-- `accept`, a `uploadDocument` świadomie przekazuje `contentType: file.type || undefined`
-- — czyli sejf z założenia przyjmuje umowy DOCX, zestawienia XLSX, archiwa i pliki,
-- dla których przeglądarka nie zna typu (`application/octet-stream`). Wąska lista
-- „PDF + obrazy" zablokowałaby realne, codzienne użycie, dlatego limit rozmiaru jest tu
-- główną ochroną, a whitelist tylko odsiewa oczywiste śmieci. Bucket jest PRYWATNY
-- (dostęp wyłącznie przez signed URL dla członków firmy), więc ryzyko hostingu
-- złośliwej treści — kluczowe przy publicznym `avatars` — tu nie występuje.
update storage.buckets
set file_size_limit = 25 * 1024 * 1024,
    allowed_mime_types = array[
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'image/gif', 'image/bmp', 'image/tiff', 'image/avif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/zip',
      'text/plain',
      'text/csv',
      'message/rfc822',           -- zapisane e-maile (.eml) jako dowód korespondencji
      'application/octet-stream'  -- plik bez rozpoznanego typu MIME (częste w Safari)
    ]
where id = 'documents';

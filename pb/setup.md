# Pierwsze uruchomienie PocketBase

1. Pobierz binarke PocketBase i umiesc w `pb/pocketbase`.
   - Linux x86_64 (dev): https://github.com/pocketbase/pocketbase/releases
   - Raspberry Pi 5 (arm64): wybierz paczke `linux_arm64`.
2. Uruchom backend:
   - `./scripts/start-pocketbase.sh`
3. Otworz panel admina w przegladarce:
   - `http://127.0.0.1:8090/_/`
4. Utworz konto admina.
5. Utworz kolekcje zgodnie z `pb/schema.md`:
   - `items`, `documents`, `manuals`, `departments`, `tags`, `reminders`.
6. Dodaj przynajmniej jeden wpis w `departments` (np. IT, Foto, Dom), aby formularz dzialal.
7. (Opcjonalnie) ustaw CORS na `http://127.0.0.1:5173` dla lokalnego UI.
8. (Automatycznie) mozesz utworzyc kolekcje i dane startowe skryptem:
   - `PB_EMAIL=twoj@mail PB_PASSWORD=haslo node scripts/bootstrap-pocketbase.mjs`
   - Skrypt nie zapisuje hasla w repozytorium.
9. (Import via Sync) Jesli uzywasz Settings -> Sync:
   - Eksportuj konfiguracje (Settings -> Sync -> Export) do np. `pb/export.json`.
   - Uruchom: `node scripts/merge-pb-sync-export.mjs pb/export.json pb/import.json`
   - Zaimportuj `pb/import.json` w Settings -> Sync -> Import.
10. (Import danych) W panelu kolekcji uzyj Import (Records) i wczytaj:
    - `pb/records/departments.json`
    - `pb/records/tags.json`
    - `pb/records/items.json`
11. (Cron) Zadania cron w PocketBase rejestruje sie tylko programistycznie (Go/JS).
    Hooki trzymamy w `pb_hooks/` (np. `pb_hooks/cron-reminders.pb.js`).
    Uruchamiaj PocketBase z katalogu repo (np. `./scripts/start-pocketbase.sh`).

Frontend czyta URL backendu z `apps/web/.env` (zmienna `VITE_PB_URL`).

## Deploy na RPi5 (GitHub Actions + self-hosted runner)

1. Ustaw PocketBase, aby serwowal UI z katalogu public:
   - w `pocketbase.service` dodaj `--publicDir=/mnt/sql/api/pocketbase/pb_public`
   - opcjonalnie: `--hooksDir=/mnt/sql/api/pocketbase/pb_hooks`
   - opcjonalnie: `--migrationsDir=/mnt/sql/api/pocketbase/pb_migrations`
2. Dodaj route w Cloudflared dla `gwarancje.gorilla-glue.org` na `localhost:8090`.
3. Zainstaluj self-hosted runner na RPi5 (GitHub -> Settings -> Actions -> Runners).
4. Workflow `.github/workflows/deploy-rpi.yml` uruchomi `scripts/deploy-rpi.sh`.
5. Ustaw `VITE_PB_URL` jako GitHub repo variable (np. `https://api.gorilla-glue.org`).
6. Jesli runner potrzebuje restartu systemd, dodaj sudoers (przyklad):
   - `github-runner ALL=(root) NOPASSWD: /bin/systemctl restart pocketbase`

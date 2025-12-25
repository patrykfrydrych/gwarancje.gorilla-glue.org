# Repository Guidelines

## Zakres projektu
Repozytorium opisuje aplikację do zarządzania gwarancjami sprzętu uruchamianą na Raspberry Pi 5. Backendem jest PocketBase, a UI to nowoczesna aplikacja webowa w React. Wymagania funkcjonalne i UX są w `prd.md` i stanowią punkt odniesienia dla wszystkich prac.

## Struktura projektu i moduły
Docelowy układ katalogów:
- `prd.md` — wymagania funkcjonalne i UX.
- `apps/web/` — frontend React + Vite + TypeScript.
- `pb/` — binarka PocketBase oraz dane i migracje (`pb_data/`, `pb_migrations/`).
- `pb/schema.md` — opis kolekcji i pól PocketBase.
- `pb/setup.md` — kroki uruchomienia PocketBase i konfiguracji.
- `scripts/bootstrap-pocketbase.mjs` — automatyczne utworzenie kolekcji w PB.
- `scripts/merge-pb-sync-export.mjs` — przygotowanie pliku do importu w Settings -> Sync.
- `pb/records/` — przykładowe dane do importu (records).
- `apps/web/tests/` — testy frontendu (unit + E2E).
- `scripts/` — narzędzia operacyjne (start, backup).

## Komendy build/test/dev
Komendy frontendu uruchamiaj w `apps/web/` (np. `cd apps/web`):
- `npm install` — instalacja zależności UI.
- `npm run dev` — uruchomienie UI w trybie deweloperskim.
- `npm run build` — build produkcyjny frontend.
- `npm run preview` — podgląd builda lokalnie.
- `npm run lint` — ESLint dla TypeScript/React.
- `npm run format` — formatowanie kodu (Prettier).
- `npm run format:check` — kontrola formatowania bez zmian.
- `npm run test` — Vitest.
- `npm run test:e2e` — Playwright (startuje dev server automatycznie).
- `./scripts/start-pocketbase.sh` — uruchomienie PocketBase na `0.0.0.0:8090`.
- `./scripts/backup-pocketbase.sh` — backup danych PocketBase do `pb/backups/`.

## Styl kodu i nazewnictwo
- Wcięcia 2 spacje, formatowanie i importy zgodnie z Prettier/ESLint.
- Komponenty: `PascalCase.tsx`, hooki: `useThing.ts`, utilsy: `camelCase.ts`.
- Foldery i pliki: lowercase z myślnikami (`device-images/`, `warranty-tags.ts`).

## Testowanie
- Vitest + React Testing Library dla logiki i komponentów (`*.test.tsx`).
- Playwright dla ścieżek krytycznych (`apps/web/tests/e2e/*.spec.ts`).
- Domyślnie E2E używa Firefox; Chromium może wymagać dodatkowych uprawnień w środowisku.
- Nowe funkcje muszą mieć testy: dodawanie sprzętu, wyszukiwanie, wygasanie gwarancji.

## Commity i Pull Requesty
- Stosuj Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- PR powinien zawierać: opis zmian, powiązanie z punktem z `prd.md`, wynik testów i zrzuty ekranu dla UI.

## Bezpieczeństwo i konfiguracja
- Nie commituj sekretów ani danych użytkowników (`pb_data/` do `.gitignore`).
- Konfigurację trzymaj w `.env` i dokumentuj wymagane zmienne w tym pliku.

## Instrukcje dla agentów
- Zanim zaczniesz kodować, potwierdź, które wymagania z `prd.md` realizujesz.
- Preferuj minimalne, iteracyjne zmiany i krótkie, weryfikowalne PR-y.

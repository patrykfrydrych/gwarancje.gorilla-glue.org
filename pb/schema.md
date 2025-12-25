# Schemat PocketBase

Poniżej jest proponowany, spójny schemat kolekcji pod wymagania z `prd.md`. Nazwy pól są w `camelCase`.

## Kolekcje

### `items` (sprzęt)
- `name` (text, required)
- `brand` (text)
- `model` (text)
- `serialNumber` (text, unique)
- `purchaseDate` (date)
- `purchaseType` (select: `online`, `local`)
- `purchasePlace` (text)
- `price` (number)
- `currency` (text, default: `PLN`)
- `warrantyMonths` (number)
- `warrantyEndDate` (date)
- `insuranceActive` (bool)
- `insuranceProvider` (text)
- `extendedWarranty` (bool)
- `status` (select: `active`, `archived`)
- `department` (relation -> `departments`, single)
- `tags` (relation -> `tags`, multiple)
- `thumbnail` (file, 1)
- `notes` (editor)

**Wyszukiwanie „po dowolnej wartości”**: dodaj pole `searchText` (text) z konkatenacją `name/brand/model/serialNumber/purchasePlace/notes` i utrzymuj je hookiem. Dzięki temu filtr `searchText~"fraza"` obejmie całość.

### `documents` (dokumenty sprzedażowe)
- `title` (text, required)
- `type` (select: `invoice`, `receipt`, `warranty`, `other`)
- `file` (file, multiple)
- `vendor` (text)
- `issueDate` (date)
- `items` (relation -> `items`, multiple)
- `notes` (text)

### `manuals` (instrukcje)
- `title` (text, required)
- `language` (text)
- `file` (file, multiple)
- `items` (relation -> `items`, multiple)

### `departments` (działy z kolorami)
- `name` (text, required)
- `color` (text, np. `#FFB020`)
- `icon` (text, opcjonalnie np. nazwa ikony)

### `tags` (etykiety pomocnicze)
- `label` (text, required)
- `color` (text, opcjonalnie)

### `reminders` (powiadomienia)
- `item` (relation -> `items`, single, required)
- `remindAt` (date, required)
- `channel` (select: `email`, `push`, `none`)
- `sentAt` (date)

## Reguły i uwagi
- `serialNumber` ustaw jako unikalny, jeśli sprzęt musi być jednoznaczny.
- `warrantyEndDate` można wyliczać z `purchaseDate + warrantyMonths` po stronie klienta lub hooka.
- Pliki `documents` i `manuals` przechowuj jako załączniki PB, a miniaturę w `items.thumbnail`.
- `status=archived` zamiast twardego usuwania — wspiera archiwizację.
- UI wymaga co najmniej jednego wpisu w `departments`, aby formularz działał poprawnie.

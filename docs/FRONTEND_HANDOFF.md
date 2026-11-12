# FRONTEND HANDOFF — «Цифровой архив Астаны»

Date: 2026-11-12. This is everything a frontend team needs to start building the UI today. The stack is your choice.

The backend is a working MVP: FastAPI, cookie session, JSON over `/api`. The current UI (`app/static/`, vanilla JS, about 900 lines) is a reference implementation. Copy its behaviour, not necessarily its code.

Related docs: `docs/TZ.pdf` (the spec), `docs/DESIGN.md` (screens, wireframes, tokens, Russian copy), `docs/screenshots/*.png` (the current UI), `docs/ARCHITECTURE.md` (data model, API §9, roles §8).

---

## 1. Product in one page

A system for the Astana city archive: **scan → automatic upload (M1) → text recognition (M2) → full-text search (M3)**.

| Module | What the user does |
|---|---|
| M1 · Автозагрузка | The operator drops scans into a folder or uploads them in the browser. The system validates each file, works out its шифр, uploads it to ЕАИС (the archive's main system) and queues it for OCR. The operator sees the queue, errors, journal and stats, and fixes шифр by hand. |
| M2 · Распознавание | OCR produces text with word coordinates and confidence. The archivist reviews low-confidence pages side by side with the scan and corrects words. Pages export as TXT, JSON, hOCR, ALTO or searchable PDF. |
| M3 · Поиск | Everyone searches the text and metadata, with morphology (RU/KK), cross-script matching (Cyrillic query finds Latin and Arabic text) and fuzzy matching. Snippets, highlighting on the scan, collections and exports. |

**Glossary.**
- **Шифр** is the address of a storage unit: Фонд / Опись / Дело / Лист. It is shown as `Ф.1 Оп.1 Д.12 · л.3`.
- **Дело** is a case (a folder of pages). **Лист** is a page. **Фонд** is a collection, and **фондообразователь** is the organisation that created it.
- **ЕАИС** is the archive's existing system (ЭЛАР-Архив). In the MVP it is mocked at `/mock-eais`.
- **CER** is the character error rate. **conf** is the OCR confidence, 0–100.

**Languages and scripts**, given by the `lang` field:

| `lang` | Badge | Meaning | Direction |
|---|---|---|---|
| `ru` | RU | Russian, auto-detected; pre-1918 pages are labelled `ru-old` only when an archivist sets the case language | LTR |
| `ru-old` | RU-дореф | Russian, pre-1918 orthography; set only by an archivist as the case language override (no auto-detection) | LTR |
| `kk-cyrl` | KK | Kazakh, Cyrillic | LTR |
| `kk-latn` | KK-лат | Kazakh, Latin «яналиф» (1929–1940) | LTR |
| `kk-arab` | KK-араб | Kazakh, Arabic script «төте» (before 1929) | **RTL** |

## 2. Roles and access

| Screen (current route) | admin | archivist | operator | reader |
|---|---|---|---|---|
| Вход `#/login` | ✓ | ✓ | ✓ | ✓ |
| Поиск `#/search` (start screen for archivist and reader) | ✓ | ✓ | ✓ | ✓ |
| Страница `#/page/:id?hl=…&mode=view\|edit` | ✓ edit | ✓ edit | view | view |
| Дела `#/dela`, `#/dela/:id` | ✓ | ✓ | open only | open only |
| Подборки `#/collections`, `#/collections/:id` | ✓ | ✓ | ✓ | ✓ |
| Панель оператора `#/ops` (start screen for operator and admin) | ✓ | ✓ | ✓ | — |
| Загрузка `#/upload`, Ошибки `#/errors`, Журнал `#/journal` | ✓ | ✓ | ✓ | — |
| Очередь проверки `#/review` | ✓ | ✓ | — | — |
| Администрирование `#/admin` (ЕАИС switch, users, health) | ✓ | — | — | — |

- Menu items a role cannot use are **not rendered**.
- **Restricted cases** (`access: "restricted"`) are visible only to admin and archivist. For everyone else the backend already filters them out of every list, search result, facet, snippet and collection, and returns **404** for direct links. Never show a hint that a hidden case exists. Show the 🔒 badge to editors. Exception: the operator tools (`GET /api/m1/check-case`, `GET /api/m1/cases`) list restricted cases with `title: null` (the operator scans them); the reader never sees them.

Role groups used in the API: `STAFF` = admin, archivist, operator. `EDITORS` = admin, archivist.

## 3. Running the backend as your dev server

```bash
# prerequisites: Python ≥3.11, uv, Tesseract 5 with rus kaz tur uig ara osd
#   macOS: brew install tesseract tesseract-lang
git clone <repo> && cd astana-archive
./run.sh                                    # http://127.0.0.1:8000, demo data seeds itself on first start (~60 s)
uv run python -m app.seed --reset           # back to a clean demo (server stopped)
PORT=8001 DATA_DIR=/tmp/aa ./run.sh         # a second isolated instance
```

Demo accounts (password = login): `admin`, `archivist`, `operator`, `reader`.

**Auth.**
- `POST /api/login {username, password}` sets an **httpOnly cookie `session`** (SameSite=Lax) and returns the user.
- `GET /api/me` returns the current user, or 401.
- `POST /api/logout` ends the session.
- There are no tokens or refresh flow.

**CORS.** The backend has no CORS. Run your dev server with a proxy `/api → http://127.0.0.1:8000` and `/mock-eais → same`, so cookies stay same-origin. In production the built SPA is served from the same origin.

**Errors.** All errors are JSON `{"detail": "<Russian message, ready to show>"}`.
- **401**: go to login and keep `next`.
- **403**: show «Нет доступа».
- **404**: not found, or hidden by access rules. Treat both the same.
- **400**: validation. Show `detail` in a toast or next to the field.
- **415**: no preview.

**Contract.** `/openapi.json` lists every route and its parameters. The response bodies there are untyped, so the examples in §5 are the contract. The Swagger page `/docs` needs internet (CDN); use `/openapi.json` offline.

## 4. Data rules the UI must respect

- **Word coordinates** (`x, y, w, h`) are pixels of the full image `GET /api/pages/{id}/image`. Its size is `width × height` in the page payload.
  - Scale the boxes by `displayedWidth / width`.
  - The thumbnails `?w=80…800` keep the aspect ratio.
- **Confidence.**
  - `conf` per word is 0–100. A word is low-confidence when `conf < low_word_conf` (from `GET /api/pages/{id}`; it is the threshold of that page's OCR engine: 60 for Tesseract, 96.5 for `vlm` by default); highlight it.
  - A page is flagged `low_conf = 1` when its mean is below `LOW_PAGE_CONF` (default 75) or more than `LOW_WORDS_SHARE` (default 15%) of words are low-confidence (server-side config; per page engine; VLM_LOW_* for vlm pages). Those pages go to the review queue.
- **Words** carry `text` (current, possibly corrected), `ocr_text` (original OCR output) and `corrected` (0/1). Group them into lines by `line` and order them by `idx`.
- **Highlighting.**
  - `GET /api/pages/{id}?hl=<query>&fz=<0|1|2>` returns `highlight_word_ids` to box on the scan. Scroll to the first one.
  - `snippet_html` from search is **already escaped server-side**, and only `<mark>` tags are added. Insert it as HTML. Everything else is user data and must be escaped.
- **RTL.** Render `kk-arab` text with `dir="rtl"`. Use `dir="auto"` for mixed lists such as search snippets and collection titles.
- **Statuses.**
  - `files.status` takes `queued | retry | uploaded | invalid`, shown as «в очереди», «повтор», «загружено» and «ошибка».
  - `pages.status` takes `pending | running | done | failed`, shown as «в очереди», «распознаётся», «распознано» and «ошибка».
  - On top of the page status: `low_conf=1 & reviewed=0` is «на проверке», and `reviewed=1` is «проверено».
- **Polling.** There is no WebSocket. Poll `/api/health` about every 5 s for the ЕАИС indicator and retry countdown. Poll `/api/m1/queue` and `/api/notifications` on the operator screens. Stop polling when the user leaves the screen.
- **Ignore server paths.** `spool_path`, `archive_path` and `error_path` in `/api/m1/files` are server file paths. Do not display them, and use `GET /api/m1/files/{id}/preview` for the image.
- **Downloads.** Exports return a file with `Content-Disposition: attachment; filename*=UTF-8''…`. Use a plain link or `fetch` → blob → save.

## 5. API reference

`R` = any logged-in user. `S` = STAFF. `E` = EDITORS. `A` = admin. The examples are real responses from a seeded instance, trimmed (`"… N more"` means the list continues).

### 5.1 Auth and state
| Method | Path | Who | Params / body | Returns |
|---|---|---|---|---|
| POST | `/api/login` | — | `{username, password}` | user, sets cookie |
| POST | `/api/logout` | — | — | `{ok}` |
| GET | `/api/me` | R | — | user |
| GET | `/api/health` | R | — | ЕАИС status, worker heartbeats, disk, retry countdown, OCR engine |
| GET | `/api/notifications` | S | — | `{unread, items[20]}` |
| POST | `/api/notifications/read` | S | — | mark all read |

```json
// GET /api/me
{"id": 1, "username": "admin", "full_name": "Администратор Демо", "role": "admin", "role_ru": "Администратор"}

// GET /api/health
{"eais_online": true, "eais_down_since": null,
 "workers": {"watcher": {"age_s": 2.7, "ok": true}, "upload": {"age_s": 3.6, "ok": true}, "ocr": {"age_s": 1.7, "ok": true}},
 "disk_free_gb": 4.1, "disk_low": false, "next_retry_at": null, "next_retry_in": null,
 "ocr_engine": "tesseract", "tesseract": "tesseract 5.5.4", "last_backup": null, "server_time": 1794425389.46}

// GET /api/notifications        level: info | warn | error
{"unread": 4, "items": [{"id": 4, "ts": "2026-11-12 00:29:14", "level": "error",
  "message": "Ошибка проверки: blank.png — Пустая страница 1", "read": 0}, "… 3 more"]}
```

### 5.2 M1: upload, queue, errors, journal
| Method | Path | Who | Params / body | Returns |
|---|---|---|---|---|
| POST | `/api/upload` | S | multipart: `files[]`, `workplace` (`ws1`/`ws2`), optional `fond`, `opis`, `delo` (digits; when all three are filled they **win over the file name**: `F1_O1_D12_L009.png` + 1/1/15 → Д.15, leaf 9, `shifr_source: "folder"`) | `{saved: [relpath], workplace}` |
| GET | `/api/m1/files` | S | `status`, `q` (name or шифр), `limit` (default 200) | file rows |
| GET | `/api/m1/files/{id}/preview` | S | — | PNG ≤400 px, or 404/415 |
| GET | `/api/m1/queue` | S | — | counters for the operator panel and menu badges |
| GET | `/api/m1/check-case` | S | `fond, opis, delo` | `{found, title}`; `found: null` + `detail` if ЕАИС is down. `title` is `null` for a restricted case when the user is an operator |
| GET | `/api/m1/cases` | S | `fond?`, `opis?` (`opis` needs `fond`, else 400) | cascade from ЕАИС. No params: `[{fond, fond_creator, n_opisi, n_dela}]`; `fond`: `[{opis, n_dela}]`; `fond+opis`: `[{delo, title, year_from, year_to, access, leaves}]` (`leaves` = pages held locally). Restricted cases are listed, `title` is `null` for an operator. ЕАИС down → 503 `{detail}`. Example: `GET /api/m1/cases?fond=7&opis=2` → `[{"delo": 3, "title": "Сведения о школах", "year_from": 1935, "year_to": 1935, "access": "open", "leaves": 0}, "… 3 more"]` |
| POST | `/api/m1/cases` | E | `{fond, opis, delo, title, year_from?, year_to?, fond_creator?, doc_type?, access?: "open"\|"restricted"}` | 201 `{fond, opis, delo, title, year_from, year_to, access}` («+ Новое дело»). 400 bad input, 409 «Такой шифр уже есть в ЕАИС», 503 ЕАИС down. Mock-only. Example: `{"fond": 7, "opis": 2, "delo": 11, "title": "Новое дело"}` → `{"fond": 7, "opis": 2, "delo": 11, "title": "Новое дело", "year_from": null, "year_to": null, "access": "open"}` |
| POST | `/api/m1/files/{id}/shifr` | S | `{fond, opis, delo, leaf?}` | file row, requeued («Исправить шифр») |
| POST | `/api/m1/files/{id}/retry` | S | `{force?: bool}` | file row. On `retry` status it means «Отправить сейчас»; on `invalid` it means «Отправить повторно» |
| POST | `/api/m1/jobs/{id}/retry` | S | — | retry a failed OCR job |
| GET | `/api/m1/stats` | S | `period=day\|month` | last 10 days / 7 months: `{period, uploaded, errors, pages}` |
| GET | `/api/m1/journal` | S | `q`, `result` (`ok\|error\|info`), `limit` (50), `offset` | journal rows |

```json
// GET /api/m1/files (one row; shifr_source: filename | folder | manual)
{"id": 13, "workplace": "ws1", "src_relpath": "ws1/1/1/12/005.tif", "name": "005.tif",
 "sha256": "72e6…49a6", "size": 1633204, "fmt": "TIFF", "dpi": 300, "n_pages": 1,
 "fond": 1, "opis": 1, "delo": 12, "leaf_start": 5, "shifr_source": "folder",
 "status": "uploaded", "error_reason": null, "force": 0, "eais_receipt": "EAIS-1-000010", "delo_id": 6,
 "created_at": "2026-11-12 00:29:14", "updated_at": "2026-11-12 00:29:17",
 "attempts": 1, "next_run_at": 0.0, "last_error": null, "job_status": "done", "shifr": "Ф.1 Оп.1 Д.12 л.5"}

// invalid file
{"id": 11, "name": "002_copy.tif", "status": "invalid", "error_reason": "Дубликат файла 002.tif (Ф.1 Оп.1 Д.12)", "shifr": "", "…": "…"}

// GET /api/m1/queue
{"files": {"queued": 0, "retry": 0, "uploaded": 10, "invalid": 4},
 "uploaded_today": 10, "pages_today": 12, "pages_done": 12,
 "ocr": {"pending": 0, "running": 0, "failed": 0}, "ocr_failed": [],
 "review": 1, "next_retry_at": null, "next_retry_in": null}

// GET /api/m1/journal
[{"id": 49, "ts": "2026-11-12 00:29:49", "actor": "reader", "action": "вход", "file_name": "", "shifr": "", "result": "ok", "details": ""}]
```

### 5.3 Дела, pages, review (M2)
| Method | Path | Who | Params / body | Returns |
|---|---|---|---|---|
| GET | `/api/dela` | R | `q` (шифр/title), `fond`, `opis`, `page` (1-based), `per_page` (default 25, clamp 1..100) | Without `page`: plain list of summaries. With `page`: `{total, page, per_page, items[]}` (`total` counts only cases visible to you; a page past the end gives `items: []`). Order `fond, opis, delo`; restricted hidden for non-editors |
| GET | `/api/dela/{id}` | R | — | summary + `pages[]` |
| POST | `/api/dela/{id}/ocr` | E | `{lang: "auto"\|"ru"\|"kk-cyrl"\|"kk-latn"\|"kk-arab"\|"ru-old"}` | `{queued}`. Re-OCRs the whole case and **overwrites manual corrections**, so confirm first |
| GET | `/api/review` | E | — | pages awaiting review, worst first |
| GET | `/api/pages/{id}` | R | `hl` (query), `fz` (0/1/2) | page + words + navigation |
| GET | `/api/pages/{id}/image` | R | `w` (80–800 → JPEG thumbnail; none → full PNG) | image |
| PATCH | `/api/pages/{id}/words` | E | `[{id, text}, …]` (changed words only) | `{changed, cer}`; reindexes the page |
| POST | `/api/pages/{id}/reviewed` | E | — | `{ok, next_review_id}` → open the next page in the queue |
| POST | `/api/pages/{id}/retry` | S | — | re-OCR one page |
| GET | `/api/pages/{id}/export` | R | `fmt=txt\|json\|hocr\|alto\|pdf` | file |
| GET | `/api/dela/{id}/export` | R | `fmt` as above | file (all recognized pages) |

```json
// GET /api/dela (one item); gaps = missing leaf numbers
{"id": 6, "fond": 1, "opis": 1, "delo": 12, "shifr": "Ф.1 Оп.1 Д.12", "eais_case_id": 1,
 "title": "Протоколы заседаний горисполкома", "year_from": 1954, "year_to": 1954, "years": "1954",
 "fond_creator": "Акмолинский городской исполнительный комитет", "doc_type": "протоколы",
 "access": "open", "lang_override": null,
 "pages_total": 4, "pages_done": 4, "pages_failed": 0, "gaps": [4], "low_conf": 0,
 "langs": ["ru"]}   // /api/dela items only: sorted distinct page langs (null langs skipped), same as search groups

// GET /api/dela?fond=7&page=1&per_page=2
{"total": 4, "page": 1, "per_page": 2, "items": ["… 2 items, each as above"]}

// GET /api/dela/{id} → the same fields + pages
{"…": "…", "pages": [{"id": 9, "leaf": 1, "lang": "ru", "mean_conf": 96.0, "low_conf": 0, "reviewed": 0,
                      "status": "done", "script": "Cyrillic", "engine": "tesseract"}, "… 3 more"]}

// GET /api/review
[{"id": 3, "leaf": 3, "lang": "kk-cyrl", "mean_conf": 70.7, "shifr": "Ф.1 Оп.1 Д.15",
  "title": "Приказы по народному образованию", "delo_id": 1, "low_share": 0.3125}]

// GET /api/pages/9?hl=мектеп
{"id": 9, "delo_id": 6, "file_id": 9, "leaf": 1, "width": 1750, "height": 2480,
 "script": "Cyrillic", "lang": "ru", "engine": "tesseract", "mean_conf": 96.0, "low_conf": 0, "reviewed": 0,
 "cer": null, "status": "done", "updated_at": "2026-11-12 00:29:29",
 "delo": {"id": 6, "shifr": "Ф.1 Оп.1 Д.12", "title": "Протоколы заседаний горисполкома", "years": "1954",
          "access": "open", "eais_case_id": 1},
 "low_word_conf": 60.0,
 "words": [{"id": 213, "idx": 0, "block": 1, "line": 0, "text": "ПРОТОКОЛ", "ocr_text": "ПРОТОКОЛ",
            "conf": 95.91, "x": 601, "y": 194, "w": 365, "h": 50, "corrected": 0}, "… 66 more"],
 "highlight_word_ids": [],
 "prev_id": null, "next_id": 10, "prev_leaf": null, "next_leaf": 2, "position": 1, "count": 4, "max_leaf": 5,
 "job": {"id": 19, "last_error": null}}
```

### 5.4 Search (M3)
| Method | Path | Who | Params | Returns |
|---|---|---|---|---|
| GET | `/api/search` | R | `q`, `fuzzy` (0/1/2), `sort=rel\|date\|shifr`, `page` (20 per page), filters `fond, opis, delo, year_from, year_to, lang, doc_type, creator` | results grouped **by case** |
| GET | `/api/search/delo/{id}` | R | `q`, `fuzzy` | snippet per matching page of one case («Все страницы дела») |
| GET | `/api/search/facets` | R | — | filter options (already access-filtered) |
| GET | `/api/history` | R | — | the user's last 20 searches |
| GET | `/api/saved-queries` | R | — | saved queries |
| POST | `/api/saved-queries` | R | `{name, q, filters}` | `{id}` |
| DELETE | `/api/saved-queries/{id}` | R | — | `{ok}` |

**Query syntax** (typed into a single box): words; `"exact phrase"`; operators `И / ИЛИ / НЕ` (also `AND / OR / NOT`); `-word` excludes. Morphology and cross-script matching happen on the server. Every search is logged to the history.

```json
// GET /api/search?q=мектеп   (as reader: the restricted Д.21 is absent)
{"total": 4, "pages_total": 6, "page": 1, "pages": 1, "took": 0.007,
 "items": [
  {"delo_id": 3, "shifr": "Ф.7 Оп.2 Д.4", "title": "Мектеп туралы хабарлар", "access": "open", "years": "1926",
   "lang": "kk-arab", "langs": ["kk-arab"], "doc_type": "сообщения",
   "best_page_id": 6, "leaf": 1, "hits_pages": 1, "score": 0.0,
   "snippet_html": "اقمولا قالاسىندا <mark>مەكتەپتەر</mark> اشىلدى. …",
   "pages": [{"page_id": 6, "leaf": 1}]},
  {"delo_id": 4, "shifr": "Ф.7 Оп.2 Д.3", "title": "Сведения о школах", "lang": "kk-latn",
   "snippet_html": "M9LIMET Agmola galasında 1935 jılı 12 <mark>mektep</mark> bar. …", "…": "…"},
  "… 2 more"]}

// empty query → HTTP 200 with an error field (no exception)
{"total": 0, "pages_total": 0, "items": [], "took": 0, "error": "Введите запрос"}

// GET /api/search/facets
{"fonds": [{"fond": 1, "creator": "Акмолинский городской исполнительный комитет"},
           {"fond": 7, "creator": "Акмолинский отдел народного образования"}],
 "doc_types": ["отчёты", "приказы", "…"], "creators": ["…"],
 "years": {"min": 1926, "max": 1962}, "langs": ["kk-arab", "kk-cyrl", "kk-latn", "ru"]}

// GET /api/saved-queries   (GET /api/history has the same shape plus ts, hits)
[{"id": 1, "user_id": 4, "name": "Школы", "q": "мектеп", "filters_json": "{…}", "filters": {"lang": "kk-cyrl"}}]
```

### 5.5 Collections («Подборки», for archive certificates)
| Method | Path | Who | Params / body | Returns |
|---|---|---|---|---|
| GET | `/api/collections` | R | — | the user's own collections with `n`, `updated_at` |
| POST | `/api/collections` | R | `{name}` | `{id, name}` |
| GET | `/api/collections/{id}` | R | — | collection + `items[]` (pages) |
| DELETE | `/api/collections/{id}` | R | — | `{ok}` |
| POST | `/api/collections/{id}/items` | R | `{page_id}` | `{ok}` (idempotent) |
| DELETE | `/api/collections/{id}/items/{page_id}` | R | — | `{ok}` |
| GET | `/api/collections/{id}/export` | R | `fmt=xlsx\|csv\|zip` | file (ZIP = scans + texts + manifest) |

```json
// GET /api/collections/1
{"id": 1, "user_id": 4, "name": "Справка №1", "created_at": "2026-11-12 00:29:49",
 "items": [{"page_id": 6, "leaf": 1, "lang": "kk-arab", "delo_id": 3, "shifr": "Ф.7 Оп.2 Д.4",
            "title": "Мектеп туралы хабарлар", "year_from": 1926, "year_to": 1926, "years": "1926",
            "eais_case_id": 5, "access": "open", "added_at": "2026-11-12 00:29:49"}]}
```

### 5.6 Admin and the mock ЕАИС
| Method | Path | Who | Params / body | Returns |
|---|---|---|---|---|
| GET | `/api/users` | A | — | `[{id, username, full_name, role}]` |
| POST | `/api/users` | A | `{username, password, role, full_name?}` | `{id}` |
| PATCH | `/api/users/{id}` | A | `{role?, password?}` | `{ok}`; a password change logs that user out |
| GET | `/mock-eais/api/status` | any session | — | `{online, cases, files}` (counts exclude restricted cases for non-editors) |
| POST | `/mock-eais/api/status` | A | `{online: bool}` | outage switch for the demo |
| POST | `/mock-eais/api/cases/{id}/files` | internal token | multipart `leaf`, `file` | `{receipt_id}`. Only the M1 uploader calls it; not for the browser (no token → 401) |
| POST | `/mock-eais/api/cases` | internal token | `{fond, opis, delo, title, year_from?, year_to?, …}` | creates an ЕАИС case. No token → 401, duplicate шифр → 409, mock offline → 503. The browser must not call it; use `POST /api/m1/cases` |
| GET | `/mock-eais/api/cases` and `/mock-eais/api/cases/{id}` | any session | `fond, opis, delo` | the ЕАИС case card (the «Карточка ЕАИС» link target). No session → 401. Restricted cases are 404 for reader and operator (the operator still sees them, title hidden, via `/api/m1/cases` and `check-case`) |

## 6. Screens

Use `docs/DESIGN.md` §4 for the wireframes, empty, loading and error states, and the copy. Use `docs/screenshots/` for the current look.

| # | Screen | Main endpoints |
|---|---|---|
| 1 | Login (one-click demo-account chips) | login, me |
| 2 | Operator panel: tiles, stats bars, recent events | m1/queue, m1/stats, m1/journal, health |
| 3 | Upload and queue: drag&drop, optional шифр with a live «Дело в ЕАИС: …» check | upload, m1/check-case, m1/files |
| 4 | Errors: reason, preview, «Исправить шифр», «Отправить повторно» | m1/files?status=invalid, preview, shifr, retry |
| 5 | Дела list and case card: thumbnails, gaps, re-OCR with language, exports | dela, dela/{id}, pages/{id}/image?w=, dela/{id}/ocr, export |
| 6 | **Страница**: scan with word overlays and the text side by side; view and edit modes; low-confidence and found-word highlights; prev/next | pages/{id}, image, words, reviewed, export |
| 7 | Review queue | review |
| 8 | **Search**: query box, filters from facets, fuzzy toggle, sort, case-grouped results, snippets, «Все страницы дела», add to collection, save the query, history | search, search/delo, facets, saved-queries, history |
| 9 | Collections and exports | collections* |
| 10 | Journal: filter by result, search | m1/journal |
| 11 | Admin: ЕАИС switch, users, service health | users, mock-eais/status, health |
| 12 | Notification bell (header) | notifications |

The header shows the ЕАИС indicator (green, or red «ЕАИС недоступна»), the bell and the user menu. Menu counters come from `/api/m1/queue` (`files.invalid`) and `/api/review`.

## 7. Non-functional requirements (from the TZ)

- **On-prem, no internet.** Bundle everything: no CDNs, no Google Fonts, no external analytics. Ship fonts locally, with Cyrillic, Kazakh (ә ғ қ ң ө ұ ү һ і) and Arabic coverage.
- **UI language: Russian.** Keep strings in one place, because Kazakh may be added later.
- **Performance.** Search under 2 s (the backend is already fast), ≥30 concurrent users, pages that stay light on office PCs.
- **Accessibility.** AA contrast (tokens in DESIGN.md §2), visible focus, keyboard-friendly, `role="status"` toasts, at least 36 px targets.
- **Browsers.** Current Chrome, Edge, Firefox and Yandex Browser on Windows 10/11. Readers use mobile for search and page view only.
- **Security.** Escape all user data (only `snippet_html` is pre-escaped). Use `credentials: "same-origin"`. No tokens in localStorage.

## 8. Coming changes (backend work in progress)

- **New OCR engine `vlm`** (a GPU vision-language model; see `docs/VLM_SELECTION.md`). The `engine` field on pages and `ocr_engine` in health can be `"vlm"`. With `OCR_ENGINE=auto` (health shows `"auto"`) each page has its own `engine`: `"vlm"` for Arabic script and for `ru-old` pages, `"tesseract"` otherwise; `low_word_conf` follows the page engine. If the VLM endpoint is down or not configured (`VLM_URL` empty), `kk-arab` and `ru-old` pages are retried and then fail with `status: "failed"` after `OCR_MAX_ATTEMPTS` (3) attempts, as Arabic pages already do; Tesseract pages are unaffected. **The word schema does not change**: the same `x, y, w, h, conf, text`.
- **OCR can take longer** (a GPU cold start of 30–90 s). The page `status: "running"` may last longer, so show a progress state and keep polling.
- **Kazakh Arabic and Latin quality improves** after fine-tuning. Nothing changes in the UI.

## 8a. Шифр rules (M1)

- An invalid file keeps its шифр: `fond/opis/delo/shifr` are filled when it came from the manual fields, the folder or the file name, so the fix form can be prefilled. Only a file with no resolvable шифр has `fond: null`, `shifr: ""` and the reason «Шифр не определён».
- Manual Фонд/Опись/Дело (or a `ws1/1/1/15/` folder) beats a шифр in the file name.
- The leaf is read only from an explicit `Л`/`L` marker (`Ф1_Оп1_Д15_Л001.png` → 1, `F1_O1_D12_L009.png` → 9) or from a purely numeric name (`004.png` → 4). `scan2024_copy.png` and `IMG_2024.png` get no leaf and take the next free one.
- A page the user may not see and a page that does not exist both return `404 {"detail": "Страница не найдена"}` (also `/image`, `/export`).

## 9. Known gaps (backend; the UI can work around them)

- A filter-only search needs a query (`error: "Введите запрос"`). Disable search until a query is typed.
- «Отправить повторно» is offered even for errors that a resend cannot fix (blank page, low DPI). Hide it when `error_reason` starts with «Пустая», «Чёрная» or «Разрешение».
- `/docs` (Swagger) needs internet; `/openapi.json` works offline.

Questions → the backend owner. The current behaviour of `app/static/app.js` is the reference whenever this doc and the code disagree.

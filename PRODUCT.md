# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Nuxt 4 (SPA, `ssr: false`), Vue 3, TypeScript, Pinia, Nuxt UI v4, Tailwind CSS v4. The built SPA is served from the same origin as the backend. The backend is an existing FastAPI MVP: cookie session, JSON over `/api`. Its contract is in `docs/FRONTEND_HANDOFF.md` §3–§5.

## Users

All users are internal staff of the Astana city archive. They work mostly on office PCs on the archive's internal network. The official institution name has not been confirmed; don't put one in UI copy.

- **Archivist (архивист): primary user.** Starts on Поиск. Reviews OCR pages with low confidence side by side with the scan. Corrects words, re-runs OCR for a case, and manages cases. Also has full M1 access: ops panel, upload, errors, journal. Sessions are long and focused, and the work repeats page after page. When trade-offs between roles collide, the archivist's correction and review work wins.
- **Operator (оператор).** Starts on Панель оператора. Scans documents and feeds them in: watches the upload queue, fixes шифр by hand, resends failed files, and checks the journal and daily and monthly stats. Can view pages and open дела but not edit. Works at volume and needs throughput and fast error triage.
- **Reader (читатель).** Starts on Поиск. Archive employees who search the text and metadata to prepare archive certificates (справки). Can view pages (read-only), open дела, and build подборки and export them. On mobile, uses search and page view only.
- **Admin (администратор).** Starts on Панель оператора. Has every screen. Manages users and roles, watches service health, and switches the ЕАИС connection (a demo outage switch in the MVP).

## Product Purpose

The product digitises the archive's paper holdings end to end: **scan → automatic upload to ЕАИС (M1) → text recognition (M2) → full-text search (M3)**.

Success means:
- scans reach ЕАИС with the correct шифр and little manual work;
- archivists can bring OCR text to a trustworthy state quickly;
- staff find documents by content, across languages and scripts, with search answering in under 2 s.

## Positioning

Full-text search over the archive's own scanned holdings in Russian and Kazakh Cyrillic, plus the two historical Kazakh scripts. A Cyrillic query finds Latin «яналиф» (1929–1940) and Arabic «төте» (before 1929) text. Morphology and fuzzy matching run on the server. Every word stays tied to its position on the scan, so a hit is shown on the original page image, not just in the extracted text.

## Operating Context

- **Environment.** On-prem, no internet. Office PCs running Windows 10/11 with current Chrome, Edge, Firefox or Yandex Browser. Readers sometimes use mobile, for search and page view only.
- **Upstream system.** ЕАИС (ЭЛАР-Архив) is the archive's main system and can be unavailable. The backend retries uploads automatically. The UI shows ЕАИС status and the retry countdown everywhere, and operators can resend by hand. In the MVP it is mocked at `/mock-eais`.
- **Workflow objects.**
  - **Шифр:** Фонд / Опись / Дело / Лист, shown as `Ф.1 Оп.1 Д.12 · л.3`.
  - **Дело:** a case, i.e. a folder of pages.
  - **Лист:** a page.
  - **Фонд:** a collection, with its фондообразователь (the organisation that created it).
  - **Подборка:** a user's set of pages for a certificate.
- **OCR outputs.** Text with word coordinates and confidence (`conf` 0–100; below 60 is low). Words keep both the original OCR text and the corrected text. Quality is measured as CER (character error rate). Pages export as TXT, JSON, hOCR, ALTO or searchable PDF.
- **OCR engines.** Tesseract today. A GPU engine is coming: `engine` and `ocr_engine` can then be `"vlm"`, with the same word schema. With `vlm`, a GPU cold start can add 30–90 s, so a page can stay `running` for longer. The UI shows progress and keeps polling.
- **Updates.** The backend has no push. The UI polls health, the queue and notifications.

## Capabilities and Constraints

- **Modules.**
  - M1: upload (folder watcher or browser drag&drop), validation, queue, errors, journal, stats, manual шифр fix.
  - M2: OCR review and correction, re-OCR with a language choice, exports.
  - M3: search with query syntax (`"фраза"`, И/ИЛИ/НЕ, `-слово`), facet filters, fuzzy levels, sorting, results grouped by case, history, saved queries, подборки with XLSX/CSV/ZIP export.
- **Roles and access** follow handoff §2. Screens and actions a role cannot use are not rendered. Restricted cases are visible only to admin and archivist, who see them marked 🔒. Nothing in the UI may hint to other roles that they exist.
- **Re-OCR is destructive.** Re-running OCR for a case overwrites manual corrections, so it needs explicit confirmation.
- **Languages and scripts** (with their badges):
  - `ru`, badge RU: Russian, including pre-1918 spelling.
  - `kk-cyrl`, badge KK: Kazakh, current Cyrillic script.
  - `kk-latn`, badge KK-лат: Kazakh Latin «яналиф», 1929–1940.
  - `kk-arab`, badge KK-араб: Kazakh Arabic script «төте», before 1929. Right-to-left.
  - A screen can mix them.
- **UI language:** Russian. All strings live in one place, because a Kazakh UI may be added later. The backend sends error messages already in Russian.
- **Offline delivery:** no CDNs, remote fonts or analytics. Fonts are bundled and must cover Cyrillic, Kazakh (ә ғ қ ң ө ұ ү һ і) and Arabic.
- **Performance:** search answers in under 2 s; at least 30 concurrent users; pages stay light on office PCs.
- **Security:** escape all user data. Only server-escaped search snippets (`<mark>` only) are inserted as HTML. Session is a cookie only: no tokens or session data in localStorage, only UI preferences.
- **Open decisions:**
  - Kazakh UI language: possible later, not scheduled.
  - Production hosting details beyond "same origin as the backend".

## Brand Commitments

None. There is no mandated logo, emblem, palette or name styling. The product name used in the UI is «Цифровой архив Астаны».

## Evidence on Hand

- `docs/FRONTEND_HANDOFF.md`: product, roles, API contract with real responses from a seeded instance, data rules, and non-functional requirements.
- The backend repo's demo seed: 4 demo accounts (password = login) and sample cases in all four scripts. It is reachable only through a running backend; it is not in this repo.
- **Backend repo** at `../astana-archive` (found 2026-11-12; read-only for this project). It holds `docs/ARCHITECTURE.md`, `docs/TZ.pdf`, `docs/VLM_SELECTION.md`, the reference UI `app/static/app.js`, screenshots, and its old `docs/DESIGN.md`. The old DESIGN.md is evidence of the previous look only; the new visual world replaces it.
- **No real-world data yet:** no user research, usage metrics, testimonials or real-world volumes. Do not fabricate them.

## Product Principles

1. **The scan is the authority.** Text is always traceable to the page image it came from. Corrections and search hits point back to word positions on the original.
2. **Trust is earned per word.** Make OCR confidence visible where it matters: low-confidence words and pages surface first. Corrections are kept against the original OCR text, and nothing overwrites them without explicit confirmation.
3. **Every script is a first-class citizen.** Russian and all three Kazakh scripts (Cyrillic, Latin, Arabic) get equal care in search, display and direction. RTL is never an afterthought.
4. **Access is invisible.** What a role can't use, it doesn't see. For non-editors, restricted material leaves no trace.
5. **Honest system state.** ЕАИС outages, retries, long recognition runs and errors are shown plainly with what happens next. They are never hidden.

## Accessibility & Inclusion

- WCAG AA contrast.
- Visible focus on every interactive element.
- Full keyboard operation; this matters most for archivist correction work.
- Hit targets at least 36 px.
- Toasts announced with `role="status"`.
- Correct `dir` handling for Arabic-script Kazakh, and `dir="auto"` for lists that mix scripts.

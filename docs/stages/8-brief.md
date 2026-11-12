# Stage 8 brief: cases, review queue, admin (§6 #5, #7, #11)

The parallel build follows `docs/stages/parallel-rules.md`. Read it first.

## Sources

- **Handoff:** §2 (Дела: everyone can open, only EDITORS can re-OCR; Review: EDITORS only; Admin: admin only; restricted rules and 🔒 for editors only), §4, §5.3, §5.6.
- **Token spec:** `docs/stages/2-design-system.md`. `ShifrPlate` is the full variant on the case card and compact in lists.

## Deliverables

1. **`/dela` — the case list.**
   - Search `q` (шифр or title) and a fond filter.
   - A table: шифр, title (`dir="auto"`), years, langs, pages done/total, gaps («пропущены л. 4, 7»), low-confidence count, 🔒 for editors.
   - Rows open `/dela/:id`.
   - Loading, empty and error states.
2. **`/dela/[id]` — the case card.**
   - The full ShifrPlate, metadata, and the ЕАИС card link (`/mock-eais/api/cases/{eais_case_id}`), opened in the same origin.
   - A **thumbnail grid** through `/api/pages/{id}/image?w=200`: lazy-loaded, with the leaf number, a status badge, and a low-confidence marker. Each links to `/page/:id`.
   - Gaps are shown inline as placeholders for the missing leaves.
   - Case export (txt/json/hocr/alto/pdf) through `download()`. When `pages_done === 0`, export is disabled and the reason is shown.
   - **Re-OCR** (EDITORS only): a language choice (auto, ru, kk-cyrl, kk-latn, kk-arab) and a confirm modal that states plainly that manual corrections will be overwritten. The destructive button is in the error colour. Afterwards, show a toast with `queued` and poll the case until it is done.
   - A 404 shows the shared not-found state.
3. **`/review` — Очередь проверки** (EDITORS).
   - Pages worst-first: шифр, leaf, lang, mean_conf with the meter, low-word count.
   - «Открыть» goes to `/page/:id?mode=edit`. Show the count and an empty state («Очередь пуста»).
4. **`/admin` — Администрирование** (admin).
   - **ЕАИС switch:** shows `/mock-eais/api/status`; toggling it POSTs `{online}` after a confirm when going offline. Label it as the demo outage switch.
   - **Users:**
     - a table with username, full name and role;
     - create a user (username, password, role, full name) in a modal form with validation;
     - change a role or reset a password through PATCH, with a note that a password change logs the user out.
   - **Service health** from the health store and `/api/health`: workers with age and ok, free disk with the low-disk warning, OCR engine (tesseract/vlm/auto), tesseract version, last backup, server time.
5. **Tests:**
   - re-OCR needs confirmation and is absent for operator and reader;
   - 🔒 shows for editors only;
   - gaps are rendered;
   - admin-only gating;
   - the user-form validation.

## Exit criteria

- Your own lint and tests pass. Report the full typecheck result.
- Proxy mode against the real backend: `/dela` as reader (restricted case absent) and as archivist (🔒 present), the case card, `/review` as archivist, and `/admin` as admin.
- **Do not** re-OCR a real case on the dev backend; demonstrate the confirm modal only and cancel it. Don't create users on the dev backend (there is no delete endpoint); demonstrate create-user in mock mode on your port and run `nuxt prepare` after.
- Toggle the ЕАИС switch off and back **on** once; leave it online.
- Screenshots: the dela list, the case card with thumbnails and gaps, the re-OCR confirm modal, the review queue, and admin (all three sections).

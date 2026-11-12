# Stage 3 review

| Round | Verdict | Critical | Major | Minor | Full report |
|---|---|---|---|---|---|
| 1 | FAIL | 0 | 2 | 6 | `.3-review-round1.txt` |
| 2 | **PASS** | 0 | 0 | 3 | `.3-review-round2.txt` |

## Round 1 → fixes dispatched

- Majors: solid-button focus invisible (outline = fill, offset 0); checkbox/switch/radio click targets under 36 px. Both also correct wrong claims in the spec's Stage 3 note.
- Minors fixed now: 3 (404 toast copy), 4 (reset stores on logout), 5 (catch-all route in shell), 6 (offline check also catches http:// and //host).
- Minors deferred to Stage 4 (login and layout are replaced there): 7 (login submit disabled), 8 (interim link size; PageErrorState role="alert").

## Round 2: PASS (2026-11-12)

Reviewer re-measured every round-1 fix on the live specimen. Stage 3 gate passed.

Carried into Stage 4 (minors): label `::after` overlay conflicts with the `required` asterisk and links in label/description; `download()` should keep the server 404 detail for already-visible objects; spec note to record the overlay limits. Also from round 1: login submit disabled (7), interim layout link and PageErrorState `role="alert"` (8).

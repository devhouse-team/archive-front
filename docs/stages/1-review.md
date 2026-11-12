# Stage 1 review — PRODUCT.md

Reviewer: `reviewer` agent (Opus, run via `claude -p --agent reviewer`). Scope: PRODUCT.md vs handoff §1, §2, §7, §8 and interview facts.

## Round 1 — FAIL (0 critical · 3 major · 10 minor)

Major: reader access too narrow (§2 gives reader Дела open-only and Подборки); «archivist's correction is final» contradicted re-OCR overwrite (§5.3); per-role start screens missing (§2).
Minor: invented official institution name; «all on office PCs» vs mobile readers; «three historical Kazakh scripts» (kk-cyrl is current); «UI handles retries» (backend retries); daily-only stats; 🔒 for editors and archivist M1 access missing; layout commitment in principle 1; localStorage rule stricter than §7; CER, lang badges and `vlm` engine missing; `VLM_SELECTION.md` missing from unavailable docs.
All fixed.

## Round 2 — PASS (0 critical · 0 major · 2 minor)

1. [minor] vlm 30–90 s is a GPU cold start, not normal recognition time (§8). Fixed.
2. [minor] «answer a certificate request in one sitting» not sourced. Replaced with §7 target «search under 2 s». Fixed.

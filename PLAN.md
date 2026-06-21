# Whetstone — Improvement Plan

Full backlog from the project review. Checked items are implemented; unchecked
items are proposed but not yet done. Numbers reference the original review.

## Constraints (do not break)

- App stays **fully static** — no runtime LLM/API calls.
- **Attempt-log format** (`Attempt` shape, `whetstone.attempts.v1` array) must stay stable so ratings remain comparable over months.
- **Elo semantics** in `scoring.ts` stay stable unless the change is deliberate and documented.

## Correctness / footguns

- [x] **1 — Dev no longer pollutes real scores.** Namespace the localStorage key in dev so eyeballing `unreviewed` generated exercises never writes into the real attempt log. (`src/lib/scoring.ts`)
- [x] **2 — Robust numeric answer matching.** Fix `checkInput` so thousands separators (`1,000`) and European decimals (`12,5` / `1.234,5`) parse correctly instead of `1,000 → 1`. (`src/lib/session.ts`)
- [x] **3 — Honest keyboard hint.** Derive the `1–N select` hint from the current exercise's choice count instead of hardcoding `1–4`. (`src/routes/session/+page.svelte`)
- [x] **4 — "Another round" gives fresh material.** On a daily session, the button now starts a mixed session instead of re-rolling the date-seeded set. (`src/routes/session/+page.svelte`)

## Testing & tooling

- [x] **5 — Test suite locks the contract.** Vitest covering Elo replay, streak edges, import de-dupe, weakness ordering, and `checkInput` normalization — guards the attempt-log format and Elo semantics. (`src/lib/*.test.ts`, `package.json`)
- [ ] **6 — Lint/format + CI.** Add ESLint + Prettier and a CI job running `check` + `test` + `build` so broken packs and type/style regressions fail loudly.
- [ ] **7 — Build-time pack validation.** A `scripts/validate-packs.mjs` (reusing the generator's `validate`) wired into build/CI so a malformed exercise fails the build instead of being silently `console.warn`-skipped at runtime (`exercises/index.ts`).

## Scoring quality

- [x] **9 — Sessions target weakness.** Daily/mixed sessions order domains weakest-rating-first so practice focuses on rust. Self-graded ratings flagged as self-reported in the report. (`src/lib/session.ts`, report UI)
- [ ] **8 — Provisional K-factor.** Use a higher K for a domain's first ~10 attempts, then lower, so early ratings aren't whipsawed by one lucky/unlucky answer. Deliberate, documented, versioned change to Elo semantics.

## Features (all static-compatible)

- [ ] **10 — PWA.** Add a manifest + service worker so the static app is installable and works offline on mobile (fits the `adapter-static` setup).
- [ ] **11 — Review / drill surface.** A "drill my misses" mode and per-exercise history; surface the already-in-schema `explanation` more prominently.

## Domains & subdomains (design)

Domains in `DOMAIN_LIST` are the **coarse, stable** axis — `domain` is the key
stored in every `Attempt`, so it must stay broad and slow-changing. Finer
distinctions (Python vs. C, linear algebra vs. calculus, PyTorch vs. plain
Python) should **not** become top-level domains: that explodes the selection UI,
breaks "test me on everything", and bloats the stable log key space with things
that are really one subject.

- [ ] **15 — Optional `subdomain` facet.** Add an optional `subdomain` (a.k.a.
  `track`) string to `Exercise` *and* `Attempt`. Optional ⇒ backward-compatible
  with `whetstone.attempts.v1` (old attempts read as `undefined`), so it adds an
  axis without changing the stable format. `domain` stays primary; `subdomain` is
  a secondary breakdown. Prefer this over overloading `tags` (which is an
  unstructured grab-bag: `generated`, `unreviewed`, `sets` all live there).
  - **Granularity is per-domain and free-ish but enumerated, not a rigid
    taxonomy.** One axis carries whatever level makes sense: `math` →
    `linear-algebra` / `calculus`; `code` → `python` / `c` / `cpp`; libraries are
    just more specific subdomains, `code` → `pytorch` / `numpy`. Don't build a
    two-level domain→language→library tree; let the subdomain label absorb it.
  - **Translation is the one two-axis case.** A translation exercise has target
    *and* base language. Start with a `language`/`translation` domain whose
    `subdomain` is the target language and a fixed base (IT/EN), encoded as a
    pair (`it-en`, `en-it`) only if the base genuinely varies.
- [ ] **16 — Dashboard drill-down.** Keep one top-level card per domain
  (accuracy, streak). Subdomains are a drill-down *inside* a domain
  (per-subdomain accuracy bars: Python 80% / C 60% / PyTorch 45%), never new
  top-level cards.
- [ ] **17 — Optional subdomain selection.** Domain checkboxes in `prefs.ts`
  stay as-is. Add subdomain filter *chips* that appear only when a domain is
  selected; leaving them all off ⇒ whole domain. Keep the simple path simple.
- [ ] **18 — Generator targets a subdomain.** Add `--subdomain <id>` to
  `generate.mjs` so a run can focus (e.g. PyTorch, linear algebra, C). The
  per-domain prompt mentions it can specialize; the generated exercises carry the
  `subdomain` field. (Done for `code` languages already: `code.lang` now spans
  `python`/`javascript`/`c`/`cpp`.)
- [ ] **19 — Candidate new domains.** Highest-value adds: `language`/`translation`
  (per **15**) and `vocabulary`. Only add a domain once a pack exists for it
  (the step-3 rule in `types.ts`) — empty domains are worse than none.

## Generator (`scripts/generate.mjs`)

- [ ] **12 — Request timeout + retry.** Wrap the `chat()` fetch in an `AbortController` timeout so a hung local model doesn't stall the run.
- [ ] **13 — Verifier pass.** A second LLM call (or independent re-solve + compare) before tagging, to shrink the manual audit queue — small models "write confident nonsense."
- [ ] **14 — Semantic de-dupe.** Embeddings-based similarity to catch paraphrased duplicates that the lexical `normalizePrompt` check misses. (Low priority for local use.)

## Verification

- [x] `npm run check` passes (svelte-check / types).
- [x] `npm test` passes.
- [x] `npm run build` passes.

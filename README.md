# SCOPE

**Self-Cognitive Observation and Performance Evaluation** — a personal
instrument for keeping your brain working while the LLMs do the typing.

Short, mixed sessions of exercises across six domains — mathematics, logic,
code, Japanese (beginner), LaTeX, and general/trick knowledge — with an
Elo-style rating per domain so you can watch yourself improve (or rust).

## Run it

```sh
npm install
npm run dev
```

Static build (`npm run build`) outputs a fully static site via
`adapter-static` — no server, no API keys, all state in `localStorage`. It can
be dropped into a SvelteKit personal site as-is (the routes are `/`,
`/session`, `/library`).

## How it works

- **Exercises** are plain JSON packs in `src/lib/exercises/packs/`. Every
  `*.json` there is auto-loaded (and validated, with bad entries skipped and
  warned about). Schema in `src/lib/types.ts`. Three exercise types:
  - `choice` — multiple choice (choices are shuffled per showing)
  - `input` — free text, checked against `answer` + `accepted` variants,
    case/space/punctuation-forgiving, numeric-tolerant
  - `self` — work it out on paper, reveal, grade yourself (used for "write
    this LaTeX", "write these kana", proof-style puzzles)
- **Sessions** prefer exercises you've never seen, then ones you last missed,
  then least-recently-seen. The daily session is date-seeded — same set all
  day, no rerolling until you get a clean sheet.
- **Scores**: each domain has an Elo rating starting at 1000. An exercise of
  difficulty *d* "plays" at `1000 + (d−3)·150`, K=24 — beating hard exercises
  pays more than farming easy ones. Ratings are replayed from the raw attempt
  log (`localStorage`, exportable as JSON from the dashboard), so the scoring
  function can evolve without losing history. The dashboard can also **import**
  a previously exported log — handy if browser data gets wiped or you move
  machines. Imports merge and de-dupe (on exercise + timestamp), so re-importing
  the same file is a no-op.

## Generating new exercises (local LLM)

The app never calls an LLM. Generation is a separate offline CLI that speaks
to any OpenAI-compatible endpoint — ollama, llama.cpp server, LM Studio,
vLLM, or a paid API if you ever feel like it:

```sh
# defaults: http://localhost:11434/v1 (ollama), model qwen2.5:32b
npm run generate -- --domain math --count 5 --difficulty 2-4

# explicit
SCOPE_BASE_URL=http://localhost:8080/v1 SCOPE_MODEL=my-31b \
  node scripts/generate.mjs --domain japanese --count 8 --difficulty 1-3

# skew the difficulty mix: weighted buckets, picked per exercise
npm run generate -- --domain math --count 20 --difficulty 1-2,3,4-5 --weights 10,20,10
```

`--difficulty` takes comma-separated levels or ranges (`3`, `2-4`, `1-2,3,4-5`).
`--weights` sets the relative frequency of each bucket, aligned by index — the
example above generates roughly 25% easy (d1–2) / 50% medium (d3) / 25% hard
(d4–5). Omit `--weights` for an equal (uniform) spread, the default. Difficulty
is drawn per exercise, so one run can fill a whole range.

Re-running the same `--domain` on the same day **appends** to that day's pack
(`gen-<domain>-<date>.json`); it never overwrites, and ids keep incrementing.

Config (`SCOPE_BASE_URL`, `SCOPE_MODEL`, `SCOPE_API_KEY`) can also live in a
`.env` file at the project root instead of the shell — copy `.env.example` to
`.env` and edit. Shell env vars and `--flags` still override it. The `.env` is
git-ignored; only the offline generator reads it.

Generated exercises are validated (schema, answer∈choices, dedupe against
every existing prompt), tagged `generated` + `unreviewed`, and written to
`src/lib/exercises/packs/gen-<domain>-<date>.json`.

**Small models confidently write wrong answer keys**, so unreviewed exercises
are gated: the pack loader (`src/lib/exercises/index.ts`) skips anything still
tagged `unreviewed` in a build, so it never reaches the live app or your
scores. They *are* loaded in `npm run dev` so you can eyeball them. Verifying
an exercise just means removing its `unreviewed` tag — there's no separate
folder to move files between, since one pack file mixes reviewed and
unreviewed items.

Run `npm run audit` for a compact list of everything still awaiting review
(add `--json` for one object per line). The generation prompts live in
`prompts/` (system prompt + per-domain guidance) — tune them to your taste.

## Monthly maintenance

`prompts/claude-update.md` is a ready-made prompt to paste into a Claude Code
session about once a month. It audits unreviewed generated exercises (run
`npm run audit` to list them; fixing or deleting wrong ones, dropping the
`unreviewed` tag from survivors), rebalances thin domains, freshens the stalest
domain with new hand-written material, and reports back. Your attempt log and
scoring stay untouched so history remains comparable.

## Extending

- New pack: drop a JSON file in `src/lib/exercises/packs/` — nothing to
  register.
- New domain: add it to `DOMAINS`/`DOMAIN_LABELS` in `src/lib/types.ts` and
  write `prompts/domains/<name>.md` for the generator.
- Prompts support `$KaTeX$`, `$$display math$$`, and `` `inline code` ``;
  multi-line snippets go in the `code` field.

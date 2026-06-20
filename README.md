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
  function can evolve without losing history.

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
```

Generated exercises are validated (schema, answer∈choices, dedupe against
every existing prompt), tagged `generated` + `unreviewed`, and written to
`src/lib/exercises/packs/gen-<domain>-<date>.json`. The app picks them up on
the next dev reload/build.

**Small models confidently write wrong answer keys.** Review generated packs
before trusting your scores. The prompts live in `prompts/` (system prompt +
per-domain guidance) — tune them to your taste.

## Monthly maintenance

`prompts/claude-update.md` is a ready-made prompt to paste into a Claude Code
session about once a month. It audits unreviewed generated exercises (fixing
or deleting wrong ones), rebalances thin domains, freshens the stalest
domain with new hand-written material, and reports back. Your attempt log and
scoring stay untouched so history remains comparable.

## Extending

- New pack: drop a JSON file in `src/lib/exercises/packs/` — nothing to
  register.
- New domain: add it to `DOMAINS`/`DOMAIN_LABELS` in `src/lib/types.ts` and
  write `prompts/domains/<name>.md` for the generator.
- Prompts support `$KaTeX$`, `$$display math$$`, and `` `inline code` ``;
  multi-line snippets go in the `code` field.

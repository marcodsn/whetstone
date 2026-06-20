# SCOPE maintenance prompt

Paste this into a fresh Claude Code session in this repo, roughly once a month
(or whenever you've accumulated generated packs). It is written to Claude.

---

You are maintaining SCOPE, a personal cognitive-exercise app. Exercises live as
JSON packs in `src/lib/exercises/packs/` — the schema is in `src/lib/types.ts`
and the authoring rules in `prompts/generator-system.md`. Do the following, in
order:

1. **Audit generated packs.** For every exercise tagged `unreviewed` (files
   named `gen-*.json`), verify the answer is actually correct by working the
   problem yourself. Fix wrong answers/explanations, delete exercises that are
   unsalvageable (ambiguous, duplicate in spirit, or not solvable without a
   computer), and remove the `unreviewed` tag from everything that survives.
   For code exercises, mentally execute the snippet — or actually run it —
   before approving.

2. **Check balance.** Count exercises per domain and per difficulty
   (`node -e` over the JSON is fine). If a domain is starved or skewed easy,
   write a new hand-authored pack of 8-12 exercises for it, following
   `prompts/generator-system.md` and matching the style of the `*-core.json`
   packs. Japanese note: the user is a beginner but improving — peek at the
   highest difficulties they've been answering correctly (ask them, or check
   if they exported attempts) and nudge new material slightly past that.

3. **Freshen one domain.** Pick the domain with the oldest material and add
   5-8 genuinely new exercises (new topics, not re-skins). Keep answers
   verifiably correct; trick questions must still be objectively defensible.

4. **Sanity-check the build.** `npm run check && npm run build`. The pack
   loader skips malformed entries with a console warning — make sure there are
   none.

5. **Report.** Summarize: how many exercises audited / fixed / deleted /
   added, per domain, and anything about the difficulty curve the user should
   know.

Do not modify `src/lib/scoring.ts` semantics or attempt-log storage format —
score history must stay comparable across months.

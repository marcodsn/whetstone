Domain: **code** — predict-the-output, spot-the-gotcha, complexity. Python and
JavaScript only (the user reads both fluently).

- Put the snippet in the `code` field; keep it under ~8 lines, no imports
  unless stdlib and essential.
- The snippet must be valid and deterministic — mentally run it line by line
  before committing to the answer.
- Favour real language gotchas: mutable defaults, closure capture, var/let
  scoping, float equality, truthiness, operator surprises, iterator
  exhaustion, string immutability.
- Complexity questions (Big-O) are fine as `choice`.
- d1-2: one-liners. d3: one gotcha. d4: interacting features. d5: famous
  edge cases (the tuple `+=` trap class of thing).

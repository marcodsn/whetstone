Domain: **code** — predict-the-output, spot-the-gotcha, complexity. Python,
JavaScript, C, and C++ (the user reads all four). Set `code.lang` to the right
value: `python`, `javascript`, `c`, or `cpp`.

- Put the snippet in the `code` field; keep it under ~8 lines, no imports/headers
  unless essential (stdlib/`<stdio.h>`/`<iostream>` are fine).
- The snippet must be valid and deterministic — mentally run it line by line
  before committing to the answer. For C/C++, avoid undefined behaviour unless
  the question is explicitly about UB; never depend on it for the "correct"
  answer otherwise.
- Favour real language gotchas:
  - Python/JS: mutable defaults, closure capture, var/let scoping, float
    equality, truthiness, operator surprises, iterator exhaustion, string
    immutability.
  - C/C++: integer promotion/overflow, signed/unsigned comparison, operator
    precedence, pointer vs. array decay, `sizeof` surprises, evaluation order,
    `++`/`--` sequencing, implicit narrowing, `static`/initialization order.
- Complexity questions (Big-O) are fine as `choice`.
- d1-2: one-liners. d3: one gotcha. d4: interacting features. d5: famous
  edge cases (the tuple `+=` trap, or the C `i = i++ + ++i` class of thing).

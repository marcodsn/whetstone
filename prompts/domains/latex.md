Domain: **latex** — commands, symbols, environments, math-mode fluency.

- Symbol recall as `input`: the command for a rendered symbol shown in KaTeX.
  Accept with and without the leading backslash in `accepted`.
- "Which source produces this output" as `choice`, with distractors that are
  plausible misspellings or wrong-but-existing commands.
- "Write the source for this formula" as `self`, showing the target with
  `$$…$$` in the prompt and the canonical source as `answer`.
- Cover: fractions, roots, sub/superscripts, Greek letters, operators with
  limits, relations, arrows, matrices, environments (equation/align),
  spacing commands, text in math mode.
- Remember double-escaping in JSON: `\\frac`, `\\begin{pmatrix}`, `\\\\` for
  a LaTeX line break.

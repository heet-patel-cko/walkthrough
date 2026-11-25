---
name: create
description: Turn any body of context (a codebase, PRs, AI-generated code, a design doc, a wiki page, an architecture or system design review, a ticket set) into a simple, interactive HTML walkthrough the user reads in their browser and can leave personal notes on. Use when the user asks to walk them through, explain, onboard them onto, or help them understand something large, or asks for a walkthrough.
argument-hint: "[beginner|familiar|expert] <what to explain>"
---

# Create a walkthrough

You write a walkthrough as **Markdown with a few directives**. A bundled script turns it into one self-contained HTML file with the styling, code highlighting and notes already built in. You never write HTML, CSS or JavaScript, and you never paste code: you point at it.

Paths below are relative to this skill's folder (the folder this file is in).

## Arguments

`$ARGUMENTS`

- If the first word is `beginner`, `familiar` or `expert`, that's the reader level, and the rest says what to explain.
  - `beginner`: explain every term, like for a new joiner.
  - `familiar`: knows the stack, new to this work.
  - `expert`: just the shape, the decisions and the risks.
- With no level, infer it from what the user said ("I'm new to Go" means `beginner`). If you can't tell, use `familiar`.
- If nothing says what to explain, use the conversation so far (for example "the work we just did"). Ask only if it's still unclear.

## Steps

1. **Work out the input.** Find out what's being explained and where it lives: a repo, PR numbers, files, a doc the user pasted or attached.
2. **Read the source properly** before writing. Note exact file paths and line numbers as you go, because you'll cite them.
3. **Pick a profile** from `references/profiles.md` (code or document) and follow its skeleton.
4. **Write `walkthrough.md`** in `~/Walkthroughs/<id>/`, where `<id>` is a short kebab-case name. The folder sits outside any repo on purpose: the walkthrough is personal. Use the format in `references/syntax.md`, which you must read before writing. `references/example.md` shows the shape of a finished one.
5. **Build:** `python3 scripts/build.py ~/Walkthroughs/<id>/walkthrough.md`. Fix every error it prints, such as wrong line ranges or missing files, and rebuild. Treat warnings as quality hints.
6. **Open it:** `open ~/Walkthroughs/<id>/walkthrough.html`. Tell the user in two or three lines what it covers. Also tell them they can select text or click a code line number to leave a note, then use *Copy for AI* in the Notes panel and run `/walkthrough:apply-notes`.

Don't read the built HTML back. It's an output, and the `.md` file is the source of truth.

## How to write it well

These are the qualities that make a walkthrough worth reading. Hold every section to them.

- **Plain words, short sentences.** One idea per sentence. Write for the reader level, not for yourself.
- **Define a term once.** Put each new term in the `:::glossary` block and write `[[term]]` wherever it's used. Readers get a hover definition, so you never explain it twice.
- **Follow one concrete example the whole way through**: one request, one order, one user, one decision. Pick it in the introduction, name it, and return to it in a `:::trace` box in each section ("Following order 1042: …"). This is the single most useful device for understanding.
- **Point, don't describe.** Every code or text excerpt must have a job, and the prose around it must point at specific lines. Use `hl=` to highlight the lines that matter and `pin=` with `((1))` markers so the prose can say "((1)) finds the bucket, ((2)) refills it". Never write "the first line does…" when you can pin it.
- **Short excerpts.** Show 5–25 lines, cut with ranges (`#L10-18,L40-52`). Never show a whole file of more than about 40 lines.
- **Say why, and warn.** Use `:::why` for the reason behind a decision and `:::watch` for anything surprising, risky or easy to get wrong. Include what's deliberately *not* there and why.
- **Lead with the answer.** Start with a `:::tldr` of 2–4 sentences, then the big picture, usually a `:::flow`, before any detail. Each `##` section opens with one sentence saying what it's for.
- **Fold the depth.** Put detail a first read can skip in `:::details`. The default path through the document should stay short.
- **Make review actionable.** When the reader has to check or approve something, give them `- [ ]` checklist items, each naming exactly what to look at.
- **Tell the truth about the source.** Cite only real files and lines. If something is uncertain, unfinished or temporary, say so in a `:::watch`.
- **Length follows the material.** Don't pad. A small change might need six sections, a large system twenty.
- **Give every heading a stable `{#id}`.** Notes and "updated" tracking hang off those ids.

## Files

- `references/syntax.md`: the Markdown format and every directive.
- `references/profiles.md`: section skeletons for code and documents.
- `references/example.md`: a short, complete example.
- `scripts/build.py`: the builder. Needs only `python3`.
- `assets/`: the template, CSS and JS. Never edit these per walkthrough.

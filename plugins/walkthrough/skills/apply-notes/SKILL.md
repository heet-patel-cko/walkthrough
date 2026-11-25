---
name: apply-notes
description: Apply notes the user exported from a walkthrough (text starting with "# Walkthrough notes", pasted or as a downloaded .md file). Rewrites unclear parts, makes requested changes to the underlying code or doc like review comments, answers questions, writes replies and rebuilds. Use whenever the user pastes or attaches walkthrough notes.
argument-hint: "[notes file]"
---

# Apply walkthrough notes

The shared files live in the `create` skill, the folder `../create` next to this skill's folder. The builder is `../create/scripts/build.py` and the format is `../create/references/syntax.md`.

## Find the notes

`$ARGUMENTS`

- If that's a file path, read the notes from it. Downloaded files are usually in `~/Downloads/<id>-notes-v<version>.md`.
- Otherwise, use the notes the user pasted in this conversation.
- If there are none, look for the newest `~/Downloads/*-notes-v*.md` and confirm with the user that it's the right one.

The notes start with `# Walkthrough notes` and name the walkthrough's `Source:` file. Each note has:
- a type
- a section `#id` and a note id
- usually the exact quoted text, and for code a `file:line` location

Open the source `walkthrough.md` and work from each note's section. Don't re-read the whole walkthrough or the built HTML.

## Handle each note by its type

- **`clarify` (shown to the reader as "Explain better").** Rewrite only that part of the walkthrough in the way the note asks: simpler, an analogy, a worked example, a diagram, more depth or less. Don't change the underlying work.
- **`change` ("Change it").** Treat it like a review comment on the work itself.
  - For code, make the change in the real repository (`root` in the front matter), following that repo's conventions, and run its tests when that's practical.
  - For a document you can't edit, such as a wiki page, write the suggested change into the walkthrough as a `:::watch` titled "Suggested change" and say so in the reply.
  - Then update the walkthrough so it describes the new state.
  - If the change is large, risky or ambiguous, don't guess: reply with a question instead.
- **`question`.** Answer it in the reply. Also improve the walkthrough if the answer shows a gap other readers would hit.
- A note with a "follow-up" line was reopened after an earlier reply. Read that reply first, then go further.

Follow the writing rules in `../create/SKILL.md` for anything you rewrite. Keep every heading's `{#id}`: change the heading text if you need to, but never the id.

## Then

1. **Write replies** to `replies.json`, next to `walkthrough.md`. Merge them with any replies already in the file:
   ```json
   { "n1abc23": { "status": "resolved", "reply": "Rewrote 'Deciding one request' with a coffee-card analogy and a pinned excerpt." } }
   ```
   - Use `"status": "resolved"` when the note is handled.
   - Use `"open"` when you need something from the user, and put your question in `reply`.
   - Keep each reply to one or two sentences, and say *what changed and where*.
2. **Bump `version`** in the front matter.
3. **Rebuild:** `python3 ../create/scripts/build.py <path to walkthrough.md>`. Fix any errors and rebuild.
4. **Reopen it** with `open`. In the browser, each note shows your reply and resolved notes are greyed out. Sections that changed get an **Updated** badge.
5. **Report back.** List the notes you resolved and the ones left open, with your question. List any code you changed, with file paths, and say whether its tests ran and passed.

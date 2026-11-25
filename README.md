# Walkthrough

A Claude Code plugin that turns a large body of context (a codebase, a stack of PRs, AI-generated code, a design doc, a wiki page or an architecture review) into a simple, interactive HTML walkthrough that you read in your browser.

While you read, you can leave **personal notes** on any sentence or code line. When you're done, you hand them back to Claude, which either explains things better or changes the work itself, like a code review.

## Install

In Claude Code:

```
/plugin marketplace add heet-patel-cko/walkthrough
/plugin install walkthrough@walkthrough
```

Or from a terminal:

```bash
claude plugin marketplace add heet-patel-cko/walkthrough
claude plugin install walkthrough@walkthrough
```

Start a new session after installing. The only requirement is `python3`, which macOS already has.

## Commands

| Command | What it does |
|---|---|
| `/walkthrough:create [beginner\|familiar\|expert] <what to explain>` | Writes `~/Walkthroughs/<id>/walkthrough.md`, builds `walkthrough.html` and opens it. The level is optional and defaults to `familiar`. |
| `/walkthrough:apply-notes [notes file]` | Applies your exported notes, then rebuilds. Give it a downloaded notes file, or paste the notes first and run it with no file. |

Examples:

```
/walkthrough:create beginner PRs #11 to #17 in this repo
/walkthrough:create expert the design doc I just pasted
/walkthrough:create what you just built
/walkthrough:apply-notes ~/Downloads/rate-limiter-notes-v1.md
```

You can also ask in plain words, such as "walk me through this module", and Claude picks the right skill. Reader levels:

- **beginner** explains every term.
- **familiar** assumes you know the stack but not this work.
- **expert** covers just the shape, the decisions and the risks.

## Notes

- **Add a note:** select any text, click a code line number, or use **+ Note** on a heading. Each note has a type:
  - **Explain better:** Claude rewrites that part of the walkthrough the way you ask.
  - **Change it:** a review comment on the work itself. Claude changes the code or doc, then updates the walkthrough.
  - **Question:** Claude answers in a reply.
- **Hand the notes back:** open the **Notes** panel, click **Copy for AI**, paste into Claude and run `/walkthrough:apply-notes`. Or use **Download .md** and run `/walkthrough:apply-notes <file>`.
- **See the results:** after Claude applies the notes and rebuilds, each note shows Claude's reply, resolved notes turn grey, and changed sections get an **Updated** badge.

Notes are stored only in your browser for that walkthrough. They are never written into the HTML file, so sharing the file shares no notes.

## What's inside

```
plugins/walkthrough/skills/
  create/
    SKILL.md             how Claude writes a walkthrough
    references/          source format, layouts for code and documents, an example
    scripts/build.py     Markdown + directives -> one self-contained HTML file
    assets/              the page template, CSS and JS (shared, never regenerated)
  apply-notes/
    SKILL.md             how Claude applies your notes and replies
```

To try the builder by hand:

```bash
python3 plugins/walkthrough/skills/create/scripts/build.py plugins/walkthrough/skills/create/references/example.md -o /tmp/example.html && open /tmp/example.html
```

## License

MIT. See [LICENSE](LICENSE).

# Walkthrough source format

A walkthrough is one `walkthrough.md` file: front matter, then Markdown plus a few directives. Raw HTML is escaped, so don't use it.

## Front matter

```
---
title: How the rate limiter decides
subtitle: What happens when one client sends too many requests
id: rate-limiter                 # stable; the reader's notes are stored under it. Never change it.
version: 1                     # bump on every rebuild after applying notes
level: familiar                # beginner | familiar | expert (shown in the header)
root: ~/code/my-service   # base folder for ::code paths (default: this file's folder)
repo_url: https://github.com/org/repo/blob/<commit-sha>   # optional: file headers become permalinks
---
```

Use a commit SHA in `repo_url`, not a branch, so the links keep pointing at the code you described.

## Headings

`## Section` and `### Subsection` become the contents sidebar, and notes attach to them. Give every heading an explicit, stable id:

```
## Deciding one request {#allow}
```

Don't use `#` (the title comes from the front matter) or `####`.

## Ordinary Markdown

You can use paragraphs, `**bold**`, `*italic*`, `` `code` ``, `[links](https://…)`, links to sections (`[deciding one request](#allow)`), `-` or `1.` lists (indent by 2 spaces to nest), `> quotes`, and pipe tables:

```
| Field | Meaning |
|---|---|
| `capacity` | The most requests a client can send in one burst |
```

## Pointing at real code or text: `::code`

```
::code src/rate_limiter.py#L23-37 hl=29-32 pin=24:1,31:2
```

- **path**: relative to `root`, or absolute. It works for any text file, including `.md` docs, YAML and SQL.
- **`#L36-49`**: the lines to show. Join ranges with commas (`#L1-5,L40-52`) and the gap shows as ⋯. With no range the whole file is shown, so only do that for short files.
- **`hl=29-32`** (optional): lines to highlight. Commas and ranges are allowed.
- **`pin=24:1,31:2`** (optional): put marker ① on line 24 and ② on line 31. Write `((1))` and `((2))` in the prose to refer to them.
- **`title="…"`** (optional): replaces the file path in the header.
- **`lang=py`** (optional): override the language detected from the extension.

The builder reads the real file, so line numbers and content are always accurate. It fails the build if a file or range doesn't exist. Use `::code` for everything that exists on disk. Never paste code that exists in a file.

## Text that isn't in a file: fenced blocks

For terminal output, a made-up illustration, a diff, or an excerpt from a pasted document, use a fence. An optional first line `title: …` becomes the header.

````
```json
title: Response when the limit is hit
{ "error": "rate_limited", "retry_after_seconds": 1 }
```
````

A ```` ```diff ```` fence colours lines starting with `+` and `-`.

## Callouts

```
:::why Why refill on use instead of on a timer?
A timer per client would cost a thread or a scheduled job each. Working out the refill from elapsed time costs nothing while a client is idle.
:::
```

| Directive | Use for | Default label |
|---|---|---|
| `:::tldr` | the 2–4 sentence answer at the top | In short |
| `:::why` | the reason behind a decision | Why |
| `:::watch` | surprises, risks, temporary things, suggested changes | Watch out |
| `:::trace` | the running example, at this step | Follow the example |
| `:::note` | anything else worth setting apart | Note |
| `:::details Summary text` | a fold readers can skip | More detail |

Text after the directive name replaces the label. Callouts can contain lists, code and other callouts. Close each one with `:::` on its own line.

## Flow diagram

One box per line in the form `Title | where | what`. Arrows are drawn between the boxes. The where and what parts are optional.

```
:::flow One request
A request arrives | `allow("client-a")` | The caller asks whether this client may go ahead
Refill | elapsed time × rate | Add back the tokens earned since last time
Spend or refuse | `tokens >= 1` | Take one token and say yes, or say no
:::
```

## Glossary

Define every term once, anywhere in the file, normally in a section at the end:

```
## Words used here {#glossary}
:::glossary
Token bucket: A counter that fills at a steady rate up to a maximum. Each request spends one token.
Monotonic clock: A clock that only moves forwards, even if the system time is changed.
:::
```

Then write `[[token bucket]]` or `[[buckets|token bucket]]` (the text shown, then the term) anywhere. The reader gets a dotted underline with a hover definition. The build warns about any undefined term.

## Checklists

```
- [ ] The refill is capped at `capacity`, so idle clients can't bank unlimited tokens
- [ ] Callers don't share one limiter across threads without a lock
```

The reader ticks items off in their browser. The state stays local and never goes into the file.

## Pins in prose

`((1))` renders the same numbered marker as `pin=…:1` on a code line. Use pins to tie each sentence to the line it's about.

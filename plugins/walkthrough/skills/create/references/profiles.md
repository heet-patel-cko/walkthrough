# Profiles

Pick the profile that fits, then adapt it. The skeletons are a starting point, not a form to fill in: drop sections that would be empty and merge ones that are tiny. Every walkthrough starts the same way and ends the same way.

**Always first:**
1. `:::tldr`: what this is and the one thing to take away.
2. **What you're about to read** `{#intro}`: the scope, the reader level, the running example you'll follow, and how the document is organised. Also say how to use it, for example "read one chapter, then review that PR".
3. **The big picture** `{#big-picture}`: a `:::flow` or a short table showing the whole thing at once, plus the 2–4 ideas the reader needs before the detail.

**Always last:**
- **Words used here** `{#glossary}`: the `:::glossary` block.
- **What happens next** `{#next}`: open questions, follow-up work, and what's deliberately not done yet.

---

## Code

Use this for PRs, a feature across several PRs, AI-generated changes, an unfamiliar module, or a whole repo.

**Choose the order first.** For a stack of PRs, use one chapter per PR, in merge order. For a feature or module, follow the running example through the code in the order the computer runs it. Don't mix the two orders without saying so.

Each chapter (one PR, or one stage of the flow) looks like this:

- **What this is for**: one or two sentences. Include the base branch, the ticket, and whether merging changes behaviour.
- **Files**: a table of each file and what it is, one line per file.
- **The code**: one `###` per idea, with `::code` excerpts using `hl` and `pin`, and prose that points at the pinned lines. End each idea with a `:::trace` for the running example.
- **What to check when reviewing** `{#<chapter>-review}`: a `- [ ]` checklist. Each item names a concrete thing to look at and the question to ask about it.
- **How it's tested** `{#<chapter>-tests}`: a table of each test class and what it proves, plus one pinned excerpt of the most important test.
- **What it doesn't do yet**: if anything. Link to the chapter that does it.

Also include:
- **The output** `{#output}`: what the user or the system actually sees at the end, using real output in a fenced block.
- `:::watch` boxes for anything marked TODO or temporary, any feature flags, and anything that only works in some environments.

For AI-generated code, add a **Decisions the AI made** `{#decisions}` section. List the choices the code makes that the user may not have asked for, such as libraries, data shapes, error handling and naming. Each one gets a `:::why` and a checklist item, so the user can push back on a choice with a "Change it" note.

---

## Document

Use this for a wiki page (Confluence, Notion and so on), a design doc, an RFC, an architecture or system design review, a runbook, or a policy. The source is often pasted, so quote it in fences or `>` quotes, keeping quotes short and citing the heading they came from.

Use these sections:

- **What the document claims** `{#claims}`: the proposal or decision in plain words, as a numbered list.
- **The context** `{#context}`: the problem, its constraints, and who's affected. Separate what the document states from what it assumes.
- **How it works** `{#design}`: walk the design with the running example (one request, one tenant, one failure). Use `:::flow` for the main path. Use a table for components and what each one owns.
- **The decisions** `{#decisions}`: one `###` per key decision, each with the choice, the alternatives considered, and a `:::why`. If the document gives no alternatives, say that in a `:::watch`.
- **Risks and failure modes** `{#risks}`: what breaks and what happens when it does. Cover data, security, scaling, cost and operability, as relevant.
- **Gaps and open questions** `{#gaps}`: what the document doesn't answer, and claims that have no evidence. Quote the claim, then say what's missing.
- **What to check** `{#review}`: a `- [ ]` checklist for a reviewer.

For a **system design or architecture review**, add **Non-functional requirements** `{#nfr}`. This is a table covering latency, throughput, availability, consistency, security and compliance, with columns for what the document says and what it should say.

For a **runbook**, replace "decisions" with **Steps** `{#steps}`. Each step gets the command or action, how to tell it worked, and what to do if it didn't.

---

## Mixed input

If the input is code plus a design doc (for example, "does this PR match the RFC?"), use the Code skeleton and add a **Doc vs code** `{#doc-vs-code}` section. It's a table with three columns: what the document says, what the code does, and whether they match. Put each mismatch in a `:::watch`.

#!/usr/bin/env python3
"""Build a walkthrough: walkthrough.md (+ replies.json) -> one self-contained HTML file.

Usage: python3 build.py path/to/walkthrough.md [-o out.html]

No dependencies. The CSS and JS live next to this script in ../assets and are
inlined, so the AI never writes them. See ../references/syntax.md for the format.
"""
import hashlib
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")

CALLOUT_LABELS = {
    "why": "Why",
    "watch": "Watch out",
    "trace": "Follow the example",
    "tldr": "In short",
    "note": "Note",
}
CONTAINERS = set(CALLOUT_LABELS) | {"details", "flow", "glossary"}

errors, warnings = [], []


def esc(s):
    return html.escape(s, quote=True)


def slug(s):
    s = re.sub(r"<[^>]+>", "", s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "section"


# ---------------------------------------------------------------- inline

class Inline:
    def __init__(self, glossary):
        self.glossary = glossary  # lower term -> (term, plain definition)
        self.used_terms = set()

    def render(self, text):
        keep = []

        def stash(h):
            keep.append(h)
            return "\x00%d\x00" % (len(keep) - 1)

        # code spans first, so nothing inside them is touched
        text = re.sub(r"`([^`]+)`", lambda m: stash("<code>%s</code>" % esc(m.group(1))), text)
        text = esc(text)
        # glossary terms: [[term]] or [[shown text|term]]
        text = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]", lambda m: stash(self._term(m)), text)
        # links [text](url)
        text = re.sub(
            r"\[([^\]]+)\]\(([^)\s]+)\)",
            lambda m: stash('<a href="%s"%s>%s</a>' % (
                m.group(2),
                "" if m.group(2).startswith("#") else ' target="_blank" rel="noopener"',
                m.group(1))),
            text)
        # pins ((1)) -> numbered marker matching ::code pin=
        text = re.sub(r"\(\((\d{1,2})\)\)", lambda m: stash('<span class="pin">%s</span>' % m.group(1)), text)
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<em>\1</em>", text)
        while "\x00" in text:
            text = re.sub(r"\x00(\d+)\x00", lambda m: keep[int(m.group(1))], text)
        return text

    def _term(self, m):
        shown = m.group(1).strip()
        key = (m.group(2) or m.group(1)).strip().lower()
        if key not in self.glossary:
            warnings.append("glossary term not defined: [[%s]]" % key)
            return esc(shown)
        self.used_terms.add(key)
        return '<span class="term" tabindex="0" data-def="%s">%s</span>' % (esc(self.glossary[key][1]), esc(shown))


def plain(md):
    s = re.sub(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]", r"\1", md)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    return re.sub(r"[`*]", "", s)


# ---------------------------------------------------------------- code refs

def parse_ranges(spec, nlines):
    out = []
    for part in spec.split(","):
        part = part.strip().lstrip("L")
        if not part:
            continue
        a, _, b = part.partition("-")
        a = int(a)
        b = int(b.lstrip("L")) if b else a
        if a < 1 or b > nlines or a > b:
            raise ValueError("range L%s is outside 1-%d" % (part, nlines))
        out.append((a, b))
    return out


def parse_numset(spec):
    nums = set()
    for part in (spec or "").split(","):
        if not part:
            continue
        a, _, b = part.partition("-")
        nums.update(range(int(a), int(b or a) + 1))
    return nums


def parse_args(s):
    return {k: (v1 if v1 else v2) for k, v1, v2 in re.findall(r'(\w+)=(?:"([^"]*)"|(\S+))', s)}


LANG_BY_EXT = {
    ".cs": "cs", ".java": "java", ".kt": "kotlin", ".js": "js", ".jsx": "js", ".ts": "ts", ".tsx": "ts",
    ".py": "py", ".go": "go", ".rb": "rb", ".rs": "rust", ".sh": "sh", ".yml": "yaml", ".yaml": "yaml",
    ".json": "json", ".sql": "sql", ".tf": "hcl", ".md": "text", ".txt": "text", ".html": "html",
    ".css": "css", ".scala": "scala", ".swift": "swift", ".php": "php", ".c": "c", ".h": "c", ".cpp": "c",
}


def render_lines(rows, lang, label, link, hl=(), pins=None, cls=""):
    """rows: list of (lineno or None, text); None lineno + text '...' marks a gap."""
    pins = pins or {}
    out = ['<div class="code %s" data-lang="%s"%s>' % (cls, lang, ' data-file="%s"' % esc(label) if label else "")]
    if label:
        head = esc(label)
        if link:
            head = '<a href="%s" target="_blank" rel="noopener">%s</a>' % (esc(link), head)
        out.append('<div class="code-head">%s</div>' % head)
    out.append('<div class="code-body">')
    for n, t in rows:
        if n is None and t is None:
            out.append('<div class="cl gap"><span class="n"></span><span class="t">⋯</span></div>')
            continue
        c = "cl"
        if n in hl:
            c += " hl"
        if cls == "diff" and t[:1] in "+-":
            c += " add" if t[0] == "+" else " del"
        pin = '<span class="pin">%s</span>' % pins[n] if n in pins else ""
        num = "" if n is None else str(n)
        out.append('<div class="%s"%s><span class="n">%s</span><span class="t">%s</span>%s</div>' % (
            c, ' data-n="%s"' % num if num else "", num, esc(t) or " ", pin))
    out.append("</div></div>")
    return "".join(out)


# ---------------------------------------------------------------- blocks

class Builder:
    def __init__(self, meta, md_dir, glossary):
        self.meta = meta
        self.root = os.path.expanduser(meta.get("root", md_dir))
        if not os.path.isabs(self.root):
            self.root = os.path.normpath(os.path.join(md_dir, self.root))
        self.repo_url = meta.get("repo_url", "").rstrip("/")
        self.inline = Inline(glossary)
        self.sections = []     # {id, title, level, src}
        self.sec_id = "top"
        self.block_n = 0
        self.ids = set()
        self.coderefs = 0
        self.checks = 0

    # -- helpers
    def attrs(self):
        self.block_n += 1
        return ' data-sec="%s" data-b="%s.%d"' % (self.sec_id, self.sec_id, self.block_n)

    def track(self, src):
        if self.sections:
            self.sections[-1]["src"].append(src)

    def para(self, text):
        return "<p%s>%s</p>" % (self.attrs(), self.inline.render(text))

    # -- main entry
    def blocks(self, lines, depth=0):
        out = []
        i, n = 0, len(lines)
        para = []

        def flush():
            if para:
                out.append(self.para(" ".join(x.strip() for x in para)))
                para.clear()

        while i < n:
            line = lines[i]
            s = line.strip()
            self.track(line)
            if not s:
                flush(); i += 1; continue

            m = re.match(r"^(#{1,3})\s+(.*?)(?:\s+\{#([\w-]+)\})?\s*$", s)
            if m and depth == 0:
                flush()
                level = max(2, len(m.group(1)))
                title = m.group(2)
                hid = m.group(3) or slug(title)
                base, k = hid, 2
                while hid in self.ids:
                    hid = "%s-%d" % (base, k); k += 1
                self.ids.add(hid)
                self.sec_id, self.block_n = hid, 0
                self.sections.append({"id": hid, "title": plain(title), "level": level, "src": [line]})
                out.append('<h%d id="%s" data-sec="%s">%s</h%d>' % (level, hid, hid, self.inline.render(title), level))
                i += 1; continue

            if s.startswith("```"):
                flush()
                lang = s[3:].strip() or "text"
                j = i + 1
                body = []
                while j < n and not lines[j].strip().startswith("```"):
                    body.append(lines[j]); self.track(lines[j]); j += 1
                if j >= n:
                    errors.append("unclosed ``` fence starting: %s" % s)
                label = None
                if body and body[0].startswith("title:"):
                    label = body.pop(0)[6:].strip()
                rows = [(k + 1, t) for k, t in enumerate(body)]
                out.append('<div%s>%s</div>' % (self.attrs(), render_lines(
                    rows, lang, label, None, cls="diff" if lang == "diff" else "snippet")))
                i = j + 1; continue

            if s.startswith("::code "):
                flush()
                out.append(self.coderef(s[7:].strip()))
                i += 1; continue

            m = re.match(r"^:::(\w+)\s*(.*)$", s)
            if m and m.group(1) in CONTAINERS:
                flush()
                kind, rest = m.group(1), m.group(2).strip()
                j, depth_c, body = i + 1, 1, []
                while j < n:
                    t = lines[j].strip()
                    if re.match(r"^:::\w+", t):
                        depth_c += 1
                    elif t == ":::":
                        depth_c -= 1
                        if depth_c == 0:
                            break
                    body.append(lines[j]); j += 1
                if j >= n:
                    errors.append("unclosed :::%s block" % kind)
                for b in body:
                    self.track(b)
                out.append(self.container(kind, rest, body, depth))
                i = j + 1; continue
            if m:
                errors.append("unknown directive :::%s" % m.group(1))

            if s.startswith("|"):
                flush()
                j = i
                rows = []
                while j < n and lines[j].strip().startswith("|"):
                    rows.append(lines[j].strip()); self.track(lines[j]); j += 1
                out.append(self.table(rows))
                i = j; continue

            if s.startswith(">"):
                flush()
                j, body = i, []
                while j < n and lines[j].strip().startswith(">"):
                    body.append(re.sub(r"^\s*>\s?", "", lines[j])); j += 1
                out.append('<blockquote%s>%s</blockquote>' % (self.attrs(), "".join(self.blocks(body, depth + 1))))
                i = j; continue

            if re.match(r"^([-*]|\d+\.)\s+", s):
                flush()
                j = i
                block = []
                while j < n:
                    t = lines[j]
                    if not t.strip():
                        # list continues only if the next non-blank line is indented or another item
                        k = j + 1
                        while k < n and not lines[k].strip():
                            k += 1
                        if k < n and (lines[k].startswith("  ") or re.match(r"^([-*]|\d+\.)\s+", lines[k])):
                            block.append(t); j += 1; continue
                        break
                    if j > i and not t.startswith(" ") and not re.match(r"^([-*]|\d+\.)\s+", t):
                        break
                    if j > i and not t.startswith(" ") and bool(re.match(r"^\d+\.", t)) != bool(re.match(r"^\d+\.", s)):
                        break
                    block.append(t); self.track(t); j += 1
                out.append(self.listblock(block, depth))
                i = j; continue

            para.append(line)
            i += 1
        flush()
        return out

    # -- pieces
    def coderef(self, spec):
        m = re.match(r'^(.*?)(?:\s+(\w+=.*))?$', spec)
        path, rest = m.group(1).strip().strip('"'), m.group(2) or ""
        path, _, ranges = path.rpartition("#") if "#L" in path else (path, "", "")
        args = parse_args(rest)
        full = path if os.path.isabs(os.path.expanduser(path)) else os.path.join(self.root, path)
        full = os.path.expanduser(full)
        try:
            with open(full, encoding="utf-8", errors="replace") as f:
                src = f.read().split("\n")
            if src and src[-1] == "":
                src.pop()
        except OSError as e:
            errors.append("::code %s: %s" % (path, e.strerror))
            return '<div class="code missing"%s>Missing file: %s</div>' % (self.attrs(), esc(path))
        try:
            rngs = parse_ranges(ranges, len(src)) if ranges else [(1, len(src))]
        except ValueError as e:
            errors.append("::code %s: %s" % (path, e))
            return ""
        if not ranges and len(src) > 80:
            warnings.append("::code %s has %d lines and no range; pick the lines that matter" % (path, len(src)))
        rows = []
        for k, (a, b) in enumerate(rngs):
            if k:
                rows.append((None, None))
            rows.extend((x, src[x - 1]) for x in range(a, b + 1))
        hl = parse_numset(args.get("hl"))
        pins = {}
        for p in (args.get("pin") or "").split(","):
            if ":" in p:
                ln, num = p.split(":", 1)
                pins[int(ln)] = num
        lang = args.get("lang") or LANG_BY_EXT.get(os.path.splitext(path)[1].lower(), "text")
        label = args.get("title") or path
        link = ""
        if self.repo_url and not os.path.isabs(path):
            link = "%s/%s#L%d-L%d" % (self.repo_url, path, rngs[0][0], rngs[-1][1])
        self.coderefs += 1
        return '<div%s>%s</div>' % (self.attrs(), render_lines(rows, lang, label, link, hl, pins, cls="ref"))

    def container(self, kind, rest, body, depth):
        if kind == "glossary":
            items = []
            for line in body:
                if ":" in line and line.strip():
                    term, _, d = line.strip().partition(":")
                    items.append('<dt id="term-%s">%s</dt><dd>%s</dd>' % (
                        slug(term), esc(term.strip()), self.inline.render(d.strip())))
            return '<dl class="glossary"%s>%s</dl>' % (self.attrs(), "".join(items))
        if kind == "flow":
            boxes = []
            for line in body:
                if not line.strip():
                    continue
                parts = [p.strip() for p in line.split("|")]
                t = '<b>%s</b>' % self.inline.render(parts[0])
                if len(parts) > 1 and parts[1]:
                    t += '<span class="where">%s</span>' % self.inline.render(parts[1])
                if len(parts) > 2 and parts[2]:
                    t += '<span class="what">%s</span>' % self.inline.render(parts[2])
                boxes.append('<div class="box">%s</div>' % t)
            return '<div class="flow"%s role="img" aria-label="%s">%s</div>' % (
                self.attrs(), esc(rest or "Flow diagram"), '<div class="arrow">↓</div>'.join(boxes))
        a = self.attrs()
        inner = "".join(self.blocks(body, depth + 1))
        if kind == "details":
            return '<details%s><summary>%s</summary>%s</details>' % (a, self.inline.render(rest or "More detail"), inner)
        label = self.inline.render(rest) if rest else CALLOUT_LABELS[kind]
        return '<aside class="co %s"%s><span class="label">%s</span>%s</aside>' % (kind, a, label, inner)

    def table(self, rows):
        def cells(r):
            r = r.strip()
            r = r[1:] if r.startswith("|") else r
            r = r[:-1] if r.endswith("|") and not r.endswith("\\|") else r
            out, cur, tick = [], "", False
            for ch in r:
                if ch == "`":
                    tick = not tick
                if ch == "|" and not tick and not cur.endswith("\\"):
                    out.append(cur.strip()); cur = ""
                else:
                    cur += ch
            out.append(cur.strip())
            return [c.replace("\\|", "|") for c in out]
        body = [r for r in rows if not re.match(r"^\|?\s*:?-{2,}", r)]
        if not body:
            return ""
        h = "".join("<th>%s</th>" % self.inline.render(c) for c in cells(body[0]))
        trs = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % self.inline.render(c) for c in cells(r)) for r in body[1:])
        return '<div class="tablewrap"%s><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (self.attrs(), h, trs)

    def listblock(self, block, depth):
        first = block[0]
        indent = len(first) - len(first.lstrip())
        ordered = bool(re.match(r"^\s*\d+\.", first))
        items, cur = [], None
        for line in block:
            m = re.match(r"^(\s*)([-*]|\d+\.)\s+(.*)$", line)
            if m and len(m.group(1)) == indent:
                cur = [m.group(3)]
                items.append(cur)
            elif cur is not None:
                cur.append(line[indent + 2:] if line.startswith(" " * (indent + 2)) else line.strip())
        a = self.attrs()
        lis = []
        for it in items:
            check = ""
            m = re.match(r"^\[( |x|X)\]\s+(.*)$", it[0])
            if m:
                self.checks += 1
                check = '<input type="checkbox" class="chk" data-chk="%s.%d"%s> ' % (
                    self.sec_id, self.checks, " checked" if m.group(1) != " " else "")
                it[0] = m.group(2)
            sub = self.blocks(it, depth + 1)
            if sub and sub[0].startswith("<p"):
                sub[0] = re.sub(r"^<p[^>]*>|</p>$", "", sub[0])
            lis.append("<li%s>%s%s</li>" % (' class="task"' if check else "", check, "".join(sub)))
        tag = "ol" if ordered else "ul"
        return "<%s%s>%s</%s>" % (tag, a, "".join(lis), tag)


# ---------------------------------------------------------------- page

def front_matter(text):
    meta = {}
    if text.startswith("---\n"):
        end = text.find("\n---", 4)
        if end != -1:
            for line in text[4:end].split("\n"):
                k, sep, v = line.partition(":")
                if sep:
                    meta[k.strip()] = re.sub(r"\s+#.*$", "", v).strip().strip('"')
            text = text[end + 4:].lstrip("\n")
    return meta, text


def collect_glossary(lines, inline_builder=None):
    g, on = {}, False
    for line in lines:
        s = line.strip()
        if s.startswith(":::glossary"):
            on = True; continue
        if on and s == ":::":
            on = False; continue
        if on and ":" in s:
            term, _, d = s.partition(":")
            g[term.strip().lower()] = (term.strip(), plain(d.strip()))
    return g


def toc_html(sections):
    out, open_sub = ['<ol>'], False
    for s in sections:
        if s["level"] == 3:
            if not open_sub:
                out.append("<ol>"); open_sub = True
        elif open_sub:
            out.append("</ol></li>"); open_sub = False
        elif len(out) > 1:
            out.append("</li>")
        out.append('<li><a href="#%s" data-toc="%s">%s</a>' % (s["id"], s["id"], esc(s["title"])))
        if s["level"] == 3:
            out.append("</li>")
    out.append("</ol></li></ol>" if open_sub else "</li></ol>")
    return "".join(out)


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    md_path = os.path.abspath(os.path.expanduser(argv[1]))
    out_path = argv[argv.index("-o") + 1] if "-o" in argv else os.path.splitext(md_path)[0] + ".html"
    with open(md_path, encoding="utf-8") as f:
        meta, body = front_matter(f.read())
    md_dir = os.path.dirname(md_path)
    lines = body.split("\n")
    b = Builder(meta, md_dir, collect_glossary(lines))
    content = "".join(b.blocks(lines))

    replies = {}
    rp = os.path.join(md_dir, "replies.json")
    if os.path.exists(rp):
        try:
            with open(rp, encoding="utf-8") as f:
                replies = json.load(f)
        except ValueError as e:
            errors.append("replies.json is not valid JSON: %s" % e)

    title = meta.get("title", "Walkthrough")
    wid = meta.get("id") or slug(title)
    data = {
        "id": wid,
        "title": title,
        "version": meta.get("version", "1"),
        "source": md_path,
        "sections": [{"id": s["id"], "title": s["title"],
                      "hash": hashlib.sha1("\n".join(s["src"]).encode()).hexdigest()[:10]} for s in b.sections],
        "replies": replies,
    }
    with open(os.path.join(ASSETS, "template.html"), encoding="utf-8") as f:
        tpl = f.read()
    with open(os.path.join(ASSETS, "walkthrough.css"), encoding="utf-8") as f:
        css = f.read()
    with open(os.path.join(ASSETS, "walkthrough.js"), encoding="utf-8") as f:
        js = f.read()
    sub = meta.get("subtitle", "")
    page = (tpl.replace("{{title}}", esc(title))
            .replace("{{subtitle}}", '<p class="subtitle">%s</p>' % b.inline.render(sub) if sub else "")
            .replace("{{meta}}", esc("Version %s · %s" % (data["version"], meta.get("level", "beginner"))))
            .replace("{{toc}}", toc_html(b.sections))
            .replace("{{css}}", css)
            .replace("{{data}}", json.dumps(data).replace("</", "<\\/"))
            .replace("{{js}}", js)
            .replace("{{content}}", content))

    for w in warnings:
        print("warning: " + w)
    if errors:
        for e in errors:
            print("error: " + e)
        print("Build failed: %d error(s). Nothing written." % len(errors))
        return 1
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(page)
    print("Built %s (%d KB): %d sections, %d code refs, %d glossary terms, %d replies." % (
        out_path, len(page) // 1024, len(b.sections), b.coderefs, len(b.inline.glossary), len(replies)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))

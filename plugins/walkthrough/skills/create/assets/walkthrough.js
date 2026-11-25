/* Walkthrough runtime: syntax highlighting, personal notes, "updated" badges.
   Notes live only in this browser's localStorage, keyed by the walkthrough id.
   They never go into the HTML file, so sharing the file shares no notes. */
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("wt-data").textContent);
  var main = document.getElementById("wt-main");
  var K = "wt:" + D.id + ":";
  var TYPES = {
    clarify: { label: "Explain better", help: "The walkthrough is unclear here. Say how you want it explained (simpler, an analogy, more depth, an example...)." },
    change: { label: "Change it", help: "Something in the work itself is wrong or should be done differently, like a review comment." },
    question: { label: "Question", help: "Just ask. The answer comes back as a reply on this note." }
  };

  // ---------------------------------------------------------------- storage
  var ls = null;
  try { ls = window.localStorage; ls.setItem(K + "probe", "1"); ls.removeItem(K + "probe"); } catch (e) { ls = null; }
  var mem = {};
  function get(k, d) { try { var v = ls ? ls.getItem(K + k) : mem[k]; return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function put(k, v) { var s = JSON.stringify(v); try { if (ls) { ls.setItem(K + k, s); } else { mem[k] = s; } return true; } catch (e) { saveFailed = true; return false; } }
  var saveFailed = !ls;
  var notes = get("notes", []);
  function save() { put("notes", notes); renderAll(); }
  window.addEventListener("storage", function (ev) { if (ev.key === K + "notes") { notes = get("notes", []); renderAll(); } });

  // ---------------------------------------------------------------- helpers
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === "text") { e.textContent = attrs[k]; }
      else if (k === "class") { e.className = attrs[k]; }
      else if (k.slice(0, 2) === "on") { e.addEventListener(k.slice(2), attrs[k]); }
      else if (attrs[k] !== null && attrs[k] !== undefined) { e.setAttribute(k, attrs[k]); }
    }
    (kids || []).forEach(function (c) { if (c) { e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); } });
    return e;
  }
  function btn(label, cls, fn, extra) { var a = { type: "button", "class": "wt-b " + (cls || ""), text: label, onclick: fn }; for (var k in extra || {}) { a[k] = extra[k]; } return el("button", a); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function when(iso) { var d = new Date(iso); return isNaN(d) ? "" : d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function newId() { return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  var secTitle = {}, secOrder = {};
  D.sections.forEach(function (s, i) { secTitle[s.id] = s.title; secOrder[s.id] = i; });
  function reply(n) { return D.replies[n.id] || null; }
  function isDone(n) { var r = reply(n); return !!(r && r.status === "resolved" && !n.reopened); }

  // ---------------------------------------------------------------- syntax highlighting
  var KW = "abstract as async await base bool break case catch class const continue def default defer delete do elif else enum export extends false final finally fn for foreach from func function get go if impl implements import in interface internal is lambda let match module namespace new nil none not null object of or and override package private protected pub public readonly record return sealed select self set static string struct super switch then this throw throws trait true try type typeof using val var void when where while with yield int long var".split(" ");
  var KWS = {}; KW.concat(["True", "False", "None", "String", "Task"]).forEach(function (w) { KWS[w] = 1; });
  function hashComments(lang) { return /^(py|sh|yaml|rb|hcl|toml|text)$/.test(lang); }
  function highlight(code) {
    var lang = code.getAttribute("data-lang") || "text";
    if (lang === "text" || lang === "diff" || lang === "md") { return; }
    var inBlock = false;
    var tok = hashComments(lang)
      ? /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d[\d_.]*\b)|([A-Za-z_]\w*)/g
      : /(\/\/.*$|\/\*.*?(?:\*\/|$)|--\s.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|(\b\d[\d_.]*\b)|([A-Za-z_]\w*)/g;
    if (lang === "json") { tok = /()("(?:[^"\\]|\\.)*")|(-?\b\d[\d.eE+-]*\b)|(\btrue\b|\bfalse\b|\bnull\b)/g; }
    if (lang === "sql") { tok = /(--.*$)|('(?:[^']|'')*')|(\b\d+\b)|([A-Za-z_]\w*)/g; }
    code.querySelectorAll(".cl:not(.gap) .t").forEach(function (t) {
      var src = t.textContent, out = "", last = 0, m, start = 0;
      function e(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
      if (inBlock) {
        var endAt = src.indexOf("*/");
        if (endAt < 0) { t.innerHTML = '<span class="tk-c">' + e(src) + "</span>"; return; }
        out = '<span class="tk-c">' + e(src.slice(0, endAt + 2)) + "</span>"; start = last = endAt + 2; inBlock = false;
      }
      tok.lastIndex = start;
      while ((m = tok.exec(src)) !== null) {
        if (m[0] === "") { tok.lastIndex++; continue; }
        var cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "n" : (lang === "json" || KWS.hasOwnProperty(m[4])) ? "k" : "";
        if (lang === "sql" && m[4]) { cls = /^(select|from|where|and|or|join|left|right|inner|on|group|by|order|insert|into|values|update|set|delete|create|table|as|not|null|is|in|limit)$/i.test(m[4]) ? "k" : ""; }
        out += e(src.slice(last, m.index));
        out += cls ? '<span class="tk-' + cls + '">' + e(m[0]) + "</span>" : e(m[0]);
        last = m.index + m[0].length;
        if (m[1] && m[0].indexOf("/*") === 0 && m[0].indexOf("*/") < 0) { inBlock = true; }
      }
      out += e(src.slice(last));
      t.innerHTML = out;
    });
  }
  document.querySelectorAll(".code").forEach(highlight);

  // ---------------------------------------------------------------- checklists (local only)
  var checks = get("checks", {});
  document.querySelectorAll("input.chk").forEach(function (c) {
    var id = c.getAttribute("data-chk");
    if (checks.hasOwnProperty(id)) { c.checked = checks[id]; }
    c.addEventListener("change", function () { checks[id] = c.checked; put("checks", checks); });
  });

  // ---------------------------------------------------------------- "updated since you last read"
  var seen = get("seen", null), changed = [];
  if (!seen) { seen = {}; D.sections.forEach(function (s) { seen[s.id] = s.hash; }); put("seen", seen); }
  D.sections.forEach(function (s) { if (seen[s.id] !== s.hash) { changed.push(s); } });
  function showChanged() {
    var box = document.getElementById("wt-changed");
    document.querySelectorAll(".wt-upd").forEach(function (b) { b.parentNode.removeChild(b); });
    if (!changed.length) { box.hidden = true; return; }
    changed.forEach(function (s) {
      var h = document.getElementById(s.id);
      if (h) { h.insertBefore(el("span", { "class": "wt-upd", text: seen[s.id] ? "Updated" : "New" }), h.querySelector(".wt-hbtn")); }
    });
    box.hidden = false; box.textContent = "";
    box.appendChild(el("strong", { text: changed.length + (changed.length === 1 ? " section changed" : " sections changed") + " since you last read this: " }));
    changed.forEach(function (s, i) { box.appendChild(el("a", { href: "#" + s.id, text: s.title })); if (i < changed.length - 1) { box.appendChild(document.createTextNode(", ")); } });
    box.appendChild(document.createTextNode(" "));
    box.appendChild(btn("Mark as read", "sm", function () {
      D.sections.forEach(function (s) { seen[s.id] = s.hash; }); put("seen", seen); changed = []; showChanged(); renderToc();
    }));
  }

  // ---------------------------------------------------------------- the editor popover
  var pop = null;
  function closePop() { if (pop) { pop.parentNode.removeChild(pop); pop = null; } }
  function openEditor(draft, anchorRect) {
    closePop(); hideSel();
    var type = draft.type || "clarify";
    var ta = el("textarea", { "aria-label": "Note", placeholder: "Your note..." });
    ta.value = draft.text || "";
    var help = el("p", { "class": "wt-help" });
    var typeBtns = el("div", { "class": "wt-types", role: "group", "aria-label": "Note type" });
    function setType(t) {
      type = t; help.textContent = TYPES[t].help;
      Array.prototype.forEach.call(typeBtns.children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-t") === t ? "true" : "false"); });
    }
    Object.keys(TYPES).forEach(function (t) { typeBtns.appendChild(btn(TYPES[t].label, "sm", function () { setType(t); ta.focus(); }, { "data-t": t })); });
    function commit() {
      var text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      var now = new Date().toISOString();
      var existing = null;
      notes.forEach(function (n) { if (n.id === draft.id) { existing = n; } });
      if (existing) {
        if (existing.text !== text || existing.type !== type) { existing.text = text; existing.type = type; existing.updatedAt = now; if (reply(existing)) { existing.reopened = true; } }
      } else {
        notes.push({ id: newId(), sec: draft.sec, block: draft.block || null, quote: draft.quote || "", loc: draft.loc || "", type: type, text: text, createdAt: now, updatedAt: now });
      }
      closePop(); save(); setOpen(true);
    }
    ta.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.preventDefault(); closePop(); }
      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); commit(); }
    });
    pop = el("div", { "class": "wt-pop", role: "dialog", "aria-label": "Add note" }, [
      el("div", { "class": "wt-muted", text: "Note on: " + (secTitle[draft.sec] || "this walkthrough") }),
      draft.loc ? el("div", { "class": "loc", text: draft.loc }) : null,
      draft.quote ? el("div", { "class": "q", text: draft.quote }) : null,
      typeBtns, help, ta,
      el("div", { "class": "wt-row" }, [el("span", { "class": "sp", text: "⌘/Ctrl+Enter saves · Esc cancels" }), btn("Cancel", "sm", closePop), btn("Save note", "sm primary", commit)])
    ]);
    document.body.appendChild(pop);
    setType(type);
    var r = anchorRect || { left: window.innerWidth / 2 - 200, bottom: 120, top: 120 };
    var top = r.bottom + 8, left = Math.min(Math.max(12, r.left), window.innerWidth - pop.offsetWidth - 12);
    if (top + pop.offsetHeight > window.innerHeight - 12) { top = Math.max(12, r.top - pop.offsetHeight - 8); }
    pop.style.top = top + "px"; pop.style.left = left + "px";
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }
  document.addEventListener("mousedown", function (ev) { if (pop && !pop.contains(ev.target) && ev.target !== selBtn) { closePop(); } });

  // ---------------------------------------------------------------- anchors: selection, code lines, headings
  function context(node) {
    var e = node && (node.nodeType === 1 ? node : node.parentElement);
    var blk = e && e.closest("[data-b]");
    var sec = (e && e.closest("[data-sec]")) || null;
    return { el: e, block: blk ? blk.getAttribute("data-b") : null, sec: sec ? sec.getAttribute("data-sec") : "top" };
  }
  function codeLoc(a, b) {
    var ca = a && a.closest && a.closest(".code"), la = a && a.closest && a.closest(".cl"), lb = b && b.closest && b.closest(".cl");
    if (!ca || !la) { return ""; }
    var file = ca.getAttribute("data-file") || "snippet";
    var x = la.getAttribute("data-n"), y = lb && ca.contains(lb) ? lb.getAttribute("data-n") : x;
    if (!x) { return file; }
    var lo = Math.min(+x, +y), hi = Math.max(+x, +y);
    return file + ":" + (lo === hi ? lo : lo + "-" + hi);
  }
  var selBtn = el("button", { type: "button", "class": "wt-sel", text: "+ Note", hidden: "" });
  document.body.appendChild(selBtn);
  var selDraft = null, selRect = null;
  function hideSel() { selBtn.hidden = true; selDraft = null; }
  document.addEventListener("mouseup", function (ev) {
    if (selBtn.contains(ev.target) || (pop && pop.contains(ev.target))) { return; }
    setTimeout(function () {
      var s = window.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) { hideSel(); return; }
      var text = s.toString().trim();
      var r = s.getRangeAt(0);
      if (!text || !main.contains(r.commonAncestorContainer)) { hideSel(); return; }
      var a = context(r.startContainer), b = context(r.endContainer);
      selDraft = { sec: a.sec, block: a.block, quote: text.length > 600 ? text.slice(0, 600) + "…" : text, loc: codeLoc(a.el, b.el) };
      selRect = r.getBoundingClientRect();
      selBtn.hidden = false;
      selBtn.style.top = (selRect.bottom + window.scrollY + 6) + "px";
      selBtn.style.left = Math.min(selRect.right + window.scrollX - 60, window.scrollX + window.innerWidth - 90) + "px";
    }, 0);
  });
  selBtn.addEventListener("click", function () { if (selDraft) { openEditor(selDraft, selRect); } });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "n" && !pop && !/INPUT|TEXTAREA/.test((document.activeElement || {}).tagName) && selDraft) { ev.preventDefault(); openEditor(selDraft, selRect); }
  });

  main.addEventListener("click", function (ev) {
    var n = ev.target.closest && ev.target.closest(".cl .n");
    if (!n || !n.textContent) { return; }
    var line = n.parentNode, c = context(line);
    openEditor({ sec: c.sec, block: c.block, quote: line.querySelector(".t").textContent.trim(), loc: codeLoc(line, line) }, line.getBoundingClientRect());
  });

  document.querySelectorAll("main h2[id], main h3[id]").forEach(function (h) {
    var b = el("button", { type: "button", "class": "wt-hbtn", text: "+ Note", "aria-label": "Add a note on " + h.textContent.trim() });
    b.addEventListener("click", function () { openEditor({ sec: h.id }, b.getBoundingClientRect()); });
    h.appendChild(b);
  });

  // ---------------------------------------------------------------- export
  function openNotes() { return notes.filter(function (n) { return !isDone(n); }); }
  function sortNotes(list) {
    function o(id) { return secOrder.hasOwnProperty(id) ? secOrder[id] : -1; }
    return list.slice().sort(function (a, b) { return (o(a.sec) - o(b.sec)) || (a.createdAt < b.createdAt ? -1 : 1); });
  }
  function exportText() {
    var list = sortNotes(openNotes());
    var out = "# Walkthrough notes\n\n" +
      "Walkthrough: " + D.title + " (id `" + D.id + "`, version " + D.version + ")\n" +
      "Source: " + D.source + "\n" +
      "Apply these with /walkthrough:apply-notes. Reply in replies.json by note id.\n";
    list.forEach(function (n, i) {
      out += "\n## " + (i + 1) + ". [" + n.type + "] " + (secTitle[n.sec] || n.sec) + " (#" + n.sec + ")  id: " + n.id + "\n";
      if (n.loc) { out += "at: " + n.loc + "\n"; }
      if (n.quote) { out += n.quote.split("\n").map(function (l) { return "> " + l; }).join("\n") + "\n"; }
      out += n.text + "\n";
      var r = reply(n);
      if (r && (n.reopened || r.status !== "resolved")) { out += "(follow-up: your previous reply was: " + r.reply.replace(/\n/g, " ") + ")\n"; }
    });
    if (!list.length) { out += "\nNo open notes.\n"; }
    return out;
  }
  function copy(text) {
    function fallback() {
      var ta = el("textarea", { "class": "wt-fallback", readonly: "" }); ta.value = text;
      flashBox = el("div", { "class": "wt-warn" }, ["Copy was blocked here. The text is selected: press ⌘C / Ctrl+C.", ta]);
      renderPanel(); ta.focus(); ta.select();
    }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(function () { flash("Copied " + openNotes().length + " open notes. Paste them to your AI."); }, fallback); }
    else { fallback(); }
  }
  function download() {
    var name = D.id + "-notes-v" + D.version + ".md";
    var a = el("a", { href: URL.createObjectURL(new Blob([exportText()], { type: "text/markdown" })), download: name });
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.parentNode.removeChild(a); }, 1000);
    flash("Saved " + name + " to your downloads. Give the file to your AI.");
  }

  // ---------------------------------------------------------------- panel
  var tab = el("button", { type: "button", "class": "wt-tab", onclick: function () { setOpen(true); } });
  var pbody = el("div", { "class": "wt-pbody" });
  var phead = el("span");
  var panel = el("aside", { "class": "wt-panel", "aria-label": "Your notes" }, [
    el("div", { "class": "wt-phead" }, [phead, btn("Close", "sm", function () { setOpen(false); })]), pbody]);
  document.body.appendChild(tab); document.body.appendChild(panel);
  function setOpen(o) { document.body.classList.toggle("wt-open", o); put("open", o); }
  var flashBox = null;
  function flash(msg) { flashBox = el("div", { "class": "wt-flash", role: "status", text: msg }); renderPanel(); var mine = flashBox; setTimeout(function () { if (flashBox === mine) { flashBox = null; renderPanel(); } }, 4000); }

  var toast = null, toastTimer = null;
  function remove(n) {
    var idx = notes.indexOf(n); if (idx < 0) { return; }
    notes.splice(idx, 1); save();
    if (toast) { toast.parentNode.removeChild(toast); clearTimeout(toastTimer); }
    toast = el("div", { "class": "wt-toast", role: "status" }, ["Note deleted.", btn("Undo", "sm", function () { notes.splice(Math.min(idx, notes.length), 0, n); save(); hideToast(); })]);
    document.body.appendChild(toast);
    toastTimer = setTimeout(hideToast, 8000);
  }
  function hideToast() { if (toast) { toast.parentNode.removeChild(toast); toast = null; } }

  function noteCard(n) {
    var r = reply(n), done = isDone(n);
    var card = el("div", { "class": "wt-n" + (done ? " done" : ""), id: "note-" + n.id }, [
      el("div", null, [el("span", { "class": "wt-tag " + (done ? "resolved" : n.type), text: done ? "resolved" : TYPES[n.type] ? TYPES[n.type].label : n.type })]),
      n.loc ? el("div", { "class": "loc", text: n.loc }) : null,
      n.quote ? el("div", { "class": "q", text: n.quote }) : null,
      el("div", { "class": "txt", text: n.text }),
      r ? el("div", { "class": "reply" + (r.status === "resolved" ? "" : " ask"), text: "AI: " + r.reply }) : null
    ]);
    var acts = el("div", { "class": "acts" }, [el("span", { "class": "sp", text: when(n.updatedAt) })]);
    if (n.block || n.sec) { acts.appendChild(btn("Show", "sm", function () { jump(n); })); }
    if (done) {
      acts.appendChild(btn("Follow up", "sm", function () { var rc = card.getBoundingClientRect(); n.reopened = true; save(); openEditor(n, rc); }));
      acts.appendChild(btn("Dismiss", "sm", function () { remove(n); }));
    } else {
      acts.appendChild(btn("Edit", "sm", function () { openEditor(n, card.getBoundingClientRect()); }));
      acts.appendChild(btn("Delete", "sm", function () { remove(n); }));
    }
    card.appendChild(acts);
    return card;
  }
  function jump(n) {
    var t = (n.block && document.querySelector('[data-b="' + n.block + '"]')) || document.getElementById(n.sec);
    if (t) { t.scrollIntoView({ behavior: "smooth", block: "center" }); t.animate && t.animate([{ background: "var(--hl)" }, { background: "transparent" }], { duration: 1400 }); }
  }
  function renderPanel() {
    var open = openNotes().length, done = notes.length - open;
    phead.textContent = "Your notes (" + open + " open)";
    tab.textContent = open ? "Notes (" + open + ")" : "Notes";
    pbody.textContent = "";
    if (saveFailed) { pbody.appendChild(el("div", { "class": "wt-warn", text: "This browser is not saving notes for this file. They disappear when you close the tab, so export before you leave." })); }
    if (flashBox) { pbody.appendChild(flashBox); }
    pbody.appendChild(el("div", { "class": "wt-tools" }, [
      btn("Copy for AI", "primary", function () { copy(exportText()); }, open ? null : { disabled: "" }),
      btn("Download .md", "", download, open ? null : { disabled: "" })
    ]));
    pbody.appendChild(el("p", { "class": "wt-muted", text: "Select any text or click a code line number to add a note. Notes stay in this browser only and are not part of the file." }));
    if (!notes.length) { pbody.appendChild(el("p", { "class": "wt-muted", text: "No notes yet." })); return; }
    var groups = {}, order = [];
    sortNotes(notes).forEach(function (n) { if (!groups[n.sec]) { groups[n.sec] = []; order.push(n.sec); } groups[n.sec].push(n); });
    order.forEach(function (sid) {
      pbody.appendChild(el("div", { "class": "wt-grp" }, [secTitle[sid] ? el("a", { href: "#" + sid, text: secTitle[sid] }) : el("span", { text: sid === "top" ? "Introduction" : sid + " (section removed)" })]));
      groups[sid].forEach(function (n) { pbody.appendChild(noteCard(n)); });
    });
    if (done) {
      pbody.appendChild(el("div", { "class": "wt-tools", style: "margin-top:16px" }, [btn("Dismiss all " + done + " resolved", "sm", function () {
        notes = notes.filter(function (n) { return !isDone(n); }); save();
      })]));
    }
  }

  // ---------------------------------------------------------------- margin markers + toc
  function renderMarks() {
    document.querySelectorAll(".wt-mark").forEach(function (m) { m.parentNode.removeChild(m); });
    var per = {};
    notes.forEach(function (n) {
      var key = n.block && document.querySelector('[data-b="' + n.block + '"]') ? n.block : null;
      if (key) { (per[key] = per[key] || []).push(n); }
    });
    Object.keys(per).forEach(function (k) {
      var t = document.querySelector('[data-b="' + k + '"]'), list = per[k];
      var allDone = list.every(isDone);
      var m = el("button", { type: "button", "class": "wt-mark" + (allDone ? " done" : ""), text: String(list.length), title: list.length + " note(s)", "aria-label": "Show notes here" });
      m.addEventListener("click", function () { setOpen(true); var c = document.getElementById("note-" + list[0].id); if (c) { c.scrollIntoView({ block: "center" }); } });
      t.appendChild(m);
    });
  }
  function renderToc() {
    var count = {};
    openNotes().forEach(function (n) { count[n.sec] = (count[n.sec] || 0) + 1; });
    var ch = {}; changed.forEach(function (s) { ch[s.id] = 1; });
    document.querySelectorAll("nav.toc a[data-toc]").forEach(function (a) {
      var id = a.getAttribute("data-toc");
      var old = a.parentNode.querySelectorAll(":scope > .toc-badge"); old.forEach(function (o) { o.parentNode.removeChild(o); });
      var after = a.nextSibling;
      if (ch[id]) { a.parentNode.insertBefore(el("span", { "class": "toc-badge upd", text: "• updated" }), after); }
      if (count[id]) { a.parentNode.insertBefore(el("span", { "class": "toc-badge", text: "(" + count[id] + ")" }), after); }
    });
  }
  function renderAll() { renderPanel(); renderMarks(); renderToc(); }

  // highlight current section in the toc
  if ("IntersectionObserver" in window) {
    var links = {};
    document.querySelectorAll("nav.toc a[data-toc]").forEach(function (a) { links[a.getAttribute("data-toc")] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && links[e.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("active"); });
          links[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "0px 0px -75% 0px" });
    document.querySelectorAll("main h2[id], main h3[id]").forEach(function (h) { io.observe(h); });
  }

  showChanged();
  renderAll();
  setOpen(get("open", false) || saveFailed);
})();

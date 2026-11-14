#!/usr/bin/env python3
"""Site checks for bailsformed.github.io. Standard library only (plus `node` for JS syntax).

Run from the repo root:  python3 .github/scripts/check_site.py
Exits non-zero if any check fails. In GitHub Actions each problem is also printed
as an ::error annotation so it shows up on the PR's "Files changed" tab.

Checks:
  js        every tracked .js file and every inline <script> in every .html file parses
  manifest  every web app manifest is valid JSON, its icons exist at the stated sizes,
            ids/scopes are unique and don't overlap, and the homepage has no manifest
  links     local href/src values in HTML (and manifest icon paths) point at files that exist
  html      basic sanity: doctype, <html lang>, <meta charset>, viewport, <title>, no duplicate ids
  secrets   no Supabase service-role JWT and no sb_secret_ key anywhere in the repo
"""

import base64
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse, unquote

SITE = "https://bailsformed.github.io/"
IN_CI = os.environ.get("GITHUB_ACTIONS") == "true"

problems = []  # (check, file, line, message)


def fail(check, path, line, msg):
    problems.append((check, path, line, msg))


def tracked_files():
    out = subprocess.run(["git", "ls-files", "-z"], capture_output=True, check=True).stdout
    return sorted(p for p in out.decode().split("\0") if p and os.path.isfile(p))


FILES = tracked_files()
HTML_FILES = [p for p in FILES if p.endswith(".html")]
JS_FILES = [p for p in FILES if p.endswith((".js", ".mjs"))]
MANIFESTS = [p for p in FILES if os.path.basename(p) in ("manifest.webmanifest", "manifest.json")]


# ---------------------------------------------------------------- HTML parsing

JS_TYPES = {"", "text/javascript", "application/javascript", "module"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs = []      # (attr, value, line)
        self.scripts = []   # (code, line, col, is_module)
        self.ids = {}       # id -> first line
        self.dup_ids = []   # (id, line)
        self.doctype = False
        self.html_lang = None
        self.charset = False
        self.viewport = False
        self.title = False
        self._script = None

    def handle_decl(self, decl):
        if decl.lower().startswith("doctype html"):
            self.doctype = True

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if tag == "html":
            self.html_lang = a.get("lang")
        elif tag == "meta":
            if "charset" in a:
                self.charset = True
            if (a.get("name") or "").lower() == "viewport":
                self.viewport = True
        elif tag == "title":
            self.title = True
        if "id" in a and a["id"]:
            if a["id"] in self.ids:
                self.dup_ids.append((a["id"], line))
            else:
                self.ids[a["id"]] = line
        for attr in ("href", "src"):
            if a.get(attr):
                self.refs.append((attr, a[attr], line))
        if tag == "script" and "src" not in a:
            stype = (a.get("type") or "").strip().lower()
            if stype in JS_TYPES:
                self._script = stype == "module"
                # Script content starts right after the opening tag.
                text = self.get_starttag_text() or ""
                tline, tcol = self.getpos()
                if "\n" in text:
                    self._script_pos = (tline + text.count("\n"), len(text) - text.rfind("\n") - 1)
                else:
                    self._script_pos = (tline, tcol + len(text))

    def handle_data(self, data):
        if self._script is not None and data.strip():
            line, col = self._script_pos
            self.scripts.append((data, line, col, self._script))

    def handle_endtag(self, tag):
        if tag == "script":
            self._script = None


def parse_html(path):
    p = Page()
    with open(path, encoding="utf-8") as f:
        p.feed(f.read())
    p.close()
    return p


PAGES = {path: parse_html(path) for path in HTML_FILES}


# ---------------------------------------------------------------- js

def check_js():
    node = shutil.which("node")
    if not node:
        msg = "node not found; skipping JavaScript syntax check"
        if IN_CI:
            fail("js", None, None, msg)
        else:
            print("warning: " + msg)
        return
    err_re = re.compile(r":(\d+)\n")

    def run(target, shown, line_offset=0):
        r = subprocess.run([node, "--check", target], capture_output=True, text=True)
        if r.returncode != 0:
            text = r.stderr.strip()
            m = err_re.search(text)
            line = int(m.group(1)) if m else None
            # Keep the useful part: the source line, the caret, and the SyntaxError message.
            lines = [l for l in text.splitlines() if l.strip() and not l.startswith(("    at ", "Node.js"))]
            fail("js", shown, line, "JavaScript syntax error: " + " | ".join(lines[1:] or lines))

    for path in JS_FILES:
        run(path, path)

    with tempfile.TemporaryDirectory() as tmp:
        for path, page in PAGES.items():
            for i, (code, line, col, is_module) in enumerate(page.scripts):
                # Pad so node's line numbers match the line in the .html file.
                padded = "\n" * (line - 1) + " " * col + code
                tmpfile = os.path.join(tmp, "inline%d.%s" % (i, "mjs" if is_module else "js"))
                with open(tmpfile, "w", encoding="utf-8") as f:
                    f.write(padded)
                run(tmpfile, path)


# ---------------------------------------------------------------- links

SKIP_SCHEMES = ("http:", "https:", "mailto:", "tel:", "data:", "javascript:", "blob:", "sms:")


def is_local(value):
    v = value.strip()
    if not v or v.startswith(("#", "//", "?")) or "${" in v or "{{" in v:
        return False
    return not v.lower().startswith(SKIP_SCHEMES)


def resolve_local(from_file, value):
    """Return the repo-relative path a local reference points at, or None if it escapes the repo."""
    page_url = SITE + from_file
    url = urlparse(urljoin(page_url, value.strip()))
    if url.netloc != urlparse(SITE).netloc:
        return None
    path = unquote(url.path.lstrip("/"))
    if path == "" or path.endswith("/"):
        path += "index.html"
    return os.path.normpath(path)


FILESET = set(FILES)


def target_exists(target):
    if target in FILESET:
        return True
    # GitHub Pages serves dir/index.html for "dir" too.
    return os.path.join(target, "index.html") in FILESET


SCRIPT_REF_RE = re.compile(r"""\b(href|src)=(["'])([^"'`$<>{}\s\\]+)\2""")


def script_refs(page):
    """href="..."/src="..." literals inside inline scripts (HTML the page builds at runtime)."""
    for code, line, _col, _mod in page.scripts:
        for m in SCRIPT_REF_RE.finditer(code):
            yield m.group(1), m.group(3), line + code.count("\n", 0, m.start())


def check_links():
    for path, page in PAGES.items():
        for attr, value, line in list(page.refs) + list(script_refs(page)):
            if not is_local(value):
                continue
            target = resolve_local(path, value)
            if target is None or not target_exists(target):
                fail("links", path, line, '%s="%s" points at a file that does not exist (%s)' % (attr, value, target))


# ---------------------------------------------------------------- manifest

def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", head[16:24])


def check_manifests():
    if os.path.exists("manifest.webmanifest") or os.path.exists("manifest.json"):
        fail("manifest", "manifest.webmanifest", None,
             "the homepage must not have a manifest (its scope '/' would swallow every app)")
    seen_ids, seen_scopes = {}, {}
    for path in MANIFESTS:
        try:
            with open(path, encoding="utf-8") as f:
                m = json.load(f)
        except ValueError as e:
            fail("manifest", path, getattr(e, "lineno", None), "invalid JSON: %s" % e)
            continue
        if not isinstance(m, dict):
            fail("manifest", path, None, "manifest must be a JSON object")
            continue
        url = SITE + path
        for key in ("name", "start_url", "icons"):
            if key not in m:
                fail("manifest", path, None, 'missing "%s"' % key)
        start = urljoin(url, m.get("start_url", "."))
        scope = urljoin(url, m.get("scope", urljoin(start, ".")))
        app_id = urljoin(start, m["id"]) if "id" in m else start
        app_id = app_id.split("#")[0]
        if scope == SITE:
            fail("manifest", path, None, "scope is the whole site '/'; give the app its own folder scope")
        if not start.startswith(scope):
            fail("manifest", path, None, "start_url %s is outside scope %s" % (start, scope))
        if app_id in seen_ids:
            fail("manifest", path, None, "id %s is also used by %s" % (app_id, seen_ids[app_id]))
        seen_ids[app_id] = path
        for other_scope, other in seen_scopes.items():
            if scope.startswith(other_scope) or other_scope.startswith(scope):
                fail("manifest", path, None, "scope %s overlaps scope %s of %s" % (scope, other_scope, other))
        seen_scopes[scope] = path

        for icon in m.get("icons", []):
            src = icon.get("src", "")
            if not is_local(src):
                continue
            target = resolve_local(path, src)
            if target is None or target not in FILESET:
                fail("manifest", path, None, 'icon "%s" does not exist' % src)
                continue
            sizes = (icon.get("sizes") or "").split()
            if not sizes or "any" in sizes:
                continue
            if target.lower().endswith(".png"):
                actual = png_size(target)
                if actual is None:
                    fail("manifest", path, None, 'icon "%s" is not a valid PNG' % src)
                elif "%dx%d" % actual not in [s.lower() for s in sizes]:
                    fail("manifest", path, None, 'icon "%s" says sizes "%s" but is %dx%d'
                         % (src, icon.get("sizes"), actual[0], actual[1]))


# ---------------------------------------------------------------- html sanity

def check_html():
    for path, page in PAGES.items():
        if not page.doctype:
            fail("html", path, 1, "missing <!doctype html>")
        if not page.html_lang:
            fail("html", path, None, "<html> has no lang attribute")
        if not page.charset:
            fail("html", path, None, "missing <meta charset>")
        if not page.viewport:
            fail("html", path, None, 'missing <meta name="viewport">')
        if not page.title:
            fail("html", path, None, "missing <title>")
        for dup, line in page.dup_ids:
            fail("html", path, line, 'duplicate id="%s" (first used on line %d)' % (dup, page.ids[dup]))


# ---------------------------------------------------------------- secrets

JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}")
SB_SECRET_RE = re.compile(r"sb_secret_[A-Za-z0-9_-]{6,}")


def b64json(seg):
    try:
        return json.loads(base64.urlsafe_b64decode(seg + "=" * (-len(seg) % 4)))
    except Exception:
        return None


def check_secrets():
    for path in FILES:
        try:
            with open(path, encoding="utf-8") as f:
                text = f.read()
        except (UnicodeDecodeError, OSError):
            continue  # binary file
        for lineno, line in enumerate(text.splitlines(), 1):
            if SB_SECRET_RE.search(line):
                fail("secrets", path, lineno, "a Supabase secret key (sb_secret_...) is committed; "
                     "remove it and rotate it in the Supabase dashboard")
            for m in JWT_RE.finditer(line):
                payload = b64json(m.group(1))
                if isinstance(payload, dict) and payload.get("role") == "service_role":
                    fail("secrets", path, lineno, "a Supabase service_role key is committed; "
                         "remove it and rotate it in the Supabase dashboard")


# ---------------------------------------------------------------- main

CHECKS = {"js": check_js, "manifest": check_manifests, "links": check_links,
          "html": check_html, "secrets": check_secrets}


def main():
    wanted = sys.argv[1:] or list(CHECKS)
    for name in wanted:
        CHECKS[name]()
    for name in wanted:
        mine = [p for p in problems if p[0] == name]
        print("%s %s (%d problem%s)" % ("FAIL" if mine else "ok  ", name, len(mine), "" if len(mine) == 1 else "s"))
        for _, path, line, msg in mine:
            where = path or "-"
            if line:
                where += ":%d" % line
            print("    %s  %s" % (where, msg))
            if IN_CI:
                loc = ""
                if path:
                    loc = " file=%s" % path + (",line=%d" % line if line else "")
                print("::error%s,title=%s check::%s" % (loc, name, msg.replace("\n", " ")) if loc
                      else "::error title=%s check::%s" % (name, msg))
    print("%d file(s), %d HTML page(s), %d inline script(s), %d manifest(s) checked."
          % (len(FILES), len(PAGES), sum(len(p.scripts) for p in PAGES.values()), len(MANIFESTS)))
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()

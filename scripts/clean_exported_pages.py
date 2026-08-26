#!/usr/bin/env python3
"""Normalize standalone HTML pages from the Weebly export."""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAGES = [
    "baby-shower.html",
    "bjoumlrklunden-2024.html",
    "bjoumlrklunden-20241.html",
    "disposable-cameras.html",
    "fk-2019.html",
    "how-we-met.html",
    "our-wedding.html",
    "the-engagement.html",
    "weebly-blog-index.html",
]


def clean_page(path: Path) -> None:
    source = path.read_text(encoding="utf-8", errors="replace")
    title_match = re.search(r"<title>(.*?)</title>", source, re.IGNORECASE | re.DOTALL)
    title = html.unescape(re.sub(r"<[^>]+>", "", title_match.group(1))).strip() if title_match else path.stem
    body_match = re.search(r"<body[^>]*>(.*)</body>", source, re.IGNORECASE | re.DOTALL)
    if not body_match:
        raise ValueError(f"Could not find body in {path}")
    body = body_match.group(1)
    body = re.sub(r"<script\b[^>]*>.*?</script\s*>", "", body, flags=re.IGNORECASE | re.DOTALL)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
    body = re.sub(r"<img[^>]+cdn2\.editmysite\.com[^>]*>", "", body, flags=re.IGNORECASE)
    body = body.replace("href='files/main_style.css?1787770638'", "href='files/main_style.css'")
    body = body.replace('href="files/main_style.css?1787770638"', 'href="files/main_style.css"')
    body = re.sub(r"\s+class=([\"'])[^\"']*\bwsite-theme-light\b[^\"']*\1", "", body)
    document = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{html.escape(title)}">
  <title>{html.escape(title)} | Next thing next</title>
  <link rel="stylesheet" href="files/main_style.css">
  <link rel="stylesheet" href="assets/css/site.css">
</head>
<body class="imported-page">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <main id="main-content" class="imported-content">
{body.strip()}
  </main>
</body>
</html>
'''
    path.write_text(document, encoding="utf-8")


for page in PAGES:
    clean_page(ROOT / page)
print(f"Cleaned {len(PAGES)} exported pages")

#!/usr/bin/env python3
"""Convert blog entries embedded in a Weebly index into Jekyll posts."""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


@dataclass
class Node:
    tag: str
    attrs: list[tuple[str, str | None]] = field(default_factory=list)
    children: list[Node | str] = field(default_factory=list)

    def attr(self, name: str) -> str:
        return dict(self.attrs).get(name, "") or ""


class TreeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)

    def handle_entityref(self, name: str) -> None:
        self.stack[-1].children.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self.stack[-1].children.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        self.stack[-1].children.append(f"<!--{data}-->")

    def handle_decl(self, decl: str) -> None:
        self.stack[-1].children.append(f"<!{decl}>")


VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


def serialize(node: Node | str) -> str:
    if isinstance(node, str):
        return node
    attributes = "".join(
        f' {name}' if value is None else f' {name}="{html.escape(value, quote=True)}"'
        for name, value in node.attrs
    )
    content = "".join(serialize(child) for child in node.children)
    if node.tag in VOID_TAGS:
        return f"<{node.tag}{attributes}>"
    return f"<{node.tag}{attributes}>{content}</{node.tag}>"


def descendants(node: Node, tag: str | None = None, class_name: str | None = None) -> list[Node]:
    result: list[Node] = []
    for child in node.children:
        if not isinstance(child, Node):
            continue
        classes = child.attr("class").split()
        if (tag is None or child.tag == tag) and (class_name is None or class_name in classes):
            result.append(child)
        result.extend(descendants(child, tag, class_name))
    return result


def text_content(node: Node) -> str:
    return html.unescape("".join(text_content(child) if isinstance(child, Node) else child for child in node.children))


def first(node: Node, tag: str, class_name: str | None = None) -> Node | None:
    matches = descendants(node, tag, class_name)
    return matches[0] if matches else None


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "untitled"


def rewrite_asset_paths(content: str) -> str:
    content = re.sub(
        r'(?P<attribute>src|href)=["\'](?:https?://)?(?:\.\.?/)*((?:4/5/1/7/4517458)/[^"\']+)["\']',
        r'\g<attribute>="{{ "/files/photos/\2" | relative_url }}"',
        content,
    )
    content = re.sub(
        r'(["\']url["\']\s*:\s*["\'])(?!https?://|/)((?:4/5/1/7/4517458)/[^"\']+)(["\'])',
        r'\1{{ "/files/photos/\2" | relative_url }}\3',
        content,
    )
    return content


def convert_slideshows(content: str) -> str:
    pattern = re.compile(r"<script[^>]*>.*?images:(\[.*?\])\}\).*?</script>", re.DOTALL)

    def replace(match: re.Match[str]) -> str:
        try:
            images = json.loads(match.group(1))
        except json.JSONDecodeError:
            return match.group(0)
        gallery = ["<div class=\"post-gallery\">\n"]
        for image in images:
            url = image.get("url", "")
            if url:
                gallery.append(f"<img src=\"{html.escape(url, quote=True)}\" alt=\"\" loading=\"lazy\">\n")
        gallery.append("</div>")
        return "".join(gallery)

    return pattern.sub(replace, content)


def import_posts(index_path: Path, posts_dir: Path, section: str, zip_path: Path | None = None) -> int:
    parser = TreeParser()
    if zip_path:
        with zipfile.ZipFile(zip_path) as archive:
            entry = next(name for name in archive.namelist() if name.endswith(f"/{index_path.name}"))
            source = archive.read(entry).decode("utf-8", errors="replace")
    else:
        source = index_path.read_text(encoding="utf-8", errors="replace")
    parser.feed(source)
    posts = [node for node in descendants(parser.root, "div") if node.attr("id").startswith("blog-post-")]
    posts_dir.mkdir(parents=True, exist_ok=True)
    imported = 0
    used_slugs: set[str] = set()
    for post in posts:
        header = first(post, "div", "blog-header")
        content = first(post, "div", "blog-content")
        if header is None or content is None:
            continue
        title_node = first(header, "h2", "blog-title")
        date_node = first(header, "span", "date-text")
        if title_node is None or date_node is None:
            continue
        title = text_content(title_node).strip()
        date_text = text_content(date_node).strip()
        try:
            date = datetime.strptime(date_text, "%m/%d/%Y").date()
        except ValueError:
            continue
        slug = slugify(title)
        if slug in used_slugs:
            slug = f"{slug}-{date.strftime('%Y%m%d')}"
        used_slugs.add(slug)
        body = "\n".join(serialize(child) for child in content.children)
        body = convert_slideshows(body)
        body = rewrite_asset_paths(body).strip()
        output = posts_dir / f"{date.isoformat()}-{slug}.html"
        output.write_text(
            f"---\nlayout: post\ntitle: {json_quote(title)}\ndate: {date.isoformat()} 12:00:00 -0500\npermalink: /{section}/{slug}/\n---\n\n{body}\n",
            encoding="utf-8",
        )
        imported += 1
    return imported


def json_quote(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index", type=Path, default=Path("index.html"))
    parser.add_argument("--posts", type=Path, default=Path("_posts"))
    parser.add_argument("--section", default="next-thing-next", help="Original blog URL section")
    parser.add_argument("--zip", type=Path, help="Read the index directly from a ZIP archive")
    args = parser.parse_args()
    count = import_posts(args.index, args.posts, args.section.strip("/"), args.zip)
    print(f"Imported {count} posts from {args.index} into {args.posts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

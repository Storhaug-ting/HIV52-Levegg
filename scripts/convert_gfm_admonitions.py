#!/usr/bin/env python3
"""Convert GitHub-flavored Markdown alerts to Material/Zensical admonitions.

GFM alerts look like:

    > [!NOTE]
    > Some text.
    > More text.

Zensical (via Material for MkDocs / Python-Markdown's `admonition` extension)
expects:

    !!! note

        Some text.
        More text.

This script scans one or more Markdown files, finds GFM alert blockquotes,
and rewrites them in-place to the `!!!`-style admonition syntax. It is
idempotent: files with no GFM alerts are left untouched, and running it
twice on an already-converted file is a no-op.

Usage:
    python3 scripts/convert_gfm_admonitions.py docs/*.md docs/**/*.md
    python3 scripts/convert_gfm_admonitions.py --check docs/*.md   # CI mode
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Map GFM alert keywords to Material for MkDocs admonition types.
# GFM defines: NOTE, TIP, IMPORTANT, WARNING, CAUTION.
# Material/Zensical supported types include: note, abstract, info, tip,
# success, question, warning, failure, danger, bug, example, quote.
GFM_TO_ADMONITION = {
    "NOTE": "note",
    "TIP": "tip",
    "IMPORTANT": "info",
    "WARNING": "warning",
    "CAUTION": "danger",
}

ALERT_START_RE = re.compile(
    r"^> \[!(" + "|".join(GFM_TO_ADMONITION) + r")\]\s*$"
)
QUOTE_LINE_RE = re.compile(r"^>( ?)(.*)$")


def convert_text(text: str) -> tuple[str, int]:
    """Convert all GFM alerts in `text`. Returns (new_text, count converted)."""
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    count = 0

    while i < len(lines):
        line = lines[i]
        match = ALERT_START_RE.match(line)
        if not match:
            out.append(line)
            i += 1
            continue

        admonition_type = GFM_TO_ADMONITION[match.group(1)]

        # Collect all following lines that are part of the same blockquote.
        body: list[str] = []
        j = i + 1
        while j < len(lines) and QUOTE_LINE_RE.match(lines[j]):
            content = QUOTE_LINE_RE.match(lines[j]).group(2)
            body.append(content)
            j += 1

        # Trim a single trailing blank line inside the quote, if present.
        while body and body[-1] == "":
            body.pop()

        out.append(f"!!! {admonition_type}")
        out.append("")
        for body_line in body:
            out.append(f"    {body_line}" if body_line else "")
        count += 1
        i = j

    new_text = "\n".join(out)
    if text.endswith("\n"):
        new_text += "\n"
    return new_text, count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", help="Markdown files to convert")
    parser.add_argument(
        "--check",
        action="store_true",
        help="Don't write changes; exit non-zero if any file would change",
    )
    args = parser.parse_args()

    changed_files = 0
    total_conversions = 0

    for raw_path in args.paths:
        path = Path(raw_path)
        if not path.is_file():
            continue
        original = path.read_text(encoding="utf-8")
        converted, count = convert_text(original)
        if converted != original:
            changed_files += 1
            total_conversions += count
            if args.check:
                print(f"[check] {path}: {count} admonition(s) to convert")
            else:
                path.write_text(converted, encoding="utf-8")
                print(f"{path}: converted {count} admonition(s)")

    if args.check:
        if changed_files:
            print(
                f"\n{changed_files} file(s) contain unconverted GFM alerts "
                f"({total_conversions} total). Run without --check to fix."
            )
            return 1
        print("No unconverted GFM alerts found.")
        return 0

    if changed_files == 0:
        print("No GFM alerts found; nothing to convert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

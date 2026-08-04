#!/usr/bin/env bash
# Build the Zensical site.
#
# docs/*.md is plain GitHub-Flavored Markdown, including GitHub-style alerts
# (`> [!NOTE]`, `> [!TIP]`, ...). Zensical renders these natively as
# admonitions via the `pymdownx.quotes` extension (`callouts = true`, see
# zensical.toml), so no pre-processing step is required.
#
# Usage:
#   scripts/build_docs.sh              # build the site into ./site
#   scripts/build_docs.sh --serve      # `zensical serve` for local preview

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [[ "${1:-}" == "--serve" ]]; then
  exec zensical serve
fi

echo "Building site with Zensical ..."
zensical build --clean

echo "Done. Output in $REPO_ROOT/site"

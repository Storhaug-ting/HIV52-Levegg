#!/usr/bin/env bash
# Build the Zensical site without touching the checked-in Markdown.
#
# The docs/*.md files are written in plain GitHub-Flavored Markdown (GFM),
# including GitHub-style alerts (`> [!NOTE]`, `> [!TIP]`, ...). Zensical
# (Material for MkDocs) does not understand that syntax natively, so this
# script:
#   1. Copies the project into a scratch build directory.
#   2. Runs scripts/convert_gfm_admonitions.py on the *copy* to rewrite GFM
#      alerts into Material/Zensical admonition syntax (`!!! note`, ...).
#   3. Runs `zensical build` against the converted copy.
#   4. Copies the resulting site/ output back to the repo root.
#
# The repo's own docs/*.md files are never modified.
#
# Usage:
#   scripts/build_docs.sh              # build the site into ./site
#   scripts/build_docs.sh --serve      # convert, then `zensical serve` for local preview

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/zensical-build.XXXXXX")"
trap 'rm -rf "$BUILD_DIR"' EXIT

PYTHON="${PYTHON:-python3}"

echo "Staging site in $BUILD_DIR ..."
cp -R "$REPO_ROOT/docs" "$BUILD_DIR/docs"
cp "$REPO_ROOT/mkdocs.yml" "$BUILD_DIR/mkdocs.yml"

echo "Converting GFM alerts to Zensical admonitions (staged copy only) ..."
find "$BUILD_DIR/docs" -name '*.md' -print0 \
  | xargs -0 "$PYTHON" "$REPO_ROOT/scripts/convert_gfm_admonitions.py"

cd "$BUILD_DIR"

if [[ "${1:-}" == "--serve" ]]; then
  exec zensical serve
fi

echo "Building site with Zensical ..."
zensical build --clean

echo "Copying built site to $REPO_ROOT/site ..."
rm -rf "$REPO_ROOT/site"
cp -R "$BUILD_DIR/site" "$REPO_ROOT/site"

echo "Done. Output in $REPO_ROOT/site"

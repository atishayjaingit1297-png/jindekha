#!/usr/bin/env bash
# Usage: npm run content:ocr -- "<file.pdf>" content/source/draft.tsv
set -euo pipefail
python3 "$(dirname "$0")/ocr-pdf.py" "$@"

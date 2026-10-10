#!/usr/bin/env python3
"""Draft a deck TSV from a one-card-per-page PDF (first line = target, remaining lines = forbidden words).

Why OCR: the supplied PDFs were made with "Microsoft Print to PDF", whose text layer drops most
Devanagari conjuncts (e.g. "तत्वार्थ सूत्र" extracts as "त वाथ सू"). Text is therefore OCR'd from
rendered pages, and the PDF text layer is used only as a cross-check.

The output is a DRAFT. A person must compare it against the PDF pages before committing it to
content/source/. See README → "Adding a new deck".

Requires: poppler-utils (pdftoppm, pdftotext), tesseract with the `hin` model, Pillow, numpy.
Usage: python3 scripts/ocr-pdf.py <file.pdf> <out.tsv> [--tessdata DIR]
"""
import argparse
import collections
import os
import re
import subprocess
import sys
import tempfile
import unicodedata

import numpy as np
from PIL import Image


def page_count(pdf):
    info = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True, check=True).stdout
    return int(re.search(r'Pages:\s+(\d+)', info).group(1))


def text_layer(pdf, page):
    return subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), pdf, '-'],
                          capture_output=True, text=True).stdout


def strip(s):
    return re.sub(r'[\s‌‍]', '', unicodedata.normalize('NFC', s))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('out')
    ap.add_argument('--tessdata', default=None)
    a = ap.parse_args()

    rows, notes = [], []
    with tempfile.TemporaryDirectory() as tmp:
        for page in range(1, page_count(a.pdf) + 1):
            layer = text_layer(a.pdf, page)
            if not layer.strip():
                continue  # blank page
            base = os.path.join(tmp, f'p{page}')
            subprocess.run(['pdftoppm', '-r', '300', '-f', str(page), '-l', str(page), '-png', '-singlefile', a.pdf, base], check=True)
            rgb = np.array(Image.open(base + '.png').convert('RGB')).astype(int)
            # Coloured (red) and black text stay dark; grey highlight boxes and white become white.
            bw = np.where(rgb.min(axis=2) < 150, 0, 255).astype('uint8')
            Image.fromarray(bw).save(base + '-bw.png')
            cmd = ['tesseract', base + '-bw.png', 'stdout', '-l', 'hin', '--psm', '6']
            if a.tessdata:
                cmd[3:3] = ['--tessdata-dir', a.tessdata]
            lines = [l.strip() for l in subprocess.run(cmd, capture_output=True, text=True).stdout.splitlines() if l.strip()]
            if len(lines) < 2:
                notes.append(f'page {page}: OCR found {len(lines)} lines')
                continue
            extra = collections.Counter(strip(layer)) - collections.Counter(strip(''.join(lines)))
            if extra:
                notes.append(f'page {page}: glyphs in PDF text layer missing from OCR: {"".join(extra.elements())}')
            rows.append(f'{page}\t{lines[0]}\t{" | ".join(lines[1:])}')

    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(f'# DRAFT from {os.path.basename(a.pdf)} — verify every line against the PDF before use.\n')
        f.write('\n'.join(rows) + '\n')
    print(f'{len(rows)} cards written to {a.out}')
    for n in notes:
        print('check:', n, file=sys.stderr)


if __name__ == '__main__':
    main()

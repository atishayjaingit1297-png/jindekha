# Content data audit

## Summary

| PDF | Pages | Non-blank pages | Layout | Cards | Treated as |
|---|---|---|---|---|---|
| `Jain Taboo 1.pdf` | 990 | 1–45 | 1 card / page, portrait. Target black bold, forbidden words red | 45 | **Deck `jt1` — जैन टैबू — भाग १** |
| `test.pdf` | 495 | 1–23 | 2 cards / page, landscape, all black | 45 | Print re-layout of Jain Taboo 1 (not imported) |
| `test 2.pdf` | 165 | 1–8 | Up to 6 cards / page, all black | 45 | Print re-layout of Jain Taboo 1 (not imported) |
| `Jain Taboo 2 2.pdf` | 49 | 1–49 | 1 card / page, landscape, text on grey highlight | 49 | **Deck `jt2` — जैन टैबू — भाग २** |

**Total: 2 decks, 94 unique cards.** Every card has 1 target and exactly 4 forbidden words.

`test.pdf` and `test 2.pdf` have the same glyph content as `Jain Taboo 1.pdf` (identical character multiset across the whole document). In `test.pdf` the forbidden words are listed in rotated order. That ordering doesn't matter, so neither file adds new cards.

The PDFs contain no categories, difficulty levels or explanations. None were invented. Decks are named after their source files.

## Extraction method

The PDFs were produced by "Microsoft Print to PDF". Their text layer has no Unicode mapping for most Devanagari conjunct glyphs. For example, `pdftotext` turns `तत्वार्थ सूत्र` into `त वाथ सू`. Text was therefore taken in three steps:

1. Every non-blank page was rendered at 300 dpi and binarised. Red and black text became black; the grey highlight and the white background became white.
2. Each page was OCR'd with Tesseract using the Hindi `tessdata_best` model. The resulting draft TSV comes from `scripts/ocr-pdf.py`.
3. **Every card was checked by eye** against the rendered page images and corrected.

The result was then cross-checked automatically against the PDF's own text layer. Every character the text layer does contain must appear in the transcription. **All 94 cards pass.** Running the same cross-check on the raw OCR output alone flags real OCR mistakes, which shows that the check catches errors.

OCR misread 24 words on 22 cards; all were fixed by hand. Examples:

| Card | OCR read | Correct (as printed) |
|---|---|---|
| jt2-017 | चित्र | चरित्र |
| jt2-019 | चास्त्र | चारित्र |
| jt2-032 | सुद्ल | पुद्गल |
| jt2-043 | मछ़िनाथ | मल्लिनाथ |
| jt2-036 | ५५२ जिनालय | ५२ जिनालय |
| jt2-038 | क्षभदेव | ऋषभदेव |
| jt2-008 | र्ड्या | ईर्या |
| jt2-021 | सछ्लेखना | सल्लेखना |
| jt1-017 | ढाई-दट्वीप | ढाई-द्वीप |
| jt1-037 | पार्थनाथ / पद्यावती | पार्श्वनाथ / पद्मावती |
| jt1-006 | कुडलपुर | कुंडलपुर |

The verified transcriptions are the source of truth. They live in `content/source/*.tsv`, with the PDF page number on every line.

## Checks performed (automated in `scripts/build-content.mjs`)

| Check | Result |
|---|---|
| Card has a target and ≥ 1 forbidden word | 94 / 94 pass |
| Forbidden-word count | all cards have 4 |
| Duplicate forbidden word within a card | none |
| Target repeated as its own forbidden word | none |
| Duplicate card ids | none |
| Duplicate targets (across both decks, ignoring spaces) | none |
| Identical cards | none |
| Unicode | stored NFC-normalised; only Devanagari, digits and simple punctuation |

## Entries preserved as printed but flagged for review

The text has **not** been changed. These items are listed in `content/review-flags.json` for a content owner to confirm.

| Card | Entry | Note |
|---|---|---|
| jt1-001 | संकृत | Likely intended संस्कृत |
| jt1-002 | आदिनाथ /रिषभदेव | "रिषभदेव" here vs "ऋषभदेव" on jt2-038; irregular spacing around "/" |
| jt1-003 | अनुव्रत | Commonly अणुव्रत |
| jt1-006 / jt1-016 | कुंडलपुर / कुण्डलपुर | Two spellings |
| jt1-012 | पार्स्वनाथ | Spelled पार्श्वनाथ on jt1-037 and jt1-042 |
| jt1-012 / jt1-042 | शिखर जी / सम्मेद शिखर जी | Overlapping concepts (both kept) |
| jt1-015 / jt1-023 | जिनमन्दिर / मंदिर | Overlapping concepts (both kept) |
| jt1-031 | सामयिक | Commonly सामायिक |
| jt1-034 / jt2-029 | दशलक्षण / दसलक्षण | Two spellings |
| jt1-041 | एक स्वाँस | Commonly एक श्वास |
| jt1-042, jt1-045 | "20", "2 भाई" | Latin digits; other cards use Devanagari digits (३६, ४८, १०८) |
| jt2-021 | समाध मरण | Commonly समाधि मरण (समाधि is also a forbidden word on the same card) |
| jt2-022 | अष्टान्हिका | Also written अष्टाह्निका |

Some words are both a target on one card and a forbidden word on another, e.g. समवशरण, लोभ, शास्त्र, समयसार, शांतिधारा. This is normal for the format and not an error.

## Fixing an entry

Edit the line in `content/source/<deck>.tsv`, remove the matching flag from `content/review-flags.json`, and run `npm run content:build`. Card ids stay the same (`<deck>-<page>`), so saved games are unaffected.

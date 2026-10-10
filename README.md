# जिनदेखा (Jin-Dekha)

> **जिनदेखा, तिन पाइयाँ**

Jin-Dekha is a team word-guessing party game with Jain vocabulary. It runs as an installable, offline-capable Progressive Web App.

In each turn, one player describes the target word on a card to their team. They must not say the target or any of its forbidden words (मना शब्द). The team scores for every word it guesses before the timer runs out.

- **94 cards in 2 decks**, extracted and verified from the supplied PDFs. See [docs/DATA_AUDIT.md](docs/DATA_AUDIT.md).
- 1–6 teams (one team for solo practice, plus a one-tap **Quick game** on the home screen), optional player names (the describer rotates), configurable timer and scoring, round-based or score-target games. See [docs/RULES.md](docs/RULES.md).
- Local multiplayer on one device. It works offline after the first visit, and an unfinished game survives a refresh or the app closing.
- Hindi and English interface (हि/EN switch on the home screen and in Settings). Card words always stay in Hindi, as printed in the PDFs.
- Background music on the home screen and menus; it pauses for the whole game and resumes where it stopped. Loud, distinct sounds for every button press (correct, skip and forbidden each sound different), with music, sound and vibration switches in Settings and sound/vibration switches inside the game.
- The card list is not shown anywhere in the app, so players can't see answers in advance.
- Light and dark themes: follows the device by default, or pick Light/Dark (moon/sun button on the home screen).
- Devanagari fonts bundled (Baloo 2, Mukta). Original branding, artwork and animations, which turn off when the device asks for reduced motion.
- Architecture and the iOS/Android path: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Quick start

Requires Node 20+ (22 recommended).

```bash
npm install
npm run dev          # http://localhost:5173 (service worker disabled in dev)
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Validates content → type-checks → production build in `dist/` (with service worker) |
| `npm run preview` | Serves `dist/` at http://localhost:4173. Use this to test install and offline |
| `npm test` | Unit + integration tests (Vitest, jsdom) |
| `npm run test:e2e` | Playwright end-to-end, PWA/offline and accessibility tests against the production build (run `npm run build` first; `npx playwright install chromium` once) |
| `npm run test:all` | All of the above in order |
| `npm run content:build` | Rebuilds `src/content/generated/decks.json` from `content/source/*.tsv` and validates it |
| `npm run content:ocr -- <file.pdf> <out.tsv>` | Drafts a TSV from a new PDF (see below) |
| `npm run icons` | Re-renders the PNG app icons from the logo geometry |
| `npm run build:preview-file` | One self-contained `dist-preview/index.html` (no service worker) for sharing a playable preview |

## Project layout

```
content/
  decks.json              deck manifest (id, title, source TSV, source PDF)
  source/*.tsv            verified card transcriptions — the content source of truth
  review-flags.json       entries kept as printed but queued for human review
scripts/                  content build/validation, OCR draft tool, icon generator
src/core/                 portable game engine (rules, state machine, scoring, restore)
src/…                     UI, persistence, platform services, PWA — see docs/ARCHITECTURE.md
tests/unit, tests/integration, tests/e2e
docs/                     RULES, DATA_AUDIT, ARCHITECTURE
```

## Adding a new deck from a PDF

The supplied PDFs were made with "Microsoft Print to PDF", which breaks Devanagari conjuncts in the text layer. Text therefore has to be OCR'd and then checked by a person.

1. Install the tools: `poppler-utils`, `tesseract-ocr`, the Hindi model (`hin.traineddata` from tessdata_best), and Python with `pillow` + `numpy`.
2. Draft the deck: `npm run content:ocr -- "My Deck.pdf" content/source/my-deck.tsv`.
   - The script expects one card per page: the first line is the target, the rest are forbidden words.
   - It prints pages where the OCR disagrees with the PDF's text layer.
3. **Open the PDF next to the TSV and correct every line by hand.**
   - Format: `page<TAB>target<TAB>word1 | word2 | word3 | word4`. Lines starting with `#` are comments.
4. Add the deck to `content/decks.json`: `{ "id": "jt3", "title": "…", "source": "content/source/my-deck.tsv", "sourcePdf": "My Deck.pdf" }`.
   - The id must be lowercase alphanumeric. Card ids become `jt3-001`, `jt3-002`, …
5. Run `npm run content:build`. The build fails on structural errors (empty fields, duplicate cards, a target repeated as its own forbidden word) and warns on suspicious ones.
6. Run `npm test`, then commit. The engine and UI need no changes, and the new deck appears on the setup screen.

If you need to fix a word in an existing card, edit its TSV line and rebuild. Card ids are tied to the PDF page, so saved games stay valid.

## Deployment

Any static host with HTTPS works. HTTPS is required for service workers. `localhost` is exempt.

- **Netlify:** connect the repository. `netlify.toml` sets the build command (`npm run build`), the publish directory (`dist`) and cache headers.
- **Vercel:** import the repository. `vercel.json` sets the same.
- **Anything else** (GitHub Pages, Cloudflare Pages, S3 + CloudFront, nginx): run `npm run build` and upload `dist/`.
  - Serve `sw.js` and `manifest.webmanifest` with `Cache-Control: no-cache`.
  - Serve `/assets/*` as immutable.
  - The app uses hash routing (`#/setup`), so no rewrite rules are needed.
  - It expects to be served from the domain root (`/`). For a sub-path, set `base` in `vite.config.ts` and the manifest `start_url`/`scope`.

**Updates.** New versions are fetched in the background. Players see "नया संस्करण उपलब्ध है — अपडेट करें". The app never reloads by itself in the middle of a game.

**Install.**
- Android/desktop Chrome or Edge: the home screen shows an "इंस्टॉल" button, or use the browser menu → Install app.
- iOS Safari: Share → Add to Home Screen.

## Known limitations

- Forbidden-word violations are reported by players. The app doesn't listen to speech.
- One device per game. There are no online multiplayer, accounts or cloud sync (out of scope for the MVP).
- Offline play starts from the **second** load. The first visit downloads and caches everything; after that, every launch works without a network.
- Vibration isn't available on iOS Safari. Screen wake lock needs a recent browser. Both fail silently.
- The deck content contains a few spellings flagged for review (see the audit). They are shown exactly as printed until a content owner confirms changes.
- Tests run on Chromium (Playwright, Pixel 7 and desktop profiles). Real-device testing on iOS Safari and Android hasn't been done.

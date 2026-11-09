# PDF EDITOR FOR THE WEB — MASTER BUILD ROADMAP

> **Goal:** A fast, modern website where a user opens a PDF in the browser and edits it the way they would in Adobe Acrobat's *Edit PDF* tool: click any text and change it in place (any language), choose fonts and formatting, move / resize / rotate / replace / delete images, add new text and images, detect text in scanned PDFs and pictures with **OCR**, manage pages, annotate, fill forms, sign, and save. Everything runs **inside the browser** (WebAssembly), so documents never leave the user's device. Installable as an offline-capable PWA. Clean, modern, free-feeling UI.

> **Origin:** This file replaces the Android build checklist. The core idea is the same (PDFium engine + HarfBuzz text shaping + OCR + command-based undo/redo). Only the platform changes: Kotlin/NDK becomes TypeScript/WebAssembly. Your architecture, hard-problem strategies and test ideas carry over.

> **Research note:** Library status and licenses in this file were checked on 2026-11-09. Re-check versions and licenses at Task 0.13 and Task 1.2 before locking anything.

---

## HOW TO USE THIS FILE

1. Put this file in the root of the repo as `ROADMAP.md`. It is the single source of truth.
2. Start every AI-agent session with the **Session Prompt** below.
3. The agent does **one task**, proves it works, updates this file, commits, and stops. You review, then start the next session.
4. Phases go in order. **Phase 0 (spikes) decides whether the plan is feasible before you spend time on UI.**

### Session Prompt (copy-paste at the start of every session)

```text
You are the build agent for the "PDF Editor Web" project.
1. Read ROADMAP.md fully. Section 0 (rules) is mandatory.
2. Go to "CURRENT TASK POINTER" and do ONLY that task. Do not touch other tasks.
3. Implement it. Run: pnpm typecheck && pnpm lint && pnpm test && pnpm build.
   Verify the task's "Done when" in a real browser (Chrome + one other engine for UI work).
4. Mark the task [x], move the pointer to the next task, add one row to the Progress Log,
   and make one git commit named "P<phase>.<task>: <short description>".
5. Stop. Report: what you did, how you verified it, anything blocked,
   and any decision you need from me.
If something is unclear or missing from the roadmap, add it to the Backlog and ask me.
Do not invent features.
```

---

## PREREQUISITES (DO ONCE, BEFORE TASK 0.1)

- [ ] Install Node.js (current LTS), pnpm, Git and a code editor that has your AI coding agent.
- [ ] Create a GitHub repository (private is fine) and commit this file as `ROADMAP.md`.
- [ ] Create a free account on a static host (Cloudflare Pages, Netlify or Vercel) and connect the repo for preview deploys.
- [ ] Collect the sample PDFs from Appendix A in a local folder. Use your own test files; do not commit private or confidential documents.
- [ ] Install the command-line validators used in tests: `qpdf` and `pdfcpu`. They are dev tools only and are never bundled into the site.
- [ ] Keep at least one real phone (Android or iPhone) and, if possible, a tablet for testing.
- [ ] Decide the product name and domain later (Phase 19), but never use "Adobe" or "Acrobat" in the name.

---

## WHAT CHANGED FROM THE ANDROID PLAN

| Android plan | Web plan |
|---|---|
| Kotlin + Jetpack Compose + Material 3 | TypeScript + React + Vite + Tailwind/shadcn (own design tokens) |
| PDFium via NDK / JNI | PDFium compiled to **WebAssembly**, running in a **Web Worker** |
| ML Kit OCR (+ Tesseract fallback) | Tesseract.js (WASM) baseline + optional PaddleOCR (ONNX Runtime Web); OpenCV.js for preprocessing |
| HarfBuzz through NDK / `TextRunShaper` | `harfbuzzjs` (HarfBuzz compiled to WASM) |
| ICU (`android.icu`) | `Intl.Segmenter` + a UAX #9 bidi library + a UAX #14 line-break library |
| Room / DataStore | IndexedDB (Dexie) and OPFS |
| Storage Access Framework | File picker, drag and drop, File System Access API (Chromium), OPFS working copies |
| Hilt | Plain TypeScript modules + React context |
| Coroutines / Flow | `async/await`, Web Workers, Comlink RPC, Zustand |
| `PrintManager`, `FileProvider` share | `window.print()` on a PDF blob, Web Share API, download |
| Play Store, 16 KB alignment, APK size | Static hosting + CDN, security headers, bundle-size budgets |
| Intents (`ACTION_VIEW` / `SEND`) | PWA file handlers, drag and drop, optional Web Share Target |
| Instrumented device tests | Playwright on Chromium + Firefox + WebKit |

---

## 0. RULES FOR THE AI AGENT (READ FIRST, EVERY SESSION)

1. **Work on exactly one task at a time.** Find it under `## CURRENT TASK POINTER`, do only that task, then stop and update this file.
2. **Never skip ahead.** A phase is complete only when ALL its tasks are `[x]` AND its "Done when" criteria are verified.
3. **Marking progress:** change `[ ]` to `[x]` only after: the code compiles, `typecheck` + `lint` + tests pass, it runs in a real browser (Chrome plus one other engine for UI tasks), and the task's "Done when" is met. Use `[~]` for in-progress and `[!]` for blocked (add a note under it).
4. **After every task:** (a) update the Current Task Pointer, (b) add one line to the Progress Log, (c) make one git commit named `P<phase>.<task>: <short description>`.
5. **Do not invent features** that are not in this file. If something is missing, add it to the Backlog and ask the owner.
6. **Do not change locked decisions** (Section 2) unless a Phase 0 spike fails. If it fails, write the reason in the Progress Log and propose the fallback from Section 4.
7. **Keep code clean:** TypeScript `strict`, no `any` (use `unknown` + narrowing), no god components / god classes, no business logic inside React components (put it in hooks, services or engine packages), no hard-coded UI strings (use i18n files), no hard-coded colors or spacing (use design tokens). Keep files small and focused.
8. **If a task is too big,** split it into sub-tasks (e.g. `7.4a`, `7.4b`) in this file before starting.
9. **Never delete or overwrite the user's original PDF.** All edits go to a working copy (memory + OPFS) until the user explicitly saves or downloads. "Download" creates a new file by default.
10. **Everything runs in the browser.** No document bytes, text, thumbnails or file names are ever sent to a server. **No third-party scripts, fonts, CDNs or analytics at runtime**: self-host the WASM files, workers, OCR language data / models and fonts.
11. **Licenses:** add a dependency only if its license is permissive (MIT, BSD, Apache-2.0, ISC, zlib, FreeType, OFL for fonts). Record it in the license table. **Never add AGPL / GPL / "source-available" libraries** without the owner's written approval.
12. **Nothing heavy on the main thread.** Parsing, rendering, shaping, OCR and saving run in workers. No task longer than 50 ms during user interaction.
13. **Treat every PDF as hostile input.** Never run PDF JavaScript. Never insert PDF-derived text as HTML (use `textContent`). Only allow `http`, `https`, `mailto`, `tel` link targets and ask before opening external links.
14. **Do not copy Adobe's branding.** Matching features is fine. Do not use the Adobe / Acrobat name, logos, icons or exact UI artwork anywhere.
15. **Verify output in other viewers.** Any task that changes the saved PDF must be checked in at least 2 other viewers (Chrome built-in viewer, Firefox PDF.js, Acrobat Reader, macOS Preview).

### Quality gates (a task is NOT done unless all pass)

```text
pnpm typecheck     # zero TypeScript errors
pnpm lint          # zero violations
pnpm test          # unit tests green
pnpm build         # production build succeeds, bundle budgets respected
pnpm e2e           # Playwright smoke tests green (from Phase 1.9 onward)
```

---

## CURRENT TASK POINTER

```
CURRENT PHASE : 0
CURRENT TASK  : 0.2
LAST UPDATED  : 2026-11-09
NOTES         : Spike 0.1 complete. Moving to Spike 0.2 (render to canvas at 2x scale and DPR).
```

---

## ROADMAP AT A GLANCE

| Phase | Name | What you get | Effort* |
|---|---|---|---|
| 0 | Feasibility spikes | Proof that editing, fonts and OCR work in the browser | M |
| 1 | Project setup | Repo, CI, design system, preview deploys | M |
| 2 | PDF engine layer | Worker-based PDFium wrapper | L |
| 3 | Viewer | Fast open, zoom, search, thumbnails | L |
| 4 | App shell and files | Home, recents, autosave, crash recovery | M |
| 5 | Edit model | Select, move, resize, undo / redo | L |
| 6 | Image editing | Detect, move, resize, replace, delete images | M |
| 7 | Text editing | Click-to-edit text in place | XL |
| 8 | Fonts and typography | Font picker, styles, subsetting | L |
| 9 | Multi-language | Arabic, Hebrew, Indic, Thai, CJK | L |
| 10 | OCR | Scanned PDFs and images become searchable / editable | L |
| 11 | Add-content tools | Shapes, drawing, tables, headers, watermarks | M |
| 12 | Annotate, sign, forms | Highlights, comments, signatures, form filling | L |
| 13 | Page management | Reorder, merge, split, extract | M |
| 14 | Save and export | Save, download, print, share | M |
| 15 | Security | Redaction, passwords, metadata | M |
| 16 | Performance | Budgets, memory, robustness | M |
| 17 | Testing and QA | E2E, golden images, interop | L |
| 18 | Polish and accessibility | WCAG, shortcuts, translations | M |
| 19 | Launch | Hosting, legal, SEO, rollout | M |

\*Effort is relative (S < M < L < XL), not calendar time.

**Shippable milestones**

- **M0 — Go / No-Go (end of Phase 0):** the spikes prove the approach, or you pick Plan B (Section 4).
- **M1 — Viewer (end of Phase 4):** a fast, free "PDF viewer" site can already go online.
- **M2 — Editor Alpha (end of Phase 7):** edit text and images, undo / redo, save.
- **M3 — Editor Beta (end of Phase 10):** fonts, many languages, OCR. Invite beta testers.
- **M4 — Feature complete (end of Phase 15).**
- **M5 — Public launch (end of Phase 19).**

> **Why images (Phase 6) come before text (Phase 7):** image editing proves the select / transform / undo / save pipeline with far less risk. Text editing then builds on a pipeline that already works.

---

## 1. PRODUCT SCOPE (WHAT "DONE" LOOKS LIKE)

**Must have (v1.0):**
- Open a PDF by file picker, drag and drop, paste, or "Open with" (installed PWA). No upload.
- Smooth viewing: scroll, pinch / wheel zoom, thumbnails, jump to page, text search, text selection and copy.
- Click text → edit it in place (same font when possible, other fonts selectable).
- Text in all major scripts: Latin, Cyrillic, Greek, Arabic / Hebrew (RTL), Devanagari and other Indic scripts, Thai, Chinese, Japanese, Korean.
- Font family list, size, bold, italic, underline, strikethrough, color, highlight, alignment, line spacing.
- Detect images; select, move, resize, rotate, crop, flip, replace, **delete**; insert new images.
- **OCR:** detect text in scanned pages and in images, make it searchable or fully editable.
- Add new text boxes, shapes, lines, drawings, signatures, stamps, links.
- Page tools: add, delete, rotate, reorder, merge, split, extract.
- Undo / redo for everything. Autosave and crash recovery.
- Save / download, Print, Share, Export pages as images.
- Light and dark theme; desktop, tablet and phone layouts; keyboard shortcuts.
- Works offline once loaded (PWA). Privacy first: files never leave the device.

**Out of scope for v1.0** (Backlog): accounts, cloud sync, collaboration, AI features, PDF to Word conversion, server-side processing.

---

## 2. LOCKED TECH DECISIONS (change only if a Phase 0 spike fails)

| Area | Decision |
|---|---|
| Language | TypeScript (`strict`). C/C++ only if we must build our own PDFium WASM with Emscripten |
| UI | React (latest stable) + Vite |
| Styling / components | Tailwind CSS + shadcn/ui (Radix primitives); design tokens as CSS variables (light + dark) |
| Icons | Lucide |
| State | Zustand for UI state. Document state lives in the engine worker; our `EditSession` owns the command stack |
| Threads | Web Workers + Comlink RPC: engine worker (PDFium), OCR worker(s), shaping / fonts worker |
| PDF render + edit engine | **PDFium compiled to WebAssembly.** Start from `@embedpdf/pdfium` (MIT; PDFium in WASM; 2.x on npm). Hidden behind a `PdfEngine` TypeScript interface so it can be swapped. If its exports lack page objects, font loading or save flags, build our own PDFium WASM |
| Why one engine | The same engine must **render and edit**, so the preview always equals the saved file. PDF.js is a good viewer but not a content editor. Do not mix renderers |
| Text shaping | HarfBuzz via `harfbuzzjs` (WASM) |
| Bidi / line breaking | UAX #9 bidi library (e.g. `bidi-js`), UAX #14 line-break library, `Intl.Segmenter` for Thai / CJK word breaks |
| Fonts | `fontkit` / `opentype.js` for metrics and outlines; HarfBuzz subsetter (WASM) for subsetting and variable-font instancing |
| Text-editing surface | Tiptap (ProseMirror) overlay for typing, IME and selection. **Our own `TextLayoutEngine` does the final layout and writes the PDF text** |
| OCR | Tesseract.js v7 (WASM, 100+ languages) as baseline. PaddleOCR.js / ONNX Runtime Web (PP-OCRv5) as optional high-accuracy engine. Final pick from Task 0.8. OpenCV.js for preprocessing and inpainting |
| Image codecs | Browser `createImageBitmap` + Canvas for decoding; jSquash (MozJPEG / OxiPNG / WebP WASM) for encoding on save |
| Local storage | OPFS (working copies, autosave), IndexedDB via Dexie (recents, settings, signatures), Cache Storage (fonts, OCR models) |
| File access | `<input type=file>`, drag and drop, File System Access API where available, download fallback |
| Offline / PWA | Service worker (Workbox / `vite-plugin-pwa`), web app manifest with file handlers |
| Repo | pnpm workspaces + Turborepo monorepo |
| Testing | Vitest, Playwright (Chromium + Firefox + WebKit), axe-core, pixelmatch |
| CI / CD | GitHub Actions → static host (Cloudflare Pages, Netlify or Vercel) with preview deploys |
| i18n | i18next; CSS logical properties for RTL |
| Browser support | Latest 2 versions of Chrome, Edge, Firefox, Safari (macOS + iOS), Chrome Android. Feature-detect, never user-agent sniff |
| Security headers | COOP `same-origin` + COEP `require-corp` (cross-origin isolation for multithreaded WASM); strict CSP with `'wasm-unsafe-eval'` |
| Backend | **None in v1.0** (static site). Optional later for accounts / cloud: Backlog |

> **License warning:** MuPDF / mupdf.js and iText are AGPL. Do NOT use them unless the owner buys a commercial license or open-sources the whole site under AGPL. Nutrient (PSPDFKit) and Apryse (PDFTron) are commercial and paid: allowed only if the owner picks "buy instead of build" (Plan B).
>
> **Do not use `pdf-lib`, `jsPDF` or `pdfmake` as the editing engine.** They create or append PDFs but cannot edit existing text or images in place (and `pdf-lib`'s upstream repo is largely inactive).

---

## 3. ARCHITECTURE OVERVIEW (TARGET STRUCTURE)

```
apps/
  editor/                 -> Vite + React app (the product): routes, shell, features
  marketing/              -> static SEO / landing / help site (Phase 19)
packages/
  pdf-engine/             -> PdfEngine interface, PDFium WASM wrapper, engine worker
    wasm/                 -> build scripts + export list (only if we build PDFium ourselves)
  pdf-model/              -> PageObject types, geometry, CoordinateMapper, text grouping (pure TS)
  text-layout/            -> shaping (HarfBuzz), bidi, line breaking, font fallback, TextLayoutEngine
  fonts/                  -> font catalog, loader, subsetting, matching
  ocr/                    -> OcrEngine interface, Tesseract + Paddle adapters, preprocessing, inpainting
  edit-core/              -> EditSession, EditCommand, undo / redo, selection model
  ui/                     -> design system: tokens, shared components
  i18n/                   -> translations and locale helpers
  test-fixtures/          -> sample PDFs + golden images
```

Feature folders inside `apps/editor/src/features/`: `home`, `viewer`, `editor`, `text`, `fonts`, `images`, `annotations`, `pages`, `ocr`, `tools` (password, redact, watermark, compress, export), `settings`.

**Key concepts the agent must implement and keep consistent:**
- `PdfDocument` — opened document handle (engine-owned, closed when done).
- `PdfPage` — page handle with size, rotation, boxes, objects.
- `PageObject` — union type: `TextRun`, `ImageObject`, `PathObject` (vector), `FormObject`, `Annotation`.
- `EditCommand` — every change is a command with `apply()` and `revert()` (powers undo / redo).
- `EditSession` — holds the working copy, command stack, dirty flag.
- `TextLayoutEngine` — the **only** code that decides line breaks and glyph positions for new text. Used by the live preview and by the final commit, so both match.
- Coordinate spaces: **PDF space** (points, origin bottom-left), **page-bitmap space**, **CSS-pixel / screen space**. One `CoordinateMapper` converts between them. Never convert ad hoc.

**Engine interface sketch (no PDFium types may leak out of `pdf-engine`):**

```ts
export interface PdfEngine {
  open(data: ArrayBuffer | Blob, opts?: { password?: string }): Promise<DocumentHandle>;
  close(doc: DocumentHandle): Promise<void>;
  pageCount(doc: DocumentHandle): Promise<number>;
  pageInfo(doc: DocumentHandle, page: number): Promise<PageInfo>;        // size, rotation, boxes
  renderPage(doc: DocumentHandle, page: number, opts: RenderOptions,
             signal?: AbortSignal): Promise<ImageBitmap>;
  getPageObjects(doc: DocumentHandle, page: number): Promise<PageObject[]>;
  extractText(doc: DocumentHandle, page: number): Promise<TextRun[]>;
  mutate(doc: DocumentHandle, page: number, ops: PageMutation[]): Promise<MutationResult>;
  save(doc: DocumentHandle, opts?: SaveOptions): Promise<Blob>;          // always a NEW file
}
```

---

## 3B. UX BLUEPRINT (WHAT THE SCREEN SHOULD FEEL LIKE)

```
+------------------------------------------------------------------------------+
| Logo  contract.pdf  (Saved on this device)     Undo Redo  Search   [Download] |  top bar
+------+------------------------------------------------------+----------------+
| Tool |  Contextual toolbar (changes with the selection):    |  Properties    |
| rail |  Font v  Size v  B I U S  Color  Align  Spacing      |  (Text / Image |
|      +------------------------------------------------------+   / Page / OCR)|
| Sel  |                  +----------------+                  |                |
| Text |                  |   PDF page     |                  |  X, Y, W, H    |
| Img  |                  |   (canvas)     |                  |  Rotation      |
| Draw |                  |                |                  |  Opacity ...   |
| Page |                  +----------------+                  |                |
+------+------------------------------------------------------+----------------+
| Thumbnails >      Page 3 / 24          - 100% +     Fit v                    |  status bar
+------------------------------------------------------------------------------+
```

- **Single click** on text → block outline + handles. **Double-click** or `Enter` → edit mode. `Esc` exits. Click outside commits.
- A **contextual toolbar** appears above the selection; the **properties panel** on the right shows exact values.
- Right-click menu: cut, copy, paste, duplicate, delete, bring to front / send to back.
- Always show a calm status: "Saved on this device" and a clear primary **Download** button. A small dot marks unsaved changes.
- Phone layout: tools move to a bottom sheet; editing is available but optimized for tablets and desktop.
- Font and OCR downloads always show size and progress. A permanent privacy line: "Your files stay on your device."
- **UI quality bar:** 8 px grid, one accent color, no clutter, touch targets at least 44x44 CSS px, motion at most 200 ms (respect `prefers-reduced-motion`), no more than 5 primary actions visible at once, real empty / loading / error states.

---

## 4. KNOWN HARD PROBLEMS AND FALLBACKS (READ BEFORE PHASE 7)

A PDF is **not** a flowing document like Word. Text is stored as positioned glyphs, often split into tiny pieces, and fonts are usually **subsets** that contain only the letters used. Plan for this.

| Problem | Strategy | Fallback |
|---|---|---|
| Text is split into fragments, not paragraphs | Group runs into lines, then blocks, using baseline, font, size, gaps and columns | Let the user drag-select a region and treat it as one block |
| Embedded font is a subset (new letters missing) | Detect missing glyphs; reuse the font only if every needed glyph exists | Replace the whole edited block with the closest bundled font and tell the user |
| Editing changes text length (PDF has no auto-reflow) | Re-wrap only inside the block's original box; let the box grow downward | Warn on overflow; offer shrink-to-fit |
| Old text must disappear, not just be covered | Remove the original text objects (also inside Form XObjects), regenerate content, verify with text extraction | If removal fails, paint a same-color cover and flag the block "covered" |
| Complex scripts need shaping (Arabic joins, Indic conjuncts) | HarfBuzz → glyph IDs → CID font (Identity-H) + `ToUnicode` | One text object per glyph / cluster; else vector outlines + invisible text layer (flag it) |
| Right-to-left and mixed-direction text | UAX #9 bidi, mirrored alignment, caret logic | Whole-block editing only for RTL |
| Scanned PDFs and text inside images have no text | OCR → invisible text layer, or erase + real text | "Replace page image with editable text" |
| Text was converted to outlines (curves) | Detect glyph-shaped paths with no text objects | Offer "Detect text (OCR)" on that region |
| **Browser preview differs from saved PDF** (overlay uses browser layout, PDF uses ours) | Same fonts, same HarfBuzz shaping, same line-break rules in preview and commit; parity test in CI | Live preview by re-rendering the block with PDFium (debounced); keep DOM text transparent, only for caret and selection |
| Embedded fonts often cannot load in browsers (raw CFF / Type 1, missing tables) | Try `FontFace` and validate | Use the closest metric-compatible bundled font in the overlay; the final render always comes from PDFium |
| Large PDFs run out of memory (WASM cap, iOS Safari tab limits) | Tile rendering, bitmap LRU cache, render only visible pages, chunked file reads | Lower render scale; "large file" notice; hard limit from Task 0.9 |
| One heavy job freezes the page or crashes | Everything heavy in workers; cancellable jobs | Auto-restart a crashed worker and restore from autosave |
| PDFium appears to have no public API to **write** encrypted PDFs (confirm in Task 0.12) | Open with password and save without security (verify the save flag in a spike) | Use a qpdf-WASM build for "Add password", or move it to Backlog |
| Password-protected PDFs | Prompt, retry, cancel | Clear error if wrong |
| Signed PDFs: editing invalidates signatures | Detect signature fields; warn before editing | "Save as copy (signature no longer valid)" |
| Tagged-PDF structure is lost on edited content | Warn in the export dialog | Backlog: auto-tagging |
| Safari / Firefox cannot "save in place" | Feature-detect the File System Access API | Download a new file (the default anyway) |
| Fonts and OCR models are large | Lazy-load, cache, show size first | Bundled core fonts keep the site usable offline |
| Font license limits | Ship only OFL / Apache fonts; check `OS/2.fsType` on imported fonts | Refuse to embed restricted fonts and tell the user |
| Third-party scripts break cross-origin isolation (COEP) | Self-host everything | If ads are ever added, keep them on marketing pages only, never in the editor |

**Plan B (only if Phase 0 proves in-browser editing impossible):** (1) switch to a commercial SDK (Apryse or Nutrient): fastest, but paid; (2) run PDFium on a server: needs a backend and breaks the "files never leave your device" promise, so users must be told; (3) shrink v1.0 to annotation-level editing + OCR (what open-source EmbedPDF already offers) and add true text editing later. Decide with the owner.

---

# PHASES

---

## PHASE 0 — FEASIBILITY SPIKES (DO NOT BUILD THE APP YET)

**Goal:** Prove the hard parts work in a browser before investing in UI. Each spike is a tiny throwaway project or test page. Record every result in the Progress Log.

- [x] **0.1** Throwaway Vite + TypeScript project: load PDFium WASM inside a **Web Worker** (start with `@embedpdf/pdfium`; if its exports are too limited, build PDFium to WASM yourself with Emscripten). *Done when:* the worker reports PDFium is initialized and shows it on screen in Chrome, Firefox and Safari.
- [ ] **0.2** Open a PDF from an `ArrayBuffer` and render page 1 to a canvas at 2x scale and at `devicePixelRatio`. *Done when:* output looks identical to Chrome's built-in viewer on 3 sample PDFs.
- [ ] **0.3** List all page objects (text, image, path, form XObject) with bounding boxes and draw them as a DOM / SVG overlay. *Done when:* boxes align with visible content at several zoom levels and on a rotated page.
- [ ] **0.4** Extract text runs: Unicode string, font name, size, fill color, matrix, bounding box, per-character boxes, and "is the font an embedded subset?". *Done when:* output matches the visible text on 3 different PDFs.
- [ ] **0.5** Delete one text object, insert a new text object with a bundled TTF (`FPDFText_LoadFont` or equivalent), regenerate page content, save to a new file. *Done when:* the saved PDF renders correctly in at least 3 other viewers and text extraction shows **no ghost text**.
- [ ] **0.6** Complex scripts: shape **Arabic** and **Hindi (Devanagari)** with `harfbuzzjs`; embed as a CID font (Identity-H, glyph IDs, `ToUnicode`; check whether `FPDFText_LoadCidType2Font` is exported). Also test both fallbacks: (a) one text object per glyph / cluster, (b) vector outlines + invisible text layer. *Done when:* joined letters and conjuncts look right in external viewers and text is searchable / copyable, or the fallback chosen is recorded in the Spike Report.
- [ ] **0.7** Images: find an image object; change its matrix (move + scale + rotate); delete another; insert a new PNG (with transparency) and a JPEG; save. *Done when:* the result displays correctly in external viewers.
- [ ] **0.8** **OCR bake-off:** run Tesseract.js and PaddleOCR.js on rendered scanned pages (English + one Indic or Arabic + one CJK sample). Self-host workers, WASM and language data (the default CDN paths break our privacy and CSP rules). Record character error rate, speed, download size and language coverage. *Done when:* at least 90% correct on clean samples and a primary engine is chosen with data.
- [ ] **0.9** Memory and big files: open a ~100 MB / 500-page PDF; compare full load vs chunked reads (custom file access with Blob range reads); measure the WASM heap; test on a low-RAM laptop and on iOS Safari. *Done when:* hard limits and warning thresholds are written down.
- [ ] **0.10** Hosting spike: deploy a hello-world to the chosen host with COOP / COEP + CSP (`'wasm-unsafe-eval'`) headers. *Done when:* on the **deployed URL** (not only localhost) `crossOriginIsolated` is `true` and workers, WASM and OPFS work.
- [ ] **0.11** Text-editing surface spike: Tiptap / ProseMirror overlay on a rendered page; test IME composition (Japanese, Chinese, Hindi, Arabic keyboards; Android and iOS virtual keyboards); try loading the PDF's embedded font through `FontFace` and compare overlay vs PDFium render. *Done when:* typing works with IMEs and the overlay-vs-PDF mismatch is measured and written down.
- [ ] **0.12** Spot-check the **save and encryption flags**: open an encrypted PDF with its password and save without security; try adding a password with the engine (expected: not possible, see Section 4). *Done when:* the result is recorded and the plan for "Add password" is decided.
- [ ] **0.13** Write the **Spike Report** (bottom of this file): what worked, what failed, final engine decision, **license audit of every dependency**, Go / No-Go. *Done when:* the owner approves it. **If a spike failed, apply the fallback from Section 4 first.**

**PHASE 0 Done when:** every spike is `[x]` and the report is approved.

---

## PHASE 1 — PROJECT SETUP AND TOOLING

- [ ] **1.1** Create the pnpm + Turborepo monorepo with the structure from Section 3. *Done when:* `pnpm install && pnpm build` works from a clean clone.
- [ ] **1.2** TypeScript `strict` everywhere, project references, path aliases, **exact** dependency versions, committed lockfile. *Done when:* `pnpm typecheck` passes in every package.
- [ ] **1.3** Vite + React app shell (`apps/editor`) with code splitting and worker / WASM plumbing (`new Worker(new URL(...), import.meta.url)`). *Done when:* a worker loads and replies in dev **and** in a production build.
- [ ] **1.4** Lint + format (ESLint flat config + Prettier, or Biome) with a command that fails on violations. *Done when:* `pnpm lint` fails on a deliberately bad file and passes on the repo.
- [ ] **1.5** Design-system package: tokens (colors, 8 px spacing grid, radius, shadows, type scale) as CSS variables for light + dark; Tailwind theme mapped to tokens; base components (Button, IconButton, Tooltip, Dialog, Popover, Menu, Tabs, Slider, Switch, Select, Toast). *Done when:* a style-guide page shows every component in light and dark.
- [ ] **1.6** Routing skeleton: `Home → Editor → Page Organizer → Settings`, lazy-loaded. *Done when:* routes work on refresh and deep links.
- [ ] **1.7** State, errors, logging: Zustand store layout, React error boundaries, a tiny leveled logger, and a global `error` / `unhandledrejection` handler that saves recovery metadata. *Done when:* a thrown error shows a friendly screen and no work is lost.
- [ ] **1.8** i18n scaffolding (i18next): English only for now, **no hard-coded UI text**, CSS logical properties, `dir` switching. *Done when:* a pseudo-locale (long strings + RTL) renders without broken layout.
- [ ] **1.9** Test setup: Vitest, Playwright (Chromium, Firefox, WebKit), the `test-fixtures` package, a golden-image helper (pixelmatch). *Done when:* one unit test and one e2e smoke test run locally and in CI.
- [ ] **1.10** CI (GitHub Actions): install → typecheck → lint → unit → build → e2e smoke → license check → bundle-size budget; preview deploy per pull request. *Done when:* CI is green and a preview URL appears on a PR.
- [ ] **1.11** Security + PWA baseline: headers (COOP, COEP, CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options), dependency audit + Renovate / Dependabot, web app manifest, service-worker shell. *Done when:* a header checker shows the target policy and the app shell loads offline.

**Done when:** an empty Home page deploys to a preview URL in light and dark theme, CI is green, headers are verified.

---

## PHASE 2 — PDF ENGINE LAYER (`pdf-engine` PACKAGE)

- [ ] **2.1** Define the `PdfEngine` TypeScript interface and domain models (Section 3 sketch). No PDFium types may leak outside this package. *Done when:* interfaces compile and a mock engine passes the same unit tests.
- [ ] **2.2** Worker host + RPC (Comlink): one engine worker, a serialized request queue (PDFium is not thread-safe), cancellation via `AbortSignal`, transferables for bitmaps and buffers. *Done when:* 100 concurrent calls from the UI run correctly and cancellation works.
- [ ] **2.3** WASM loading strategy: lazy load, streaming compile, cached by the service worker, loading progress UI. *Done when:* second visit starts the engine from cache, offline.
- [ ] **2.4** Open a document from `ArrayBuffer` / `Blob` with optional password; chunked reads for big files (per Task 0.9). *Done when:* wrong password returns `WrongPassword` and a 100 MB file opens within the limits.
- [ ] **2.5** Page render to `ImageBitmap` with options: scale, `devicePixelRatio`, clip rect (for tiles), rotation, annotations on / off. PDFium renders into a WASM bitmap buffer; copy it to `ImageData` and transfer an `ImageBitmap` (no `OffscreenCanvas` dependency). *Done when:* arbitrary scale, tiles and rotation render correctly in all 3 browser engines.
- [ ] **2.6** Page-object enumeration returning `PageObject` models (type, bounds, matrix, z-index, parent form chain). *Done when:* objects match the Task 0.3 overlay on the sample set.
- [ ] **2.7** Text-object details: string, font name, size, fill / stroke color, render mode, char boxes, character / word spacing, horizontal scale, rotation, embedded-font info (subset, full, not embedded, flags, weight).
- [ ] **2.8** Image-object details: bitmap preview, pixel size, bounds, matrix, filters, color space, mask / soft-mask info, effective DPI.
- [ ] **2.9** Path-object details (vector shapes): bounds, segments, stroke, fill, width, dash.
- [ ] **2.10** Form XObject traversal: enumerate and edit objects inside forms with correct transform composition. *Done when:* text inside a form XObject can be listed and removed.
- [ ] **2.11** Mutation API: `removeObject`, `insertTextObject`, `insertImageObject`, `insertPathObject`, `setMatrix`, `setColor`, `reorderObject`, `setTextRenderMode`, then `generateContent`. *Done when:* mutations apply, regenerate the page content and update the object list.
- [ ] **2.12** Save: write a **new** file (never mutate the source bytes); full and incremental options; stream to OPFS / `Blob`. *Done when:* the original bytes are unchanged and the saved file opens in 3 other viewers.
- [ ] **2.13** Memory management: explicit `close()` for documents / pages / bitmaps, a dev-mode leak detector, heap monitoring, auto-restart of the worker above a heap threshold.
- [ ] **2.14** Error model: `PdfError` union (Corrupt, WrongPassword, Unsupported, OutOfMemory, IO, Cancelled) mapped from engine errors.
- [ ] **2.15** Integration tests on the **10-PDF sample set** (Appendix A) plus validators in CI (`qpdf --check`, `pdfcpu validate`, and a headless PDF.js open). *Done when:* the suite opens, renders, enumerates, mutates, saves and re-validates every sample.

**Done when:** a test page can open any sample PDF, render all pages, list objects, apply one mutation and save a valid file that opens in other viewers.

---

## PHASE 3 — VIEWER (OPEN, RENDER, NAVIGATE)

- [ ] **3.1** `PageCanvas` component: shows one page bitmap with a placeholder, correct aspect ratio and an accessible label. *Done when:* looks right in light and dark.
- [ ] **3.2** Virtualized continuous page list (e.g. TanStack Virtual); render only visible pages plus 1 page lookahead. *Done when:* a 300-page file scrolls without rendering hidden pages.
- [ ] **3.3** Tile-based rendering for high zoom (render only the visible region at the current scale). *Done when:* 800% zoom stays sharp with bounded memory.
- [ ] **3.4** Zoom and pan: Ctrl / Cmd + wheel, trackpad pinch, touch pinch, double-tap, keyboard `+` / `-`; clamp 25% to 800%. *Done when:* works with mouse, trackpad and touch.
- [ ] **3.5** Bitmap LRU cache with a memory budget (use `navigator.deviceMemory` when available); always call `ImageBitmap.close()` on eviction.
- [ ] **3.6** Render scheduler: priority queue (visible > near > thumbnails), cancel stale jobs on fast scroll, shimmer placeholder.
- [ ] **3.7** Thumbnail sidebar with click-to-jump (lazy rendered).
- [ ] **3.8** Page indicator (`3 / 24`), "go to page", keyboard navigation (PgUp / PgDn / Home / End).
- [ ] **3.9** Text search: find bar, highlight all, next / previous, case / whole-word options.
- [ ] **3.10** Text selection and copy in view mode (own selection layer built from engine character boxes).
- [ ] **3.11** Fit modes: fit width, fit page, actual size; remembered per document.
- [ ] **3.12** Page layout modes: continuous (default), single page, two-page spread (optional).
- [ ] **3.13** Password-protected PDFs: dialog, retry, cancel.
- [ ] **3.14** Corrupt or unsupported files: friendly error screen with a way back.
- [ ] **3.15** Resize / orientation / DPR-change survival: keep scroll and zoom, no flash; restore last position per document.

**Done when:** a 300-page PDF shows page 1 in under 2 seconds on a mid-range laptop, scrolls at ~60 fps, and does not crash on zoom spam.

---

## PHASE 4 — APP SHELL, FILE MANAGEMENT, CLEAN UI

- [ ] **4.1** Home screen: large drop zone ("Drop a PDF or click to open"), "Create blank PDF", recent-files grid with thumbnails (local only).
- [ ] **4.2** Open via picker, drag and drop (anywhere on the page), paste, and PWA file handler / `launchQueue`; use `showOpenFilePicker` where supported.
- [ ] **4.3** Recent files in IndexedDB: name, file handle (if available), last opened, page count, thumbnail, last position; re-request permission when needed.
- [ ] **4.4** Recent file actions: remove from list, rename (copy), delete, download again.
- [ ] **4.5** Create blank PDF (A4 / Letter / Legal / custom, orientation).
- [ ] **4.6** **Working-copy system:** on open, copy bytes to OPFS (IndexedDB blob fallback); all edits go to this copy; the original is untouched.
- [ ] **4.7** Autosave: working copy + command-log snapshot every N seconds and on `visibilitychange` / `pagehide`.
- [ ] **4.8** Crash / tab-close recovery: next visit offers "Restore unsaved changes".
- [ ] **4.9** Editor layout (Section 3B): top bar, tool rail, canvas, contextual toolbar, properties panel, status bar.
- [ ] **4.10** Mode switcher: View · Edit Text · Edit Images · Annotate · Pages (always visible, clear active state).
- [ ] **4.11** Command palette (Ctrl / Cmd + K), shortcut map and a shortcuts help dialog.
- [ ] **4.12** Onboarding: 3 short screens, skippable, shown once, with the privacy promise.
- [ ] **4.13** Settings: theme (system / light / dark), default font, units, language, default save behavior, clear local data, licenses, privacy statement.
- [ ] **4.14** Responsive layouts: desktop, tablet (touch-friendly), phone (collapsed panels, bottom sheet), light / dark polish, reduced-motion support.

**UI quality bar (verify visually):** see Section 3B.

**Done when:** a user can open a file from anywhere, see it in recents, reopen it later at the same position, and recover work after closing the tab mid-edit.

---

## PHASE 5 — EDIT MODEL, SELECTION, UNDO / REDO (BUILD BEFORE EDITING FEATURES)

- [ ] **5.1** `EditSession`: working-copy handle, command stack, dirty flag, transaction grouping.
- [ ] **5.2** `EditCommand` interface (`apply`, `revert`, `mergeWith` for coalescing) + undo / redo stacks. Undo uses **serialized object snapshots** (recreate objects) plus a full-document checkpoint every N commands for safety; history is capped by memory.
- [ ] **5.3** Commands: `MoveObject`, `ResizeObject`, `RotateObject`, `DeleteObject`, `InsertObject`, `EditTextBlock`, `ChangeStyle`, `ReorderObject`, `PageOperation`, `Batch`.
- [ ] **5.4** `CoordinateMapper` (PDF ↔ bitmap ↔ CSS px) with unit tests for rotated pages, crop boxes, `UserUnit`, DPR and zoom.
- [ ] **5.5** Hit-testing: click → topmost object under the pointer (with tolerance); `Alt`-click or long-press cycles through overlapping objects.
- [ ] **5.6** Selection overlay (SVG / canvas layer): bounding box, 8 resize handles, rotate handle, drag-to-move; handles keep a constant on-screen size at any zoom.
- [ ] **5.7** Multi-select (Shift-click, marquee, `Ctrl/Cmd + A`) and group move / delete.
- [ ] **5.8** Snapping and alignment guides (page center, margins, other objects), toggleable.
- [ ] **5.9** Nudge with arrow keys (1 pt, `Shift` = 10 pt) and numeric X / Y / W / H inputs in the properties panel.
- [ ] **5.10** Copy / cut / paste / duplicate (within a page, across pages, across documents); system clipboard for text and images.
- [ ] **5.11** Wire undo / redo to the top bar and shortcuts (`Ctrl/Cmd + Z`, `Shift + Z` / `Ctrl + Y`) with enabled / disabled state; keep history across mode changes.
- [ ] **5.12** Unit tests for all commands: `apply` then `revert` returns the exact original state (compare serialized model + render checksum).

**Done when:** any object can be selected, moved, resized and deleted, and every action can be undone / redone 50+ times without corruption.

---

## PHASE 6 — IMAGE DETECTION AND EDITING

- [ ] **6.1** Detect all image objects per page (including images inside Form XObjects, inline images and image masks); cache bounds, pixel size and effective DPI. *Done when:* every image in the sample set is listed correctly.
- [ ] **6.2** Edit Images mode: images become selectable objects; click selects; `Alt`-click or long-press cycles through overlapping images.
- [ ] **6.3** Move an image (drag + arrow keys) with snapping guides.
- [ ] **6.4** Resize with corner handles (keep aspect ratio by default; `Shift` toggles; edge handles for free resize). Show size in pt / px / mm / in and warn when effective DPI drops below ~150.
- [ ] **6.5** Rotate (handle + 90° buttons) and flip horizontal / vertical.
- [ ] **6.6** Crop: non-destructive crop rectangle (clip path) with presets 1:1, 4:3, 16:9, free; optional "apply crop" that really removes the cropped pixels to shrink the file.
- [ ] **6.7** **Delete image** (undoable). When an image covers most of the page (likely a background or a scan), ask for confirmation.
- [ ] **6.8** Replace image: file picker, drag and drop, paste; fit / fill / stretch options keep the same box.
- [ ] **6.9** Insert a new image: file, drag and drop, paste, camera (`<input capture>` on phones); place at center; auto-scale to fit the page width at most; keep PNG transparency.
- [ ] **6.10** Adjustments: opacity, brightness, contrast, grayscale / black-and-white (re-encode in a worker; mark as destructive).
- [ ] **6.11** Layer order: bring forward / send backward / to front / to back. Show a note that PDF is fixed layout (text does not wrap around images).
- [ ] **6.12** Extract / save image (PNG or JPG download) and copy image to clipboard.
- [ ] **6.13** Compression on save (original / high / medium / low) using jSquash encoders; keep transparency (soft mask); **never re-encode untouched images**.
- [ ] **6.14** Handle image masks, soft masks, ICC / CMYK images, JPX, JBIG2 and CCITT correctly in preview and on save.
- [ ] **6.15** (Optional) Remove background with an on-device model. Check the library's and model's license first. Move to Backlog if time is short.

**Done when:** every image in the 10 test PDFs is detected, and move / resize / rotate / crop / replace / delete all persist after save + reopen in external viewers.

---

## PHASE 7 — TEXT EXTRACTION AND IN-PLACE TEXT EDITING (THE CORE FEATURE)

> Until Phase 8 delivers the full font system, use a minimal bundled set (for example Noto Sans, Roboto and Liberation Sans / Serif / Mono).

### 7A. Detection and grouping
- [ ] **7.1** Extract all text runs per page (from Phase 2) and cache them per page.
- [ ] **7.2** Group runs into lines and blocks using baseline, font, size, color, gaps and column detection. *Done when:* unit tests pass on fixtures: single column, two columns, tables, headers / footers, lists.
- [ ] **7.3** Handle rotated text, vertical text (CJK) and text with non-zero character spacing / horizontal scaling.
- [ ] **7.4** Detect whether each block's font is embedded-subset, embedded-full or not embedded; store `canReuseFont` and `missingGlyphs`.
- [ ] **7.5** Edit Text mode: hover outline, click selects the block. If the text is not editable (outlined or raster), show a hint with a "Detect text (OCR)" button (becomes active in Phase 10).
- [ ] **7.6** "Select text region" tool (drag a rectangle) for cases where auto-grouping is wrong.

### 7B. In-place editing
- [ ] **7.7** Inline editor overlay opens exactly over the block: same font (a `FontFace` made from the PDF's embedded font, or the matched bundled font), same size, color and alignment, with a visible caret.
- [ ] **7.8** Typing surface built on Tiptap / ProseMirror: IME composition, spellcheck, paste as plain text, `dir="auto"`, mobile virtual keyboards, voice and handwriting input.
- [ ] **7.9** Selection basics: double-click word, triple-click line / paragraph, `Shift` + arrows, Home / End, `Ctrl/Cmd + A`, context menu.
- [ ] **7.10** Live wrapped layout inside the block width using `TextLayoutEngine` (same line breaks as the commit); overflow indicator; options: grow box downward or shrink-to-fit.
- [ ] **7.11** **Commit:** remove the original text objects of the block (including inside Form XObjects), insert new text objects (one per line / run) with correct baselines and the chosen font, handle kerning and spacing, regenerate content.
- [ ] **7.12** Missing-glyph handling: automatically use the closest bundled font for the block (or a per-character fallback) and show a small non-blocking notice ("Font changed to keep all letters").
- [ ] **7.13** Preserve the original color, opacity, rotation and alignment unless the user changes them.
- [ ] **7.14** Partial-style editing: different bold / italic / color / size inside one block (split into several text objects on commit).
- [ ] **7.15** "Add text box": click to place or drag an area; default font and size from settings; resizable; auto-grow option.
- [ ] **7.16** Delete a text block (undoable).
- [ ] **7.17** Move, resize width (re-wrap) and rotate text blocks.
- [ ] **7.18** Find & Replace across the document (case-sensitive, whole-word, replace one / all). Each replacement is an undoable command; warn when a replacement overflows.
- [ ] **7.19** Wrap commits in `EditTextBlock` commands with coalescing so undo steps feel natural (per word / per pause).
- [ ] **7.20** Keep output searchable and copyable (`ToUnicode`, sensible reading order). *Done when:* text extracted from the saved file equals what the user typed.
- [ ] **7.21** Verify in external viewers (Chrome, Firefox PDF.js, Acrobat Reader, macOS Preview): identical look and **no ghost text**.
- [ ] **7.22** Parity test in CI: overlay layout vs PDFium render of the committed block (same line breaks; glyph positions within tolerance).

**Done when:** on 10 varied real-world PDFs, a user can click a paragraph, type changes, and the saved PDF looks right in 3 other viewers, with no leftover ghost text.

---

## PHASE 8 — FONTS AND TYPOGRAPHY (GOOGLE-DOCS-STYLE)

- [ ] **8.1** `FontCatalog` model: family, weights, styles, supported scripts, source (bundled / downloaded / local / user / from PDF), license, `embeddable` flag.
- [ ] **8.2** Bundle a starter set of open-license (OFL / Apache) fonts, self-hosted: Roboto, Open Sans, Lato, Montserrat, Poppins, Inter, Source Sans 3, Nunito, Raleway, Merriweather, Playfair Display, Lora, PT Serif, Source Serif 4, Source Code Pro, Roboto Mono, Dancing Script, Pacifico, Oswald, plus metric-compatible stand-ins for common Microsoft fonts (Liberation Sans / Serif / Mono, Carlito for Calibri, Caladea for Cambria; verify each license). Use WOFF2 for UI preview and TTF / OTF for embedding.
- [ ] **8.3** Noto fonts for script coverage, downloaded on demand: Noto Sans / Serif (Latin, Cyrillic, Greek), Arabic, Hebrew, Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Gurmukhi, Thai, CJK (SC / TC / JP / KR); emoji optional.
- [ ] **8.4** On-demand font download with progress UI, Cache Storage, size limit and version / hash check. The site must still work offline with the bundled fonts. **Self-host the files; never call Google Fonts at runtime** (privacy).
- [ ] **8.5** Local fonts as an optional source through the Local Font Access API (Chromium only, needs permission); respect embedding flags.
- [ ] **8.6** "Import font" (TTF / OTF / WOFF2) from the device with an `OS/2.fsType` embedding-permission check.
- [ ] **8.7** Font picker like Google Docs: searchable, virtualized list; each name shown in its own typeface; recent fonts on top; filters by script and category (serif, sans, mono, handwriting, display).
- [ ] **8.8** Font size control: stepper (−/+), direct input, presets (8–96 pt) and free values.
- [ ] **8.9** Style toggles: Bold, Italic, Underline, Strikethrough. Use real weights / styles when the family has them; synthetic (fake bold / skew) only as a flagged last resort.
- [ ] **8.10** Text color picker (palette, hex, eyedropper via the `EyeDropper` API where available, plus "pick from page" by sampling our own render) and highlight color; recent colors.
- [ ] **8.11** Alignment (left / center / right / justify), line spacing (1.0, 1.15, 1.5, 2.0, custom), character spacing, paragraph spacing.
- [ ] **8.12** Superscript / subscript and text opacity.
- [ ] **8.13** **Subsetting + embedding on save:** HarfBuzz subset (keep glyph IDs), one embedded subset per font per document, full embed only if a license requires it.
- [ ] **8.14** Variable fonts: create static instances before embedding (PDF has no variable-font support).
- [ ] **8.15** Smart font matching for non-embedded originals (Arial, Calibri, Times New Roman, Helvetica, Courier…) to the best bundled equivalent; show "Original font: X → using Y".
- [ ] **8.16** "Match original font" button that re-selects the closest font.
- [ ] **8.17** Per-script automatic fallback chains (for example a Latin font + Noto Arabic when Arabic is typed into a Latin block).
- [ ] **8.18** Unit tests: fallback chains, subset contains every used glyph, bold / italic mapping, `fsType` checks.

**Done when:** the user can switch a block to any bundled font, change size / style / color, and the saved PDF shows exactly that in external viewers.

---

## PHASE 9 — MULTI-LANGUAGE SUPPORT (TYPING AND RENDERING IN ALL SCRIPTS)

- [ ] **9.1** `TextShaper` (harfbuzzjs in a worker) returning glyph IDs, advances, offsets and clusters for any script.
- [ ] **9.2** Bidi (UAX #9) for mixed LTR / RTL: correct visual order and caret movement; mirrored punctuation and alignment.
- [ ] **9.3** Arabic: joining, ligatures, diacritics, numerals (Arabic-Indic vs Western).
- [ ] **9.4** Hebrew (RTL, niqqud).
- [ ] **9.5** Indic scripts (Devanagari, Bengali, Tamil, Telugu, Kannada, Malayalam, Gujarati, Gurmukhi): conjuncts and reordering of vowel signs.
- [ ] **9.6** Thai: no-space word breaking via `Intl.Segmenter`, stacked marks.
- [ ] **9.7** CJK: horizontal and vertical layout, line-break rules (kinsoku), full-width punctuation.
- [ ] **9.8** Emoji and symbol fallback (optional; monochrome or image-based).
- [ ] **9.9** Embed shaped text with the strategy chosen in Task 0.6 (CID font + `ToUnicode`, per-cluster objects, or outlines + invisible text) so saved text stays **searchable and copyable**.
- [ ] **9.10** Multilingual test PDF set (one per script) + golden-image comparison (render the saved output with PDFium and cross-check with PDF.js in headless Chromium).

**Done when:** a user can type Arabic, Hindi, Chinese and English in the same document and the saved file displays them correctly and stays searchable.

---

## PHASE 10 — OCR (SCANNED PDFs AND IMAGES)

- [ ] **10.1** Detect "scanned" pages (a full-page image with little or no text); show a banner "This page looks scanned — Make text editable".
- [ ] **10.2** `OcrEngine` interface (languages, progress, cancel) and a **Tesseract.js v7** adapter: workers, self-hosted core and language data, on-demand language download that shows its size, Cache Storage.
- [ ] **10.3** PaddleOCR.js / ONNX Runtime Web adapter (optional; build it only if Task 0.8 showed a clear win): WebGPU / WASM auto-select, self-hosted models.
- [ ] **10.4** Preprocessing with OpenCV.js (lazy loaded): render at ~300 DPI (capped for memory), deskew, denoise, binarize when it helps.
- [ ] **10.5** Run OCR per page in background workers with progress, cancel and a per-page result cache (keyed by page hash + language) in OPFS / IndexedDB; throttle when the tab is hidden.
- [ ] **10.6** Convert OCR output into blocks: word → line → paragraph with bounding boxes; estimate font size, bold / italic and text color from the pixels; show them as editable blocks.
- [ ] **10.7** **Two output modes** (user chooses per page or document): (a) **Searchable layer**: invisible text (render mode 3) under the original image; (b) **Fully editable**: erase the original glyph pixels and place real text.
- [ ] **10.8** Erase strategy for mode (b): solid fill for flat backgrounds, OpenCV inpainting for textured ones. Apply it as a **patch image over each edited block** (keeps quality elsewhere and the file small) and offer "Flatten page" on export to remove the original pixels completely.
- [ ] **10.9** Show per-block OCR confidence; highlight low-confidence blocks; add an "accept / review next" flow.
- [ ] **10.10** Language selector for OCR + "auto-detect" (script detection, try the top candidates); support documents with mixed languages.
- [ ] **10.11** **Region OCR:** select an image or draw a rectangle → "Detect text in this area" → editable blocks (works for screenshots inside digital PDFs).
- [ ] **10.12** Batch OCR for the whole document or a page range; resumable; "OCR and download searchable PDF" quick action.
- [ ] **10.13** Hook into Edit Text mode: the "Detect text (OCR)" hint from Task 7.5 now works on outlined and raster text.
- [ ] **10.14** Handwriting is **not** supported in v1.0: show a clear notice when confidence is very low instead of pretending.
- [ ] **10.15** Accuracy report: character error rate per language on clean scans (target at least 90% correct) plus a small regression test in CI.

**Done when:** a scanned page converts into editable text with at least 90% accuracy on clean scans; searchable-layer output is searchable in external viewers; OCR never freezes the UI.

---

## PHASE 11 — WORD-LIKE CONTENT TOOLS

- [ ] **11.1** Shapes: rectangle, rounded rectangle, ellipse, line, arrow, triangle, star; fill, stroke color / width / dash, opacity; all resizable and rotatable.
- [ ] **11.2** Free-hand drawing (pen, marker, eraser) with Pointer Events (pressure / stylus), smoothing, color and size presets; stored as vector paths.
- [ ] **11.3** Whiteout / cover tool (filled rectangle), clearly labelled "cover" and not a real delete.
- [ ] **11.4** Hyperlinks: add / edit / remove on text or shapes (URL, email, phone, go-to-page); validate schemes.
- [ ] **11.5** Detect and edit existing links; show a link chip on click.
- [ ] **11.6** Bullet and numbered lists inside text boxes (indent / outdent) as visual formatting.
- [ ] **11.7** Simple tables: insert an N×M table (vector lines + text cells); edit cells; add / remove rows and columns. (Existing tables are edited as normal text blocks.)
- [ ] **11.8** Header / footer tool: text, "Page X of Y", date; all or selected pages; first-page-different option.
- [ ] **11.9** Page numbers and Bates numbering: position, format, start number.
- [ ] **11.10** Watermark: text or image, opacity, rotation, tile / center, page range.
- [ ] **11.11** Page background color.
- [ ] **11.12** Format painter (copy style from one block, apply to another).
- [ ] **11.13** Ruler / grid toggle and alignment tools (align left / center / right / top / middle / bottom, distribute evenly).
- [ ] **11.14** Special items: current date, symbol picker, QR code generator (optional).

**Done when:** a user can build a one-page flyer from a blank PDF using text, images, shapes and a table, and it looks identical in external viewers.

---

## PHASE 12 — ANNOTATIONS, SIGNATURES, FORMS

- [ ] **12.1** Text-markup annotations: highlight, underline, strikethrough, squiggly. Use real PDF annotations (with QuadPoints) so they show in Acrobat; colors; opacity.
- [ ] **12.2** Sticky notes / comments with a list panel (add, edit, delete, jump to).
- [ ] **12.3** Stamps: Approved, Draft, Confidential, custom text / image.
- [ ] **12.4** Signature: draw (Pointer Events), type (several script fonts), upload an image. Save several signatures **locally**, encrypted with WebCrypto (optional passphrase); place, resize, rotate.
- [ ] **12.5** "Initials" and "Date" quick-insert.
- [ ] **12.6** Detect AcroForm fields (text, checkbox, radio, dropdown, list, button, signature) through the engine's form-fill support; show "XFA forms are not supported" when it applies.
- [ ] **12.7** Fill forms: click to type / toggle, tab order, autofill from a saved local profile (name, email, address).
- [ ] **12.8** Flatten annotations / forms on export (option).
- [ ] **12.9** Create form fields (text field, checkbox, dropdown). Optional: move to Backlog if time is short.
- [ ] **12.10** Annotation summary export (optional).

**Done when:** a government-style form PDF can be filled, signed, flattened and saved; annotations appear correctly in Acrobat Reader and Chrome.

---

## PHASE 13 — PAGE MANAGEMENT

- [ ] **13.1** Page organizer screen: thumbnail grid, multi-select, drag-to-reorder (dnd-kit).
- [ ] **13.2** Delete pages (undoable).
- [ ] **13.3** Rotate pages in 90° steps (selected or all).
- [ ] **13.4** Insert a blank page (match size or custom) before / after.
- [ ] **13.5** Insert pages from another PDF (choose a page range).
- [ ] **13.6** Merge multiple PDFs (reorder the list, then merge). Fonts and resources must not collide.
- [ ] **13.7** Split a PDF (by ranges, every N pages, by selection, by bookmarks) into several files, delivered as a ZIP (fflate).
- [ ] **13.8** Extract selected pages into a new PDF.
- [ ] **13.9** Duplicate page.
- [ ] **13.10** Crop page margins (CropBox) with a visual cropper.
- [ ] **13.11** Resize / change page size (with a scale-content option).
- [ ] **13.12** Images → PDF (order, page size, margins) and PDF → images (PNG / JPG / WebP, DPI choice, ZIP for many pages).
- [ ] **13.13** Bookmarks / outline: view, jump, add, edit, delete.

**Done when:** all page operations are undoable, and merged / split results open correctly in external viewers.

---

## PHASE 14 — SAVE, EXPORT, SHARE, PRINT

- [ ] **14.1** Save: write to the original file through a File System Access handle after confirmation (where supported); otherwise download.
- [ ] **14.2** "Download a copy" is the default (protects the original), with a smart file name such as `name-edited.pdf`.
- [ ] **14.3** Export options dialog: image quality, flatten annotations / forms, embed fonts (subset / full), optimize for size, PDF version.
- [ ] **14.4** Share with the Web Share API (files) where supported, mostly phones and tablets. Feature-detect; otherwise download.
- [ ] **14.5** Print: render to a PDF blob in a hidden iframe and call `print()`; fall back to opening in a new tab (Safari quirks); page ranges and copies.
- [ ] **14.6** Save-progress UI for big files (worker-based, cancellable, no UI freeze).
- [ ] **14.7** **Post-save validation:** reopen the saved bytes with the engine, check the page count and render page 1. If invalid, keep the previous file and show an error.
- [ ] **14.8** "Unsaved changes" guard (`beforeunload` + in-app dialog): save / discard / cancel.
- [ ] **14.9** Local version history in OPFS (last N saves; optional toggle).
- [ ] **14.10** File-size estimate before export and a "Compress PDF" quick action.

**Done when:** save → reopen in the site and in 3 external viewers is lossless relative to the on-screen view; the original file is never corrupted, even if the tab is killed mid-save (write to a temporary file, then commit).

---

## PHASE 15 — SECURITY AND UTILITIES

- [ ] **15.1** Add password (user / owner password, permissions for print / copy / edit, AES-256). PDFium appears unable to write encryption (confirm in Task 0.12), so this needs a library that can (for example a qpdf WASM build; Apache-2.0 expected, verify). If not feasible, move it to Backlog (decision from Task 0.12).
- [ ] **15.2** Remove password (when the correct password is known) using the engine's save-without-security option.
- [ ] **15.3** **True redaction:** select an area or text, then permanently remove the underlying text, images and vector content (not just a black box) and sanitize metadata, attachments and thumbnails. Show a "cannot be undone after save" warning. Evaluate EmbedPDF's MIT-licensed redaction before building our own.
- [ ] **15.4** Metadata editor (title, author, subject, keywords) and a "Remove metadata" action (Info dictionary + XMP).
- [ ] **15.5** Compress PDF (downsample images, remove unused objects) with presets.
- [ ] **15.6** Optional local-data lock: a passphrase (WebCrypto AES-GCM) that protects stored signatures and recent-file data.
- [ ] **15.7** Privacy: no analytics on document content; if analytics are ever added they must be opt-in, cookie-less and content-free. Privacy policy page. Add a Playwright test asserting **no network request carries document data**.
- [ ] **15.8** Secure temp data: OPFS working copies are wiped on close / export; a "Clear all local data" button; recovery files auto-expire (for example after 7 days).
- [ ] **15.9** Link and action safety: allow only `http`, `https`, `mailto`, `tel`; confirm before opening external links; never run PDF JavaScript or launch actions; show embedded files as a list only.

**Done when:** a redacted PDF has no recoverable text under the redaction (verified by text extraction on the saved file).

---

## PHASE 16 — PERFORMANCE AND STABILITY

- [ ] **16.1** Web budgets: editor shell interactive in under 2 s on a mid-range laptop, landing-page LCP under 2.5 s, INP under 200 ms.
- [ ] **16.2** Bundle budgets: initial JS under 300 KB gzip; lazy-load WASM, OCR, fonts and models; code split per mode.
- [ ] **16.3** Memory: stay within budget on 500-page and 200 MB PDFs; no out-of-memory on 4 GB devices; graceful degradation (lower render scale, evict caches).
- [ ] **16.4** Render pipeline: prioritize visible pages, cancel off-screen work, reuse buffers.
- [ ] **16.5** Verify nothing heavy runs on the main thread (Long Tasks API + Playwright traces; no task over 50 ms during interaction).
- [ ] **16.6** Smoothness: about 60 fps during zoom, scroll and drag-resize (automated performance traces).
- [ ] **16.7** Throttle OCR when the tab is hidden; pause on low battery where the API exists (optional).
- [ ] **16.8** **Robustness:** malformed PDFs must not crash the tab. Terminate and restart the engine worker and restore from autosave. Run a 200-PDF automated corpus (including fuzzed files).
- [ ] **16.9** Service-worker caching strategy, hashed assets, Brotli; shrink the WASM (`wasm-opt`, disable unused PDFium features such as JavaScript / XFA).
- [ ] **16.10** Multithreaded WASM (SharedArrayBuffer) only where it helps (OCR / ONNX), with an automatic single-thread fallback when the page is not cross-origin isolated.

**Done when:** no crash across 200 sample PDFs in an automated run; the performance targets are met.

---

## PHASE 17 — TESTING AND QA

- [ ] **17.1** Unit tests: grouping algorithm, `CoordinateMapper`, commands apply / revert, font matching, shaping wrappers, bidi, line breaking.
- [ ] **17.2** Integration tests: open / render / edit / save on the 10+ sample PDFs with validators.
- [ ] **17.3** E2E (Playwright) main flows: open → edit text → change font → undo → save → reopen; image replace / delete; OCR a scan. Run on Chromium, Firefox, WebKit and mobile emulation.
- [ ] **17.4** Golden-image tests for each script and each font category.
- [ ] **17.5** Interoperability checklist (manual, with screenshots): saved files in Chrome, Firefox, Safari / Preview, Acrobat Reader and one more desktop viewer.
- [ ] **17.6** Browser / device matrix (Appendix B), including touch and stylus.
- [ ] **17.7** Accessibility tests: axe-core in CI, keyboard-only flow, screen readers (NVDA, VoiceOver), 200% zoom, contrast.
- [ ] **17.8** Security tests: CSP verified, dependency audit, XSS review of every place PDF-derived text is shown, hostile / malformed PDF corpus.
- [ ] **17.9** Public beta with at least 20 real users; tracked feedback list; opt-in, content-free diagnostics only.

**Done when:** CI runs all automated tests green; the manual interoperability checklist is fully signed off.

---

## PHASE 18 — POLISH AND ACCESSIBILITY

- [ ] **18.1** Accessibility: labels on all controls, logical focus order, live-region announcements for selection and edit changes, keyboard operation of canvas objects (Tab cycles objects, arrows nudge), WCAG 2.2 AA.
- [ ] **18.2** Subtle animations and haptics (`navigator.vibrate` where supported) for selection, snapping and undo / redo.
- [ ] **18.3** Empty, error and loading states designed for every screen.
- [ ] **18.4** Keyboard / mouse / touch / stylus polish: shortcuts (Ctrl+Z / Y / B / I / U / S / F / P / K), trackpad gestures, stylus pressure.
- [ ] **18.5** UI localization into the top ~10 languages; verify RTL mirroring.
- [ ] **18.6** In-app tips, "What's new", and a help section with short clips or GIFs for key features.
- [ ] **18.7** Brand: logo, favicon, PWA icons, social-share images, screenshots (no Adobe-like branding).
- [ ] **18.8** Final UI review against the quality bar in Section 3B.

---

## PHASE 19 — LAUNCH

- [ ] **19.1** Decide and document the monetization plan with the owner (free, donations, one-time "Pro", or non-intrusive ads on marketing pages only). Keep core editing free. Ads and cross-origin isolation conflict, so never put third-party ads inside the editor.
- [ ] **19.2** Domain, DNS, HTTPS + HSTS, CDN and hosting; separate staging and production; secrets stored safely (never committed); immutable deploys with easy rollback.
- [ ] **19.3** Verify production headers (COOP / COEP / CSP) and that WASM, workers and OPFS work on the live domain.
- [ ] **19.4** Legal: privacy policy, terms of service, cookie notice only if cookies are used (prefer none), accessibility statement.
- [ ] **19.5** Open-source licenses page (PDFium, FreeType, HarfBuzz, Tesseract / Tesseract.js, PaddleOCR / ONNX Runtime, OpenCV, jSquash codecs, React, every font with its license) generated from the license table.
- [ ] **19.6** Marketing / SEO site (`apps/marketing`, static): landing page, one page per tool ("Edit PDF online", "OCR PDF", "Merge PDF", "Split PDF", "Compress PDF", "Sign PDF"), sitemap, structured data, Open Graph images, hreflang, fast Core Web Vitals.
- [ ] **19.7** Unsupported-browser screen and a graceful message when WASM / OPFS features are missing.
- [ ] **19.8** Error monitoring (privacy-preserving, no document data) and uptime monitoring; `/.well-known/security.txt` and a vulnerability-reporting path.
- [ ] **19.9** Soft launch, then public launch; feedback channel (GitHub issues or email); staged traffic increase with error-rate monitoring.
- [ ] **19.10** Post-launch plan: bug triage, update cadence, **track PDFium security releases and update the WASM at least quarterly**, dependency updates, and a plan for the Backlog.

---

## BACKLOG (NOT IN v1.0 — DO NOT BUILD WITHOUT OWNER APPROVAL)

- [ ] PDF → Word / Excel and Word → PDF conversion
- [ ] Accounts + cloud storage integration (Drive, Dropbox, OneDrive)
- [ ] Real-time collaboration and comment sync
- [ ] AI features (summarize, translate in place, smart rewrite, chat with PDF), on-device or with explicit consent
- [ ] Digital-certificate signatures (PAdES)
- [ ] Create fillable forms with advanced scripting
- [ ] Compare two PDFs (visual and text diff)
- [ ] Accessibility tagging / auto-tagging, PDF/A and PDF/UA export
- [ ] Reflow / reading mode for small screens; text-to-speech
- [ ] Batch processing and a public API
- [ ] Handwriting recognition
- [ ] Wrappers: package the PWA as an Android app (Trusted Web Activity), iOS app or desktop app (Tauri). This brings your original Android goal back with almost no extra code.
- [ ] Optional server-side OCR / conversion (opt-in only; it breaks the "never leaves your device" promise, so label it clearly)

---

## DEFINITION OF DONE FOR THE WHOLE SITE (v1.0)

- [ ] Open any normal PDF, click text, edit it in place with correct fonts, in any supported script.
- [ ] Choose from a large, searchable font list with bold / italic / underline / size / color / alignment, like Google Docs.
- [ ] Detect, move, resize, rotate, crop, replace, **delete** and insert images.
- [ ] OCR turns scanned pages and images into searchable or editable text (at least 90% accuracy on clean scans).
- [ ] Add text boxes, shapes, drawings, signatures, stamps, links, watermarks, page numbers.
- [ ] Undo / redo everywhere; autosave; crash recovery; the original file is never damaged.
- [ ] Page organizer, merge, split, extract; password removal; true redaction.
- [ ] Saved files open correctly in Chrome, Firefox, Safari / Preview and Acrobat Reader; text remains searchable.
- [ ] Clean, consistent, fast UI in light and dark on desktop, tablet and phone; WCAG 2.2 AA; fully keyboard accessible.
- [ ] Works offline after the first load; **no document ever leaves the device** (verified by an automated network test).
- [ ] No crashes in the 200-PDF robustness run; performance budgets met.

---

## PROGRESS LOG (AGENT: ADD ONE LINE PER COMPLETED TASK)

| Date | Task ID | What was done | Commit | Notes / Problems |
|---|---|---|---|---|
| 2026-11-09 | — | Web roadmap created from the Android checklist | — | Start at Task 0.1 |
| 2026-11-09 | 0.1 | Load PDFium WASM in Web Worker with Vite + TS spike | `P0.1` | Initialized @embedpdf/pdfium 2.15.1 in worker, self-hosted WASM verified |

---

## SPIKE REPORT (FILLED IN AT TASK 0.13)

- **Engine decision:** (selected engine, rationale, verdict)
- **What worked:** (0.1 … 0.12)
- **What failed + fallback chosen:**
- **OCR decision:** (Tesseract.js vs PaddleOCR: accuracy table, speed, size)
- **Limits decided:** (max file size, memory thresholds, iOS Safari notes)
- **Dependency license table:**

| Dependency | Version / source | Expected license (verify!) | Commercial and offline friendly? | Notes |
|---|---|---|---|---|
| PDFium (via `@embedpdf/pdfium` or own build) | | BSD-3-Clause / Apache-2.0 | | |
| `@embedpdf/pdfium` wrapper | 2.x | MIT | | |
| FreeType (inside PDFium) | | FreeType License | | |
| HarfBuzz / `harfbuzzjs` | | MIT | | |
| Tesseract + Tesseract.js | v7 | Apache-2.0 | | |
| PaddleOCR / ONNX Runtime Web | | Apache-2.0 / MIT | | |
| OpenCV.js | | Apache-2.0 | | |
| jSquash codecs | | Apache-2.0 | | |
| React, Vite, Zustand, Tiptap / ProseMirror, Comlink, Dexie | | MIT / Apache-2.0 / ISC | | |
| Fonts (each family) | | OFL-1.1 / Apache-2.0 | | |

- **Owner approval (date):**

---

## APPENDIX A — SAMPLE PDF TEST SET (MINIMUM 10; THE LIST BELOW HAS 14)

| # | File type | Why it is needed |
|---|---|---|
| 1 | Text-only, single column (made in Word or Google Docs) | Baseline text editing |
| 2 | Two-column article / paper (LaTeX) | Column detection |
| 3 | Image-heavy brochure | Image detection and editing |
| 4 | Scanned document (phone scan, clean) | OCR |
| 5 | Scanned document (skewed, noisy) | OCR preprocessing |
| 6 | Password-protected | Password flow |
| 7 | Arabic or Hebrew (RTL) | Bidi and shaping |
| 8 | Chinese / Japanese / Korean | CJK fonts and vertical text |
| 9 | Form with fields (AcroForm) | Form filling |
| 10 | Huge (300+ pages or 100 MB+) | Performance and memory |
| 11 | Rotated pages and unusual crop boxes | Coordinate mapping |
| 12 | Broken / truncated file | Error handling |
| 13 | Text converted to outlines + a screenshot containing text | "Not editable" hint, region OCR |
| 14 | Only subset-embedded fonts (typical Word export) | Missing-glyph fallback |

**Sources:** make your own with Word, Google Docs, LaTeX, Chrome "Save as PDF" and a phone scanner; add public test PDFs from the PDFium and PDF.js repositories (check their licenses). Never commit private or confidential documents.

---

## APPENDIX B — BROWSER FEATURE MATRIX (ALWAYS FEATURE-DETECT)

| Feature | Where it works | Fallback |
|---|---|---|
| WebAssembly + Web Workers | All target browsers | None (required) |
| OPFS (private file storage) | All current major browsers (details vary) | IndexedDB blobs |
| File System Access API (open / save in place) | Chromium browsers (Chrome, Edge) | File picker + download |
| Web Share API with files | Mainly phones and tablets, some desktops | Download |
| Local Font Access API | Chromium only, needs permission | Bundled + downloaded fonts |
| `EyeDropper` API | Chromium only | "Pick from page" (sample our own render) |
| Cross-origin isolation (`SharedArrayBuffer`) | All, when COOP / COEP headers are set | Single-threaded WASM |
| WebGPU (faster OCR models) | Chromium; others vary | WASM backend |
| `Intl.Segmenter` | All current browsers | None needed |
| Vibration API (haptics) | Android Chrome (not iOS Safari) | No haptics |
| PWA install / file handlers | Chromium desktop (file handlers); limited on Safari / Firefox | Normal website |

> **iOS Safari:** tabs have strict memory limits. Test large PDFs and OCR there early (Task 0.9).

---

## APPENDIX C — GLOSSARY

| Term | Meaning |
|---|---|
| WebAssembly (WASM) | Compiled code (such as the C++ PDFium engine) that runs in the browser at near-native speed |
| Web Worker | A background thread in the browser; keeps the page smooth |
| PWA | A website that can be installed and works offline |
| OPFS | Origin Private File System: private browser storage for large files |
| OCR | Optical character recognition: turns pictures of text into real text |
| Content stream | The list of drawing instructions inside a PDF page |
| Page object | One item on a page: a piece of text, an image or a vector shape |
| Form XObject | A reusable group of page objects inside a PDF (text can hide in here) |
| Subset font | A font that contains only the letters used in the document |
| Shaping | Turning characters into positioned glyphs (needed for Arabic, Indic, Thai) |
| Bidi | Bidirectional text: mixing left-to-right and right-to-left |
| CID font / Identity-H | A PDF font type based on glyph numbers; used for complex scripts and CJK |
| ToUnicode map | Data that lets PDF text be searched and copied correctly |
| Redaction | Permanently removing content (not just covering it with a black box) |
| Flatten | Turning annotations and form fields into plain page content |
| Cross-origin isolation | Browser security mode (COOP / COEP) that enables multithreaded WASM |

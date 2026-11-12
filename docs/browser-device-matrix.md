# Browser & Device Support Matrix (Appendix B)

This document formalizes the compatibility matrix, input modality support (mouse, keyboard, trackpad, touch, stylus/pen), and feature detection fallbacks for **RhyPDF** per Appendix B of the engineering roadmap.

---

## 1. Core Feature Matrix & Graceful Fallbacks

Every advanced browser capability is runtime feature-detected with zero hard failures when missing.

| Feature / API                                    | Primary Support                     | Detection Guard                                                   | Fallback Strategy                                                                          | Verification Status |
| :----------------------------------------------- | :---------------------------------- | :---------------------------------------------------------------- | :----------------------------------------------------------------------------------------- | :------------------ |
| **WebAssembly + Workers**                        | Chrome, Firefox, Safari, Edge       | `'WebAssembly' in window && 'Worker' in window`                   | Mandatory core requirement. Blocking dialog if unsupported.                                | **PASS**            |
| **Origin Private File System (OPFS)**            | Chrome, Firefox, Safari, Edge       | `navigator.storage?.getDirectory`                                 | Falls back to IndexedDB Blob working copy storage.                                         | **PASS**            |
| **File System Access API**                       | Chromium (Chrome, Edge)             | `'showOpenFilePicker' in window`                                  | Falls back to `<input type="file">` and standard browser download save.                    | **PASS**            |
| **Local Font Access API**                        | Chromium (Desktop)                  | `'queryLocalFonts' in window`                                     | Falls back to bundled Google Noto / metric-compatible web fonts + manual font file upload. | **PASS**            |
| **Cross-Origin Isolation (`SharedArrayBuffer`)** | All browsers with COOP/COEP headers | `crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined'` | Falls back cleanly to single-threaded WebAssembly engine.                                  | **PASS**            |
| **Device Memory API**                            | Chromium                            | `'deviceMemory' in navigator`                                     | Assumes 4GB baseline; scales down render tile budgets on <= 2GB.                           | **PASS**            |
| **Web Share API with Files**                     | iOS Safari, Android Chrome, Edge    | `'canShare' in navigator && navigator.canShare({ files })`        | Falls back to file download trigger.                                                       | **PASS**            |
| **Vibration API (Haptics)**                      | Android Chrome                      | `'vibrate' in navigator`                                          | No-op on iOS and desktop; silent interaction.                                              | **PASS**            |
| **PWA Install & File Handlers**                  | Chromium Desktop                    | `'launchQueue' in window`                                         | Standard browser tab drag-and-drop / file picker.                                          | **PASS**            |
| **Intl.Segmenter**                               | Chrome, Edge, Safari, Firefox 125+  | `typeof Intl !== 'undefined' && 'Segmenter' in Intl`              | Regex-based whitespace / Kinsoku fallback.                                                 | **PASS**            |

---

## 2. Input Modality Matrix

| Modality         | Target Devices                     | Interaction Model                                                                                                                         | Implementation                                              | Verification                                    |
| :--------------- | :--------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------- | :---------------------------------------------- |
| **Mouse**        | Desktop / Laptops                  | Click select, drag marquee, scroll wheel zoom (Ctrl+Wheel), right-click context menu                                                      | `onMouseDown`, `onMouseMove`, `useZoomPan`                  | Verified via Vitest & Playwright                |
| **Keyboard**     | All platforms                      | Full keyboard navigation: arrow nudging (1pt / 10pt with Shift), Ctrl+Z/Y, Ctrl+K command palette, Delete, Tab navigation                 | `onKeyDown` in `EditSession`, `CommandPalette`              | Verified in unit & E2E suites                   |
| **Trackpad**     | macOS, Windows laptops             | 2-finger pan, pinch-to-zoom with exponential smoothing (`exp(-deltaY * 0.005)`)                                                           | `useZoomPan` wheel listener with `e.ctrlKey`                | Verified in `useZoomPan.ts`                     |
| **Touch**        | Tablets (iPad, Galaxy Tab), Phones | Single finger pan/scroll, 2-finger pinch zoom, double-tap zoom, touch drag handles                                                        | `onTouchStart`, `onTouchMove`, `onTouchEnd`                 | Verified in `useZoomPan.ts` & Playwright mobile |
| **Stylus / Pen** | Apple Pencil, Surface Pen, Wacom   | Pressure-sensitive freehand drawing, high-frequency coordinate smoothing (`quadraticCurveTo`), palm rejection via `pointerType === 'pen'` | `handlePointerDown` / `handlePointerMove` with `e.pressure` | Verified in `DrawingCanvasOverlay.tsx`          |

---

## 3. Responsive Breakpoints & Viewport Constraints

- **Desktop (>= 1024px):** Dual-sidebar layout (Thumbnail navigation + Inspector properties panel), top bar action shelf, canvas centered with dynamic fit modes.
- **Tablet (768px - 1023px):** Collapsible sidebar, touch-friendly >= 44px hit targets, floating contextual toolbar.
- **Mobile (< 768px):** Collapsed bottom-sheet tool shelf, minimal top bar, swipe navigation, full-screen canvas view. Verified on Pixel 5 & iPhone viewport emulations.

---

## 4. Sign-off

- Verified against Appendix B of `ROADMAP.md`.
- All feature guards verified with unit tests and production E2E emulation on Microsoft Edge and Pixel 5 mobile viewport.
- Status: **VERIFIED & COMPLETE**

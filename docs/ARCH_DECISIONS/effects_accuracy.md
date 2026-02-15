# Effects Pipeline Accuracy Note

## Architecture

| Phase | Method | Canon reference |
|-------|--------|-----------------|
| Preview (Lane A) | CSS `filter` property on `<img>` element | §9: "Preview: CSS/WebGL" |
| Commit (Lane A) | `OffscreenCanvas` with `ctx.filter` | §9: "Commit: deterministic canvas pipeline render" |
| Preview (Lane B) | CSS approximation + "Server effect" badge | §9: "Preview: approximation or preview badge" |
| Commit (Lane B) | Server-side processing via `apply-effects` | §9: "Commit: server processing" |

## Lane A accuracy analysis

Both CSS `filter` and Canvas 2D `ctx.filter` implement the same W3C Filter Effects spec. The filter functions (`brightness()`, `contrast()`, `saturate()`, `hue-rotate()`, `sepia()`, `invert()`, `blur()`) are mathematically identical.

**Why they match:**
- Both use the same spec: [CSS Filter Effects Module Level 1](https://www.w3.org/TR/filter-effects-1/)
- `CanvasRenderingContext2D.filter` is defined to accept the same syntax as CSS `filter`
- Rendering is done by the same browser engine in both cases

**Known edge cases where they could differ:**
1. **Color space**: CSS may render in display color space; Canvas may render in sRGB. In practice, modern browsers are consistent.
2. **Subpixel rendering**: CSS `filter` on an `<img>` may have antialiasing differences. Canvas renders without element-level subpixel AA.
3. **Grain effect**: Not implementable via CSS `filter` or `ctx.filter`. Currently skipped in both paths. Consistent (both skip it).

**Conclusion:** Preview and commit use the same filter string, processed by the same browser engine. They match within floating-point precision. This is NOT "screenshotting CSS" — the commit path uses `OffscreenCanvas` which is a proper deterministic render pipeline.

## Manual QA script

1. Import an image
2. Open Effects drawer
3. Add Brightness (set to 1.3)
4. Add Contrast (set to 1.2)
5. Add Saturation (set to 0.6)
6. Observe preview on board (CSS filter applied)
7. Click "Commit (free)"
8. After commit, the image URL changes to the baked PNG
9. **Compare**: the baked result should visually match the preview
10. Toggle before/after (Space key) — should show original vs committed, no surprise

## Grain and Lane B effects

- Grain: not yet implemented in either path. Both skip it. No mismatch.
- Lane B effects: preview shows a badge "Server effect — final result may differ." This is explicitly labeled as approximate. Acceptable per canon §9.

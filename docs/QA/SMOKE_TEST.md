# Smoke Test — 25 Steps

Run before any release. Stop and fix on first failure.

## Prerequisites
- Fresh browser session (clear sessionStorage)
- At least 20 credits available
- One test image (any JPEG/PNG)

---

## Import & Board Basics

1. **Import image**: Drop image on board. Confirm item appears, no errors.
2. **Select image**: Click image. Blue selection ring appears. Inspector shows details.
3. **Deselect**: Click empty board area. Selection clears.
4. **Pan and zoom**: Scroll to zoom, drag empty area to pan. Viewport responds.
5. **Undo import**: Ctrl+Z. Image disappears. Ctrl+Shift+Z. Image reappears.

## Credits & Analyze

6. **Check credits**: Open Credits drawer. Balance shown.
7. **Analyze image**: Select image → Analyze → "Analyze". Credits reserved, spinner appears, description populates on success, credits deducted.
8. **Verify reservation**: In Supabase, `credit_transactions` for this action shows status = 'completed'.

## Regenerate

9. **Regenerate (replace)**: Select analyzed image → Regenerate → edit prompt → "Regenerate". New image replaces current. Version strip shows v2.
10. **Undo regenerate**: Ctrl+Z. Image reverts to v1. Version strip highlights v1.
11. **Redo regenerate**: Ctrl+Shift+Z. Image shows v2 again.

## Version Strip

12. **Switch version**: Click v1 in version strip. Image shows original. Click v2. Shows regenerated.
13. **Version count**: Strip shows exactly the number of operations performed.

## Effects

14. **Add effects**: Select image → Effects → add Brightness (1.3) + Contrast (1.2). Preview updates on board.
15. **Commit effects (free)**: Click "Commit". New version created. Version strip shows new entry.
16. **Undo effects commit**: Ctrl+Z. Reverts to pre-effects version.

## Fun Lab

17. **Open Fun Lab**: Select image → Fun Lab. Pack browser appears.
18. **Select pack**: Click any pack. Options screen shows.
19. **Generate 3**: Click "Generate". Credits reserved. After completion, exactly 3 tiles appear near source image.
20. **Commit one tile**: Tap a tile. New version created in strip. Remaining tiles collapse into chip after 20s.
21. **Verify 3-or-refund**: If generation fails partially (simulate by killing network), verify credits are refunded, not partially committed.

## Reload Recovery

22. **Reload mid-job**: Start a regenerate, immediately reload browser. On reload, jobs reconcile. If output exists server-side → done. If reservation expired → failed. No orphaned "running" jobs.

## Responsive

23. **Mobile layout**: Resize to 375px width. Tool dock at bottom, drawers open as bottom sheet. Primary actions visible without scroll.
24. **Desktop layout**: Resize to 1400px. Inspector on right, tool rail vertical.

## Delete & Cleanup

25. **Delete item**: Select image → Delete (Backspace). Confirm dialog appears. Confirm. Item removed. Undo restores it.

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| Grain effect not implemented | Low | Skipped in both preview and commit — consistent but incomplete |
| Multi-delete creates N undo entries | Low | Requires N Ctrl+Z to fully undo. Could batch in future. |
| Fun Lab 3-option timeout (60s auto-dismiss) | Info | Tiles auto-dismiss if no action in 60s. By design. |
| Pile fan-out overlaps if items are close together | Low | Visual overlap only, items are still individually selectable |
| ToolsModalContext still imported by legacy components | Tech debt | Marked @deprecated, safe to remove when Header/BottomNav migrated |
| Lane B effects preview is approximate | By design | Badge shown: "Server effect — final result may differ" |
| Job reconciliation on reload hits Supabase for each active job | Low | Acceptable for small job counts. Could batch in future. |

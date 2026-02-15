# Mobile & Tablet UX Acceptance Gates

## Breakpoints

| Label | Range | Key layout |
|-------|-------|------------|
| Mobile | < 768px | Bottom sheet, bottom tool dock |
| Tablet | 768–1024px | Right sheet drawer |
| Desktop Narrow | 1024–1280px | Right inspector panel |
| Desktop Wide | > 1280px | Right inspector panel + references |

## Checklist

### Gate 1: Bottom sheet peek shows primary action without scrolling
- [ ] **Mobile 375px**: Open Analyze drawer. The "Analyze" button must be visible in the initial peek position without scrolling.
- [ ] **Mobile 375px**: Open Regenerate drawer. The "Regenerate" button must be visible without scrolling.
- [ ] **Mobile 375px**: Open Effects drawer. The "Commit" button must be visible without scrolling.
- [ ] **Mobile 375px**: Open Fun Lab drawer. Pack grid must be visible without scrolling.

### Gate 2: Drawer close does not change board selection
- [ ] Select an image on the board.
- [ ] Open any tool drawer.
- [ ] Close the drawer (swipe down on mobile, X button on desktop).
- [ ] Verify the same image is still selected (blue outline remains).

### Gate 3: Two-finger pan does not interfere with before/after
- [ ] Select an image on the board.
- [ ] Two-finger pan to move the viewport.
- [ ] Verify the before/after comparison (Space key / long-press) does not trigger during pan.
- [ ] After panning, verify before/after still works correctly.

### Gate 4: Tool dock tap targets are 44px minimum
- [ ] **Mobile**: Inspect tool dock buttons. Each button must be at least 44x44px touch target.
- [ ] **Mobile**: Verify spacing between buttons prevents accidental taps.
- [ ] Use Chrome DevTools element inspector to measure actual rendered sizes.

### Gate 5: No layout shift when switching tools
- [ ] Select an image.
- [ ] Switch from Analyze to Regenerate to Effects to Fun Lab in sequence.
- [ ] Verify the board does not jump/shift during any transition.
- [ ] Verify the inspector panel width does not change.

### Gate 6: Responsive transitions
- [ ] Resize browser from 1400px to 320px width continuously.
- [ ] Verify no content overflow, no horizontal scroll, no clipped text.
- [ ] Verify tool rail transitions from vertical (desktop) to horizontal bottom dock (mobile).

## Evidence required

For each gate, provide ONE of:
- Screenshot showing pass
- Screen recording (5s clip)
- "Verified on [date] by [name]" with device/browser noted

## Test devices

| Device | Resolution | Browser |
|--------|-----------|---------|
| iPhone 14 / Safari | 390x844 | Safari 17+ |
| Chrome DevTools mobile emulation | 375x667, 390x844 | Chrome 120+ |
| iPad Air | 820x1180 | Safari 17+ |
| Desktop Chrome | 1440x900 | Chrome 120+ |

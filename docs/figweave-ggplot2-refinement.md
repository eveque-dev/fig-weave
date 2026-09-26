# ggplot2 online refinement — 2026-09-26

The online R workspace now preserves the source plot's typography and legend
position on first run. Users can explicitly choose a generic font family, base
font size, an outside legend edge or an inside corner, and restore the original
style. A single dragged object can be returned to its original position without
discarding other offsets. All resets participate in undo/redo; Escape cancels
an unfinished pointer drag. Layout changes continue to clear ordinal offsets
and explain that action in the interface.

The exported R script now replays directly on the active graphics device, then
captures `figweave_result`. Switching to a temporary PDF device in exported code
previously broke webR canvas capture and changed device-specific text metrics.
The separate PDF download still records one final scene on a disposable device
before saving it, to avoid intermediate redraw pages.

Dependency preparation retains its own deadline. User code gets a separate
30-second budget; a timeout closes the worker and the next run starts fresh.

## Verification

- Frontend type/build and i18n checks; 281 test files / 4,147 unit tests passed.
- Real Chrome + locked webR / ggplot2: original 18 pt monospace and bottom legend
  match a direct, independent ggplot render pixel for pixel.
- Text, legend, point and curve movement: measured SVG geometry changes by the
  requested offset, and undo restores the original PNG bytes. Geometry is measured
  without selection stroke extents or document scrolling.
- Inside-corner placement, generic font change, individual reset, undo/redo,
  Escape cancellation, complete reset and PNG/PDF/R download all exercised.
- Downloaded R code executes in an independent runtime and reproduces the edited
  preview pixel for pixel on the same canvas device and dimensions.
- A non-terminating R script times out, disables exports and can be followed by a
  successful new run. Chinese/English mobile, tablet and desktop layouts pass.
- The preservation test was manually falsified by restoring the old forced 12 pt
  default; it failed. The replay test failed before the export-device fix.

## Remaining experimental boundaries

The workspace still takes one self-contained script with a ggplot object named
`p`; local data files, arbitrary R packages, custom grobs and raster objects are
not part of this pass. Moves are visual offsets, not data edits. Layout changes
clear them, with undo available. Generic families do not promise an exact Arial
or other installed font, and PDF font support for non-Latin text remains limited.
Different graphics devices may use different glyph metrics; the replay equality
check is specifically for the same device and dimensions. The receiving R device
controls physical output size, which the exported script records in a comment.

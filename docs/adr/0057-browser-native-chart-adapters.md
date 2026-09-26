# 0057 — Browser-native chart adapters and ggplot2 visual offsets

Accepted 2026-09-22, following the explicit FigWeave feature request.

The capability freeze in ADR 0056 is extended for the online distribution only.
Plotly and pyecharts run Python in a fresh, terminable Pyodide worker. Only locked
wheels are loaded. A JSON chart crosses the worker boundary; HTML and JavaScript
callbacks do not. The browser uses Plotly.js / ECharts, not the Matplotlib manifest
or document store. This is a different source format, not a second Matplotlib editor.
The app keeps one authoritative chart snapshot with render-before-commit history.
Python export reconstructs that snapshot; it does not rewrite the original program.

The R workspace measures the current grid display list on the actual device.
Its drag patches are normalized visual offsets, not data edits. Layout changes
invalidate offsets, and undo restores the complete prior style and offsets.
Preview and exported code share drag.R; PDF records the final scene on a disposable
device before drawing it once to the destination. This prevents intermediate redraw
pages. Custom grobs and raster objects remain outside the supported edit surface.

Desktop preview installers keep the existing native Matplotlib engine. These online
adapters do not imply offline native Plotly / ECharts / R desktop support.

Validation: real-browser Python run/edit/undo/PNG/JSON/Python replay, real webR
text/legend/point/curve movement and undo, PNG/PDF/R exports, responsive layouts.

2026-09-26 R refinement: unset typography and legend controls preserve the source
plot rather than silently applying 12 pt and a right-hand legend. Explicit generic
font families and inside-corner legend placements use the same style expression
for preview and R export. Layout changes still invalidate ordinal drag identities
and now explain that reset; individual offset resets participate in normal history.
Dependency preparation has a separate deadline from the 30-second user-code budget.
Exported R scripts draw on the active device with the same replay function as the
preview, then capture `figweave_result` from that display list. A temporary PDF
device is used only by the PDF download: opening it in an R script loses webR's
canvas capture and changes text metrics. For R file output, the exported comment
records the requested device size; the receiving device controls physical size.

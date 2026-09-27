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


2026-09-27 priority refinement supersedes the ordinal-offset and canvas-font
behaviors above. User-selected CSV/TSV/RDS and TTF/OTF assets are bounded, validated,
and mounted into a fresh worker's `/workspace`; they never enter browser persistent
storage or app upload requests. The loaded asset snapshot remains authoritative
until the next successful run. Source reruns reset edits.

Object identities now use normalized grid ancestry, occurrence within that path,
and vector index. Styling preserves matching offsets and text edits; hidden or
unmatched edits remain dormant with a notice. Text vectors are edited by index,
including legend labels, through the shared TypographyControls and vocabulary.
The R adapter retains its own render-before-commit history.

Locked sysfonts/showtext/font files produce final PDF outlines. Actual Unicode
cmap coverage (formats 4/12; first TTC face for the bundled Chinese font) drives
whole-label fallback and missing-glyph notices; plotmath coverage stays unverified.
PDF.js rasterizes this exact single-page PDF for preview/PNG. A webR canvas cannot
reliably display showtext outlines, so it is no longer the preview device. PDF
exports reuse the successful rendered bytes. Exported R uses the same font setup,
scene edits and physical PDF device, creating figure-styled.pdf with companion
files; it no longer claims canvas-capture replay or editable PDF text.

Verification includes real RDS generation/import, CSV/TSV equality, imported
open fonts and Chinese fallback, individual title/legend changes, retained offsets,
undo, and pixel-identical exported R replay on the PDF preview pipeline.

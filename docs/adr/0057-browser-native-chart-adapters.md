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

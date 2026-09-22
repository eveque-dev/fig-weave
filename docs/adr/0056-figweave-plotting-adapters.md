# FigWeave Python extensions and experimental ggplot2 adapter

User-authorised expansion on 2026-09-21 supersedes the upstream 1.0 capability freeze
for this derivative. Existing Matplotlib capture, manifests, overrides and source
write-back invariants remain unchanged.

## Python

Seaborn, pandas plotting and NetworkX produce Matplotlib artists and use the existing
editor. `packaging/playground-runtime.json` owns the allowlist. Seaborn is a reviewed
pure-Python wheel, downloaded at build time and checked against SHA-256 at build and
load. Its dependencies come from the pinned Pyodide distribution. No arbitrary pip
installation or import-based package resolution is introduced.

Cold imports of the engine and requested allowlisted libraries run in the bounded
environment-preparation phase. The separate 20-second user-script budget begins
after these imports; user code is never executed during preparation.

## R

The experimental `/r/` entry uses a separate webR worker per script, never a server
R process. A script must assign one ggplot2 object to `p`. The adapter preserves that
object and replays a closed set of style operations on a copy. It does not pretend
to expose Matplotlib artist-level selection, geometric edits or source write-back.
Preview and exported R code use the same style expression. Failed renders do not
commit style history. Cancel/timeout closes the worker and invalidates late results.
Code stays in memory; the application does not upload or persist it. User code can
make its own network requests; this is not a hostile-code network sandbox.

webR is pinned in `packaging/r-browser-runtime.json`; the compatible R ABI and full
ggplot2 dependency closure, repository metadata and SHA-256 values are pinned in
`packaging/r-packages.lock.json`. These packages are hosted beside the application.
No `latest` URL or moving package resolver is used for the installed packages.

## Desktop preview

Continue the Tauri → authenticated Python sidecar → bundled worker architecture.
FigWeave has its own application identifier. Internal sidecar/CLI names and document
formats remain compatible. Preview builds do not install the upstream updater plugin
and force telemetry off. They are unsigned development installers, not production
signed or notarised releases. Windows builds run locally; the manual GitHub workflow
builds Windows and Apple Silicon macOS with bundled runtime smoke checks.

The new R adapter currently belongs to the online edition. Native offline R packaging
and shared canvas manipulation of ggplot2 objects are separate work, not claimed here.

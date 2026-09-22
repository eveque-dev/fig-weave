# Upstream Tavotto plugin installation

This guide describes the upstream Tavotto plugin, not a FigWeave release channel. See the [FigWeave project guide](../README.md) for this derivative.

### Using Tavotto with Codex for the first time

> **Regular users: do not clone or build this repository.** Installing from source is
> only for people working on Tavotto itself.

Pick what you need first:

| What you want to do | What to install |
| --- | --- |
| Codex draws the figure; you keep dragging and tweaking it in the Tavotto desktop window | The Tavotto desktop app + the Codex plugin (no Python engine needed) |
| Use Tavotto's canvas, preflight, editing and export tools directly inside Codex | The Codex plugin + the Tavotto Python engine |
| Change Tavotto itself | See "Contributors: developing from source" below |

#### The full Codex integration

Run these in a terminal, one at a time:

```sh
codex plugin marketplace add Tavotto/Tavotto --sparse .agents/plugins
codex plugin add tavotto@tavotto
pipx install "tavotto[worker]"
```

Then **close your current Codex session and start a new one.** The plugin's skill and
MCP tools do not hot-reload into a session that is already open.

**If you installed the engine with `pip`/`pipx`**, one command does the two
`codex plugin` steps for you, and tells you what it skipped:

```sh
tavotto codex install     # idempotent: fixes only what is missing
tavotto codex doctor      # diagnose only, changes nothing
```

It never installs or upgrades the Codex CLI itself, and it never reinstalls a
component that is already healthy. `tavotto codex uninstall` removes the plugin and
the marketplace entry (it leaves the engine alone).

**On Windows, run `tavotto codex install` as well** (macOS and Linux do not need it),
and **run it again after upgrading the plugin**. The plugin pins `python3` as the
command that starts its MCP server, and on Windows that name is usually a Microsoft
Store alias that exists but never starts — the plugin then shows up enabled with no
tools at all. The command checks whether the launcher really starts and pins a
verified interpreter into the installed copy if it does not; the mechanism and the
symptoms are in [`codex-plugin/README.md`](../codex-plugin/README.md).

Desktop-app-only users: the desktop installer deliberately does not touch your `PATH`,
so a bare `tavotto` is not available — run the two `codex plugin` commands above
instead. (A settings-page button that runs the same installer is tracked in
[#170](https://github.com/Tavotto/Tavotto/issues/170).)

In the new session you can say:

> Draw this figure with Tavotto. Run the Tavotto health check first; only draw once it
> is healthy, and open the result in Tavotto at the end. Do not install or upgrade any
> component that is already working.

When Codex later edits, adds or renames a plotting script, it calls the plugin's
`tavotto_refresh_project` tool: Tavotto re-reads the project (static analysis only, no
script is run) and the open Tavotto window updates by itself — you never refresh or
restart it by hand. The tool reports which figures are now editable, which still need
a trial run you trigger in Tavotto, and which have a source conflict for you to settle.

When a figure already exists and only needs a new width, font, or font-size floor, just
say "make this figure 8 cm wide, Times New Roman, no text below 8 pt": Codex calls
`tavotto_normalize_figure`, which changes only what you named and leaves content,
colours, data and subplot structure alone. If text no longer fits after shrinking it
makes bounded margin adjustments first, then verifies the delivered file itself (PDF
page size and embedded fonts, PNG pixels and dpi). When the request cannot be met —
nothing fits, the font is not installed, the structure would have to change — it stops
and tells you which constraint to relax instead of lowering the bar or leaving behind a
file that only looks finished.

The first time a project-directory approval appears, what you are confirming is the
local figure directory Tavotto may access. Figures, scripts and data are still
processed on your machine.

The plugin installs into your local `~/.codex` configuration, so it loads only in
Codex surfaces that read local plugins — the Codex CLI in a terminal and the Codex
desktop app. A surface that does not load local plugins (a purely cloud-hosted
session, an IDE integration that ignores `~/.codex/plugins`) will never show the
Tavotto tools; verify in a terminal `codex` session first instead of debugging there.

#### Handing off to the desktop app only

Install the desktop app plus the plugin (the two `codex plugin` commands above — the
`pipx` line is not needed on this route). When you ask Codex to "open it in Tavotto",
the plugin's skill hands the figure over with its own handoff script, which locates
the CLI bundled inside the desktop app by itself:

```sh
python3 <plugin-dir>/skills/tavotto-figure/scripts/handoff.py path/to/figure.py
```

Do not tell Codex to run a bare `tavotto open` on this route: the desktop installers
deliberately leave your `PATH` untouched, so that command only exists after a PyPI
install. This path does not require the MCP canvas or the Python engine inside
Codex. Keep the script and its output in the same directory, and prefer vector PDF
for the output.

#### Let Codex do the install

Send Codex this message, in full:

> Follow the "Using Tavotto with Codex for the first time" section of the README
> exactly, as a regular-user install. Do not clone or build the source; do not run
> pnpm, npm, cargo, Tauri, tests, or an editable install. Install only the Codex
> plugin and the Tavotto engine it needs, then run the health check; when a new
> session is required, tell me so explicitly and stop.


## Contributors: developing from source

Source development is for contributors explicitly developing Tavotto. See the [upstream contribution guide](https://github.com/Tavotto/Tavotto/blob/main/CONTRIBUTING.md).

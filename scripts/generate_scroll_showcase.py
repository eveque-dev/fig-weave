#!/usr/bin/env python3
"""Render the homepage's three real figure states from the playground example.

Use the Matplotlib version pinned in packaging/playground-runtime.json.
The homepage loads these static assets, not the Python runtime, and links to /try/.
"""

from __future__ import annotations

import json
import os
import runpy
import tempfile
from pathlib import Path

import matplotlib

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    version = json.loads((ROOT / "packaging/playground-runtime.json").read_text())["packages"][
        "matplotlib"
    ]
    if matplotlib.__version__ != version:
        raise SystemExit(f"Install matplotlib=={version} before generating these assets")
    matplotlib.use("Agg")
    matplotlib.rcParams["svg.hashsalt"] = "figweave-scroll-showcase"
    output = ROOT / "web/src/site/generated"
    output.mkdir(parents=True, exist_ok=True)
    original_cwd = Path.cwd()
    try:
        # The original example saves a PDF; keep that side effect outside the repo.
        with tempfile.TemporaryDirectory() as work:
            os.chdir(work)
            example = runpy.run_path(str(ROOT / "web/src/playground/examples/kinetics.py"))
            figure, axes = example["fig"], example["ax"]
            for name, size, position in [
                ("source", 9, "lower right"),
                ("type", 12, "lower right"),
                ("legend", 12, "upper left"),
            ]:
                axes.title.set_fontsize(size)
                axes.legend(loc=position, fontsize=8)
                target = output / f"scroll-{name}.svg"
                figure.savefig(target, metadata={"Date": None})
                target.write_text(
                    "\n".join(line.rstrip() for line in target.read_text().splitlines()) + "\n"
                )
    finally:
        os.chdir(original_cwd)


if __name__ == "__main__":
    main()

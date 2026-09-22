#!/usr/bin/env python3
"""Build the standalone FigWeave site, including the real editor at /try/."""

from __future__ import annotations

import shutil
import subprocess

from build_browser_playground import DIST as PLAYGROUND_DIST, ROOT, WEB, build
from build_chart_packages import build as build_chart_packages
from build_mcp_widget import vite_build_argv
from build_r_browser_packages import build as build_r_packages


def main() -> None:
    build()
    subprocess.run(vite_build_argv("vite.site.config.ts"), cwd=WEB, check=True)
    site = WEB / "dist-site"
    (site / "site.html").replace(site / "index.html")
    shutil.copytree(PLAYGROUND_DIST, site / "try", dirs_exist_ok=True)
    subprocess.run(vite_build_argv("vite.r.config.ts"), cwd=WEB, check=True)
    (WEB / "dist-r" / "r.html").replace(WEB / "dist-r" / "index.html")
    shutil.copytree(WEB / "dist-r", site / "r", dirs_exist_ok=True)
    build_r_packages(site / "r/packages")
    subprocess.run(vite_build_argv("vite.charts.config.ts"), cwd=WEB, check=True)
    (WEB / "dist-charts" / "charts.html").replace(WEB / "dist-charts" / "index.html")
    shutil.copytree(WEB / "dist-charts", site / "charts", dirs_exist_ok=True)
    build_chart_packages(site / "charts/wheels")
    shutil.copy2(ROOT / "LICENSE", site / "LICENSE")
    print(f"FigWeave site: {site} (homepage + /try/)")


if __name__ == "__main__":
    main()

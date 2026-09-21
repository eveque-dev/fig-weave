"""Mirror the reviewed ggplot2 dependency closure; never resolve moving versions."""

from __future__ import annotations

import hashlib
import json
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def build(out: Path) -> None:
    lock = json.loads((ROOT / "packaging/r-packages.lock.json").read_text(encoding="utf-8"))
    cache = ROOT / "build/r-packages"
    cache.mkdir(parents=True, exist_ok=True)
    repo = out / "bin/emscripten/contrib" / lock["r_abi"]
    repo.mkdir(parents=True, exist_ok=True)
    for package in lock["packages"]:
        cached = cache / package["filename"]
        if not cached.is_file():
            with urllib.request.urlopen(package["url"], timeout=90) as response:
                cached.write_bytes(response.read())
        if hashlib.sha256(cached.read_bytes()).hexdigest() != package["sha256"]:
            raise ValueError(f"R package checksum mismatch: {package['name']}")
        shutil.copy2(cached, repo / package["filename"])
    (repo / "PACKAGES").write_text(
        "\n\n".join(p["dcf"] for p in lock["packages"]) + "\n", encoding="utf-8"
    )

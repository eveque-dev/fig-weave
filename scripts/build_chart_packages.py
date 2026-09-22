"""Download the reviewed pure-Python chart wheels; verify every byte before use."""

from __future__ import annotations

import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    wheels = json.loads((ROOT / "packaging/chart-wheels.json").read_text())
    for wheel in wheels.values():
        target = destination / wheel["filename"]
        if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == wheel["sha256"]:
            continue
        mirror = wheel["url"].replace(
            "https://files.pythonhosted.org/packages/", "https://mirrors.aliyun.com/pypi/packages/"
        )
        for url in (mirror, wheel["url"]):
            try:
                with urllib.request.urlopen(url, timeout=60) as response:
                    data = response.read()
                if hashlib.sha256(data).hexdigest() != wheel["sha256"]:
                    raise ValueError(f"Checksum mismatch: {wheel['filename']}")
                target.write_bytes(data)
                break
            except (OSError, ValueError):
                if url == wheel["url"]:
                    raise

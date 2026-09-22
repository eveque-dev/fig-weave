"""Download the reviewed pure-Python chart wheels; verify every byte before use."""

from __future__ import annotations

import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def browser_archive(target: Path, wheel: dict) -> None:
    if "browser_filename" not in wheel:
        return
    output = target.with_name(wheel["browser_filename"])
    if (
        output.exists()
        and hashlib.sha256(output.read_bytes()).hexdigest() == wheel["browser_sha256"]
    ):
        return
    buf = io.BytesIO()
    with (
        zipfile.ZipFile(target) as src,
        zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as dst,
    ):
        for name in sorted(src.namelist()):
            if any(name.startswith(prefix) for prefix in wheel["exclude_prefixes"]):
                continue
            item = zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0))
            item.compress_type = zipfile.ZIP_DEFLATED
            item.external_attr = 0o644 << 16
            dst.writestr(item, src.read(name), compresslevel=9)
    data = buf.getvalue()
    if hashlib.sha256(data).hexdigest() != wheel["browser_sha256"]:
        raise ValueError("Browser archive checksum mismatch")
    output.write_bytes(data)


def build(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    wheels = json.loads((ROOT / "packaging/chart-wheels.json").read_text())
    for wheel in wheels.values():
        target = destination / wheel["filename"]
        if not (
            target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == wheel["sha256"]
        ):
            mirror = wheel["url"].replace(
                "https://files.pythonhosted.org/packages/",
                "https://mirrors.aliyun.com/pypi/packages/",
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
        browser_archive(target, wheel)

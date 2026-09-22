#!/usr/bin/env python3
"""Mirror the pinned browser runtime and allowed package closure for deployment."""

import argparse
import concurrent.futures
import hashlib
import json
import urllib.request
from pathlib import Path


def mirror(lock_path: Path, destination: Path) -> None:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    base = lock["upstream_base"]
    destination.mkdir(parents=True, exist_ok=True)

    def download(name: str, expected: str | None = None) -> bytes:
        target = destination / name
        if target.exists() and expected:
            data = target.read_bytes()
            if hashlib.sha256(data).hexdigest() == expected:
                return data
        with urllib.request.urlopen(base + name, timeout=180) as response:
            data = response.read()
        if expected and hashlib.sha256(data).hexdigest() != expected:
            raise ValueError(f"Checksum mismatch: {name}")
        temporary = target.with_suffix(target.suffix + ".part")
        temporary.write_bytes(data)
        temporary.replace(target)
        print(name, len(data), flush=True)
        return data

    packages = json.loads(download("pyodide-lock.json"))["packages"]
    needed: set[str] = set()

    def include(name: str) -> None:
        if name in needed:
            return
        needed.add(name)
        for dependency in packages[name]["depends"]:
            include(dependency)

    for name, version in {**lock["packages"], **lock.get("chart_packages", {})}.items():
        if name in lock.get("wheels", {}):
            continue
        if packages[name]["version"] != version:
            raise ValueError(f"Version mismatch: {name}")
        include(name)
    files = [(packages[n]["file_name"], packages[n]["sha256"]) for n in sorted(needed)]
    files += [
        (n, None)
        for n in ("pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip")
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = [pool.submit(download, name, digest) for name, digest in files]
        for job in jobs:
            job.result()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--lock", type=Path, default=Path("packaging/playground-runtime.json"))
    arguments = parser.parse_args()
    mirror(arguments.lock, arguments.destination)

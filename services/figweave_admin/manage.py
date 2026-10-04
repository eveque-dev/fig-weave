"""Operator CLI: initialize credentials and import only aggregate page counts."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import secrets
from collections import Counter
from datetime import datetime
from pathlib import Path

from .app import password_hash
from .store import TZ, Store

ROUTES = {
    "/": "site",
    "/index.html": "site",
    "/try/": "matplotlib",
    "/try/index.html": "matplotlib",
    "/r/": "ggplot2",
    "/r/index.html": "ggplot2",
    "/charts/": "charts",
    "/charts/index.html": "charts",
}
LEGACY = re.compile(
    r'^\S+ \S+ \S+ \[([^]]+)\] "(GET|HEAD) ([^ ]+) HTTP/[^"]+" (\d{3}) \S+ "[^"]*" "([^"]*)"'
)
BOT = re.compile(
    r"bot|spider|crawler|headless|lighthouse|monitor|preview|slurp|facebookexternalhit", re.I
)


def page(line):
    """No IP/referrer/query/UA survives this function. PV is not a person count."""
    if line.startswith("{"):
        try:
            item = json.loads(line)
            stamp = datetime.fromisoformat(item["time"])
            method, path, status, browser = (
                item["method"],
                item["path"],
                item["status"],
                item["browser"] == "1",
            )
        except (ValueError, KeyError, TypeError):
            return None
    else:
        match = LEGACY.match(line)
        if not match:
            return None
        stamp, method, path, status, agent = match.groups()
        try:
            stamp = datetime.strptime(stamp, "%d/%b/%Y:%H:%M:%S %z")
        except ValueError:
            return None
        browser = "Mozilla/" in agent and not BOT.search(agent)
    engine = ROUTES.get(path.split("?", 1)[0])
    if method != "GET" or str(status) not in {"200", "304"} or not browser or not engine:
        return None
    return stamp.astimezone(TZ).date().isoformat(), engine


def import_logs(store, log_dir):
    imported = 0
    for path in sorted(Path(log_dir).glob("fig-weave.access.log*")):
        if not path.is_file():
            continue
        opener = gzip.open if path.suffix == ".gz" else open
        with opener(path, "rt", encoding="utf-8", errors="replace") as stream:
            first = stream.readline()
            if not first.endswith("\n"):
                continue
            # Rotation/gzip preserves the first complete line. File names/inodes do not.
            # This identifies a log segment, never a visitor. Reimports replace its counts.
            segment = hashlib.sha256(first.encode()).hexdigest()
            counts = Counter()
            for line in (first,):
                entry = page(line)
                if entry:
                    counts[entry] += 1
            for line in stream:
                if line.endswith("\n"):
                    entry = page(line)
                    if entry:
                        counts[entry] += 1
        with store.connect() as db:
            db.execute("DELETE FROM traffic WHERE segment=?", (segment,))
            db.executemany(
                "INSERT INTO traffic VALUES (?,?,?,?)",
                [(segment, day, engine, views) for (day, engine), views in counts.items()],
            )
        imported += 1
    with store.connect() as db:
        db.execute(
            "INSERT OR REPLACE INTO metadata VALUES ('traffic_refreshed',?)",
            (datetime.now(TZ).isoformat(timespec="seconds"),),
        )
        db.execute(
            "INSERT OR REPLACE INTO metadata VALUES ('traffic_segments',?)", (str(imported),)
        )
    return imported


def private_write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as file:
        file.write(value)


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    init = sub.add_parser("init")
    init.add_argument("--config", type=Path, required=True)
    init.add_argument("--credentials", type=Path, required=True)
    init.add_argument("--username", default="eveque")
    logs = sub.add_parser("import-logs")
    logs.add_argument("--log-dir", type=Path, default=Path("/var/log/nginx"))
    args = parser.parse_args()
    if args.command == "init":
        if args.config.exists() or args.credentials.exists():
            parser.error("Refusing to replace existing credentials")
        password = secrets.token_urlsafe(24)
        private_write(
            args.config,
            json.dumps(
                {
                    "username": args.username,
                    "password_hash": password_hash(password),
                    "secret": secrets.token_urlsafe(48),
                },
                indent=2,
            ),
        )
        private_write(args.credentials, f"Username: {args.username}\nPassword: {password}\n")
        print("Admin initialized; credentials saved privately")
    else:
        settings = json.loads(Path(os.environ["FIGWEAVE_ADMIN_CONFIG"]).read_text())
        count = import_logs(Store(settings["secret"]), args.log_dir)
        print(f"Imported {count} log segments (aggregate counts only)")


if __name__ == "__main__":
    main()

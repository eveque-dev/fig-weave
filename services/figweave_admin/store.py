"""Only closed event fields and daily counts reach persistent storage."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID

from tavotto.engine.config import data_dir

CONTRACT = json.loads(Path(__file__).with_name("contract.json").read_text())
TZ = timezone(timedelta(hours=8))


def day_now():
    return datetime.now(TZ).date().isoformat()


def valid_uuid(value):
    if not isinstance(value, str):
        return False
    try:
        parsed = UUID(value)
        return parsed.version == 4 and str(parsed) == value
    except ValueError:
        return False


def validate(value):
    keys = {"schema_version", "consent_version", "distinct_id", "event_id", "event", "engine"}
    return (
        isinstance(value, dict)
        and set(value) == keys
        and type(value["schema_version"]) is int
        and value["schema_version"] == CONTRACT["schema_version"]
        and type(value["consent_version"]) is int
        and value["consent_version"] == CONTRACT["consent_version"]
        and valid_uuid(value["distinct_id"])
        and valid_uuid(value["event_id"])
        and value["event"] in CONTRACT["events"]
        and value["engine"] in CONTRACT["engines"]
        and (value["event"] == "page_view" or value["engine"] != "site")
    )


class Store:
    def __init__(self, secret: str):
        self.secret = secret.encode()
        self.root = data_dir() / "figweave-admin"
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.path = self.root / "usage.sqlite3"
        with self.connect() as db:
            db.executescript("""
                PRAGMA journal_mode=WAL;
                CREATE TABLE IF NOT EXISTS events (
                    event_id TEXT PRIMARY KEY, browser TEXT NOT NULL, day TEXT NOT NULL,
                    event TEXT NOT NULL, engine TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS events_day ON events(day);
                CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS attempts (key TEXT, at REAL);
                CREATE INDEX IF NOT EXISTS attempts_key ON attempts(key, at);
                CREATE TABLE IF NOT EXISTS traffic (
                    segment TEXT, day TEXT, engine TEXT, views INTEGER NOT NULL,
                    PRIMARY KEY(segment, day, engine)
                );
                CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT);
            """)
        os.chmod(self.path, 0o600)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def digest(self, purpose, value):
        return hmac.new(self.secret, (purpose + ":" + value).encode(), hashlib.sha256).hexdigest()

    def capture(self, value):
        with self.connect() as db:
            db.execute(
                "INSERT OR IGNORE INTO events VALUES (?, ?, ?, ?, ?)",
                (
                    value["event_id"],
                    self.digest("browser", value["distinct_id"]),
                    day_now(),
                    value["event"],
                    value["engine"],
                ),
            )

    def summary(self, days: int):
        today = datetime.now(TZ).date()
        since = (today - timedelta(days=days - 1)).isoformat()
        with self.connect() as db:

            def totals(start):
                row = db.execute(
                    """
                    SELECT COUNT(DISTINCT browser) AS browsers,
                      COUNT(DISTINCT CASE WHEN event='render_completed' THEN browser END) AS users,
                      SUM(event='render_completed') AS renders,
                      SUM(event='export_completed') AS exports FROM events WHERE day >= ?
                """,
                    (start,),
                ).fetchone()
                result = {key: (row[key] or 0) for key in row.keys()}
                result["views"] = db.execute(
                    "SELECT COALESCE(SUM(views), 0) FROM traffic WHERE day >= ?", (start,)
                ).fetchone()[0]
                result["workspace_views"] = db.execute(
                    "SELECT COALESCE(SUM(views), 0) FROM traffic WHERE day >= ? AND engine!='site'",
                    (start,),
                ).fetchone()[0]
                return result

            usage_days = {
                row["day"]: dict(row)
                for row in db.execute(
                    """
                SELECT day, COUNT(DISTINCT CASE WHEN event='render_completed' THEN browser END)
                AS users, SUM(event='render_completed') AS renders,
                SUM(event='export_completed') AS exports FROM events WHERE day >= ? GROUP BY day
            """,
                    (since,),
                )
            }
            traffic_days = dict(
                db.execute(
                    "SELECT day, SUM(views) FROM traffic WHERE day >= ? GROUP BY day", (since,)
                ).fetchall()
            )
            series = []
            for offset in range(days):
                day = (today - timedelta(days=days - 1 - offset)).isoformat()
                series.append(
                    {
                        "day": day,
                        "views": traffic_days.get(day, 0),
                        **{
                            key: usage_days.get(day, {}).get(key, 0)
                            for key in ("users", "renders", "exports")
                        },
                    }
                )
            engines = []
            for engine in [*CONTRACT["engines"], "charts"]:
                row = db.execute(
                    """
                    SELECT COUNT(DISTINCT CASE WHEN event='render_completed' THEN browser END)
                    AS users, SUM(event='render_completed') AS renders,
                    SUM(event='export_completed') AS exports FROM events WHERE day >= ? AND engine=?
                """,
                    (since, engine),
                ).fetchone()
                views = db.execute(
                    "SELECT COALESCE(SUM(views),0) FROM traffic WHERE day>=? AND engine=?",
                    (since, engine),
                ).fetchone()[0]
                engines.append(
                    {
                        "engine": engine,
                        "views": views,
                        **{key: (row[key] or 0) for key in row.keys()},
                    }
                )
            first = db.execute("SELECT MIN(day) FROM traffic").fetchone()[0]
            usage_start = db.execute("SELECT MIN(day) FROM events").fetchone()[0]
            metadata = dict(db.execute("SELECT key,value FROM metadata").fetchall())
            return {
                "all": totals(""),
                "period": totals(since),
                "today": totals(today.isoformat()),
                "series": series,
                "engines": engines,
                "days": days,
                "timezone": "Asia/Shanghai",
                "traffic_start": first,
                "usage_start": usage_start,
                "metadata": metadata,
                "telemetry_enabled": os.environ.get("TAVOTTO_NO_TELEMETRY") != "1",
            }

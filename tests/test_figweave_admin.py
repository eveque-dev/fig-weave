"""Real WSGI boundary and SQLite counts, with no external analytics traffic."""

from __future__ import annotations

import gzip
import io
import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest

SERVICE_ROOT = Path(__file__).resolve().parents[1] / "services"
if not (SERVICE_ROOT / "figweave_admin").is_dir():
    pytest.skip("Online service is excluded from the desktop package", allow_module_level=True)
sys.path.insert(0, str(SERVICE_ROOT))

from figweave_admin.app import COOKIE, Application, password_hash  # noqa: E402
from figweave_admin.manage import import_logs, page  # noqa: E402
from figweave_admin.store import CONTRACT, day_now  # noqa: E402


@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv("TAVOTTO_DATA_DIR", str(tmp_path / "data"))
    monkeypatch.delenv("TAVOTTO_NO_TELEMETRY", raising=False)
    return Application(
        {
            "username": "owner",
            "password_hash": password_hash("test-admin-password"),
            "secret": "x" * 48,
            "origin": "https://example.test",
        }
    )


def request(app, path, value=None, **overrides):
    raw = json.dumps(value).encode() if value is not None else b""
    env = {
        "PATH_INFO": path,
        "REQUEST_METHOD": "POST" if value is not None else "GET",
        "CONTENT_TYPE": "application/json",
        "CONTENT_LENGTH": str(len(raw)),
        "wsgi.input": io.BytesIO(raw),
        "HTTP_HOST": "example.test",
        "HTTP_ORIGIN": "https://example.test",
        "REMOTE_ADDR": "test-client",
        **overrides,
    }
    response = {}

    def start(status, headers):
        response["status"] = int(status.split()[0])
        response["headers"] = dict(headers)

    response["raw"] = b"".join(app(env, start))
    response["json"] = (
        json.loads(response["raw"])
        if response["headers"]["Content-Type"].startswith("application/json") and response["raw"]
        else None
    )
    return response


def event(**overrides):
    return {
        "schema_version": CONTRACT["schema_version"],
        "consent_version": CONTRACT["consent_version"],
        "distinct_id": str(uuid4()),
        "event_id": str(uuid4()),
        "event": "render_completed",
        "engine": "matplotlib",
        **overrides,
    }


def login(app):
    response = request(
        app, "/admin/api/login", {"username": "owner", "password": "test-admin-password"}
    )
    assert response["status"] == 200
    return response["headers"]["Set-Cookie"].split(";", 1)[0]


def test_admin_data_requires_real_session_and_logout_revokes_it(app):
    # Subject: protected WSGI GET before authentication, after login, after logout.
    assert request(app, "/admin/api/summary")["status"] == 401
    assert request(app, "/admin/api/summary", HTTP_COOKIE=f"{COOKIE}=forged")["status"] == 401
    cookie = login(app)
    assert request(app, "/admin/api/summary", HTTP_COOKIE=cookie)["status"] == 200
    assert request(app, "/admin/api/logout", {}, HTTP_COOKIE=cookie)["status"] == 200
    assert request(app, "/admin/api/summary", HTTP_COOKIE=cookie)["status"] == 401


def test_cookie_expiry_and_security_headers(app, monkeypatch):
    response = request(
        app, "/admin/api/login", {"username": "owner", "password": "test-admin-password"}
    )
    cookie = response["headers"]["Set-Cookie"]
    for flag in ("HttpOnly", "Secure", "SameSite=Strict", "Path=/admin"):
        assert flag in cookie
    assert response["headers"]["Cache-Control"] == "no-store"
    assert "frame-ancestors 'none'" in response["headers"]["Content-Security-Policy"]
    with app.store.connect() as db:
        db.execute("UPDATE sessions SET expires=0")
    assert request(app, "/admin/api/summary", HTTP_COOKIE=cookie.split(";", 1)[0])["status"] == 401


@pytest.mark.parametrize(
    "override",
    [{"HTTP_HOST": "evil.test"}, {"HTTP_ORIGIN": "https://evil.test"}, {"HTTP_ORIGIN": ""}],
)
def test_login_and_public_event_reject_cross_origin(app, override):
    assert (
        request(
            app,
            "/admin/api/login",
            {"username": "owner", "password": "test-admin-password"},
            **override,
        )["status"]
        == 403
    )
    assert request(app, "/usage/event", event(), **override)["status"] == 403


def test_shared_failed_login_limit(app):
    for _ in range(5):
        assert (
            request(app, "/admin/api/login", {"username": "owner", "password": "wrong"})["status"]
            == 401
        )
    assert (
        request(app, "/admin/api/login", {"username": "owner", "password": "test-admin-password"})[
            "status"
        ]
        == 429
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"filename": "secret.pdf"},
        {"script": "private code"},
        {"event": "secret title"},
        {"engine": "private path"},
        {"event": ["render_completed"]},
        {"distinct_id": "address"},
        {"consent_version": 0},
        {"schema_version": True},
        {"engine": "site"},
        {"properties": {"title": "private"}},
    ],
)
def test_collector_rejects_content_and_invalid_contract_before_storage(app, changes):
    # Subject: actual WSGI collector + its durable DB, not a substring of source.
    assert request(app, "/usage/event", event(**changes))["status"] == 400
    assert app.store.summary(7)["all"]["browsers"] == 0


def test_hard_off_prevents_storage(app, monkeypatch):
    monkeypatch.setenv("TAVOTTO_NO_TELEMETRY", "1")
    assert request(app, "/usage/event", event())["status"] == 403
    assert app.store.summary(7)["all"]["browsers"] == 0


def test_event_dedup_browser_dedup_and_counts_are_distinct(app):
    first = event()
    assert request(app, "/usage/event", first)["status"] == 204
    assert request(app, "/usage/event", first)["status"] == 204
    assert request(app, "/usage/event", event(distinct_id=first["distinct_id"]))["status"] == 204
    assert (
        request(
            app, "/usage/event", event(distinct_id=first["distinct_id"], event="export_completed")
        )["status"]
        == 204
    )
    assert request(app, "/usage/event", event())["status"] == 204
    result = app.store.summary(7)
    assert result["all"] == {
        "browsers": 2,
        "users": 2,
        "renders": 3,
        "exports": 1,
        "views": 0,
        "workspace_views": 0,
    }
    assert len(result["series"]) == 7
    assert result["series"][-1]["day"] == day_now()
    with app.store.connect() as db:
        assert first["distinct_id"] not in "\n".join(db.iterdump())


def test_malformed_and_oversized_bodies_do_not_write(app):
    for length in ("-1", "invalid", "2049"):
        assert request(app, "/usage/event", event(), CONTENT_LENGTH=length)["status"] == 400
    assert (
        request(app, "/usage/event", event(), **{"wsgi.input": io.BytesIO(b"{")})["status"] == 400
    )
    assert app.store.summary(7)["all"]["renders"] == 0


def legacy(
    path="/try/?secret=private", agent="Mozilla/5.0", stamp="22/Sep/2026:18:00:00 +0000", status=200
):
    return f'192.0.2.1 - - [{stamp}] "GET {path} HTTP/1.1" {status} 100 "https://private.example" "{agent}"\n'


def test_log_aggregation_filters_bots_queries_errors_and_converts_day():
    assert page(legacy()) == ("2026-09-23", "matplotlib")
    for line in (
        legacy(agent="Mozilla/5.0 Googlebot"),
        legacy(agent="curl/8"),
        legacy(status=404),
        legacy(path="/runtime/private.wasm"),
        legacy(path="/admin/"),
        legacy(path="/not-a-page"),
    ):
        assert page(line) is None
    clean = json.dumps(
        {
            "time": "2026-09-23T12:00:00+08:00",
            "method": "GET",
            "path": "/",
            "status": "304",
            "browser": "1",
        }
    )
    assert page(clean) == ("2026-09-23", "site")


def test_log_rotation_gzip_reimports_and_growth_are_idempotent(app, tmp_path):
    directory = tmp_path / "logs"
    directory.mkdir()
    path = directory / "fig-weave.access.log"
    path.write_text(legacy() + legacy(path="/"))
    import_logs(app.store, directory)
    import_logs(app.store, directory)
    assert app.store.summary(30)["all"]["views"] == 2
    with path.open("a") as file:
        file.write(legacy(path="/r/"))
    import_logs(app.store, directory)
    assert app.store.summary(30)["all"]["views"] == 3
    with gzip.open(directory / "fig-weave.access.log.1.gz", "wt") as file:
        file.write(path.read_text())
    path.write_text(legacy(stamp="23/Sep/2026:19:00:00 +0000"))
    import_logs(app.store, directory)
    import_logs(app.store, directory)
    assert app.store.summary(30)["all"]["views"] == 4
    with app.store.connect() as db:
        data = "\n".join(db.iterdump()).encode()
    for private in (b"192.0.2.1", b"secret=private", b"private.example", b"Mozilla"):
        assert private not in data


def test_missing_access_records_are_not_reported_as_zero(app):
    """Subject: missing server page records in a selected day's series, not actual humans."""
    summary = app.store.summary(7)
    assert all(day["views"] is None for day in summary["series"])
    assert summary["all"]["views"] == 0  # total of collected records, not evidence of no visitors

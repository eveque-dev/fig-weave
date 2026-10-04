"""Small WSGI service behind nginx; no connection to the desktop API."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import time
from http import HTTPStatus
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from tavotto.engine.brand import PRODUCT_NAME, WEBSITE_URL

from .store import Store, validate

ASSETS = Path(__file__).with_name("static")
COOKIE = "__Secure-figweave-admin"
MAX_BODY = 2048
SESSION_TTL = 12 * 3600


def password_hash(password):
    salt = secrets.token_hex(16)
    value = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 600_000)
    return f"pbkdf2_sha256$600000${salt}${value.hex()}"


def password_matches(password, encoded):
    try:
        algorithm, rounds, salt, expected = encoded.split("$")
        if algorithm != "pbkdf2_sha256" or int(rounds) != 600_000:
            return False
        value = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds))
        return hmac.compare_digest(value.hex(), expected)
    except (ValueError, TypeError):
        return False


class Application:
    def __init__(self, settings=None):
        self.settings = settings or json.loads(
            Path(os.environ["FIGWEAVE_ADMIN_CONFIG"]).read_text()
        )
        if len(self.settings.get("secret", "")) < 32 or not self.settings.get("password_hash"):
            raise ValueError("Admin credentials must be configured")
        self.store = Store(self.settings["secret"])
        self.origin = self.settings.get("origin", WEBSITE_URL)
        self.host = urlsplit(self.origin).netloc

    def __call__(self, environ, start_response):
        try:
            status, body, content_type, extra = self.handle(environ)
        except Exception:
            # No exception message/body/header is logged or exposed: it may contain user input.
            status, body, content_type, extra = self.json(503, {"error": "service_unavailable"})
        headers = [
            ("Content-Type", content_type),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("X-Content-Type-Options", "nosniff"),
            ("Referrer-Policy", "no-referrer"),
            ("X-Frame-Options", "DENY"),
            (
                "Content-Security-Policy",
                "default-src 'self'; script-src 'self'; style-src 'self'; "
                "connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
            ),
            *extra,
        ]
        start_response(f"{status} {HTTPStatus(status).phrase}", headers)
        return [body]

    @staticmethod
    def json(status, body, extra=()):
        return status, json.dumps(body).encode(), "application/json; charset=utf-8", list(extra)

    def session(self, env):
        try:
            cookies = SimpleCookie(env.get("HTTP_COOKIE", ""))
            token = cookies[COOKIE].value if COOKIE in cookies else ""
        except Exception:
            token = ""
        digest = hashlib.sha256(token.encode()).hexdigest()
        with self.store.connect() as db:
            db.execute("DELETE FROM sessions WHERE expires <= ?", (time.time(),))
            valid = db.execute("SELECT 1 FROM sessions WHERE token=?", (digest,)).fetchone()
        return digest if valid else None

    def body(self, env):
        if env.get("CONTENT_TYPE", "").split(";")[0] != "application/json":
            raise ValueError("content_type")
        length = int(env.get("CONTENT_LENGTH") or 0)
        if not 0 < length <= MAX_BODY:
            raise ValueError("body_limit")
        raw = env["wsgi.input"].read(length)
        return json.loads(raw)

    def login(self, env, value):
        if not isinstance(value, dict) or set(value) != {"username", "password"}:
            return self.json(400, {"error": "invalid_request"})
        if any(not isinstance(value[k], str) or len(value[k]) > 256 for k in value):
            return self.json(400, {"error": "invalid_request"})
        now = time.time()
        # nginx overwrites this header; the application listens only on loopback.
        address = env.get("HTTP_X_FORWARDED_FOR") or env.get("REMOTE_ADDR", "local")
        key = self.store.digest("login-limit", address)
        with self.store.connect() as db:
            # Serialize the check + increment across workers; rejected attempts are bounded.
            db.execute("BEGIN IMMEDIATE")
            db.execute("DELETE FROM attempts WHERE at < ?", (now - 900,))
            count = db.execute("SELECT COUNT(*) FROM attempts WHERE key=?", (key,)).fetchone()[0]
            if count >= 5:
                return self.json(429, {"error": "try_later"}, [("Retry-After", "900")])
            db.execute("INSERT INTO attempts VALUES (?,?)", (key, now))
        matched = password_matches(value["password"], self.settings["password_hash"])
        if not matched or not hmac.compare_digest(
            value["username"].encode(), self.settings["username"].encode()
        ):
            return self.json(401, {"error": "invalid_credentials"})
        token = secrets.token_urlsafe(32)
        with self.store.connect() as db:
            db.execute("DELETE FROM attempts WHERE key=?", (key,))
            db.execute(
                "INSERT INTO sessions VALUES (?,?)",
                (hashlib.sha256(token.encode()).hexdigest(), now + SESSION_TTL),
            )
        return self.json(
            200,
            {"ok": True},
            [
                (
                    "Set-Cookie",
                    f"{COOKIE}={token}; Path=/admin; Max-Age={SESSION_TTL}; HttpOnly; Secure; SameSite=Strict",
                )
            ],
        )

    def handle(self, env):
        path, method = env.get("PATH_INFO", ""), env.get("REQUEST_METHOD", "GET")
        if env.get("HTTP_HOST") != self.host:
            return self.json(403, {"error": "host_rejected"})
        if method == "POST" and env.get("HTTP_ORIGIN") != self.origin:
            return self.json(403, {"error": "origin_rejected"})
        if method == "GET" and path in {
            "/admin/",
            "/admin/assets/dashboard.js",
            "/admin/assets/dashboard.css",
        }:
            name = {
                "/admin/": "index.html",
                "/admin/assets/dashboard.js": "dashboard.js",
                "/admin/assets/dashboard.css": "dashboard.css",
            }[path]
            content_type = {
                "index.html": "text/html",
                "dashboard.js": "text/javascript",
                "dashboard.css": "text/css",
            }[name]
            raw = (ASSETS / name).read_bytes().replace(b"__PRODUCT_NAME__", PRODUCT_NAME.encode())
            return 200, raw, content_type + "; charset=utf-8", []
        if method == "GET" and path == "/admin/api/summary":
            if not self.session(env):
                return self.json(401, {"error": "login_required"})
            query = parse_qs(env.get("QUERY_STRING", ""))
            try:
                days = int(query.get("days", ["30"])[0])
            except ValueError:
                days = 0
            if days not in {7, 30, 90}:
                return self.json(400, {"error": "invalid_range"})
            return self.json(200, self.store.summary(days))
        if method == "POST" and path in {"/admin/api/login", "/admin/api/logout", "/usage/event"}:
            try:
                value = self.body(env)
            except (ValueError, TypeError):
                return self.json(400, {"error": "invalid_request"})
            if path == "/admin/api/login":
                return self.login(env, value)
            if path == "/admin/api/logout":
                session = self.session(env)
                if not session:
                    return self.json(401, {"error": "login_required"})
                with self.store.connect() as db:
                    db.execute("DELETE FROM sessions WHERE token=?", (session,))
                return self.json(
                    200,
                    {"ok": True},
                    [
                        (
                            "Set-Cookie",
                            f"{COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict",
                        )
                    ],
                )
            if os.environ.get("TAVOTTO_NO_TELEMETRY") == "1":
                return self.json(403, {"error": "telemetry_disabled"})
            if not validate(value):
                return self.json(400, {"error": "invalid_event"})
            self.store.capture(value)
            return 204, b"", "application/json", []
        return self.json(404, {"error": "not_found"})


_app = None


def application(environ, start_response):
    global _app
    if _app is None:
        _app = Application()
    return _app(environ, start_response)

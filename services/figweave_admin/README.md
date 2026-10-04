# FigWeave usage dashboard

Independent, standard-library WSGI application, served by Gunicorn behind nginx.
It does not expose, modify, or depend on the desktop Flask server. No third-party
analytics provider or analytics SDK is used. AGPL-3.0-only, same as this repository.

## What the owner can see

`https://fig-weave.com/admin/` has a separate password login, a 12-hour server-side
session, cumulative and daily counts, 7/30/90-day trends, entry/engine breakdowns,
and a CSV download. Data APIs require authentication. Cookies are Secure,
HttpOnly and SameSite=Strict; state changes require the configured same origin.
Passwords use salted PBKDF2-HMAC-SHA256 (600,000 rounds); sessions are random
256-bit tokens stored only as SHA-256 digests. Failed login limits are shared
across workers; nginx adds edge limits. Data/credentials are outside the checkout,
under `engine.config.data_dir()/figweave-admin`, with restricted permissions.

**Successful render browsers** means distinct opted-in random browser identifiers
that sent a `render_completed` event. It is not a count of natural persons. Repeated
runs count once per browser but add to render counts. Different engines can share
a browser, so their distinct counts cannot be summed. All timestamps use Beijing
time. The daily table is authoritative for the chart and CSV.

**Page requests** come from nginx logs: GET, status 200/304, exact homepage or
workspace routes, browser-like User-Agent, excluding known bots. Refreshes count
again; bot filtering is imperfect. Logs cannot prove a chart ran, identify real
people, or distinguish Plotly from pyecharts at the shared Charts entry.

## Privacy contract

`contract.json` is the single authority imported by both the online client and
collector. Online consent version 1 is separate from desktop consent; neither
inherits the other's preferences. Unset creates no identifier and sends no event.
Only opt-in stores a local UUIDv4. Refusal/withdrawal stops sending, re-enabling
keeps that identifier, and changed consent versions return to unset. No retry
queue or saved behavior history exists on the client. Only consent/preferences
and the random identifier are in localStorage, never scripts or chart contents.

The endpoint accepts exactly six scalar fields: schema version, consent version,
UUIDv4 browser identifier, UUIDv4 event identifier, closed event name, closed engine.
Unknown keys and arbitrary content are rejected. The server HMACs browser IDs;
does not store IP, User-Agent, queries, referrers, chart text, scripts or filenames;
counts only explicit successful render/export boundaries. Duplicate event IDs are
idempotent. Export means file generated and download initiated, not proof that the
user saved it. Opt-outs, blocked networks/storage and closed pages can undercount.
Public events can be forged; this is product observation, not identity verification.

`TAVOTTO_NO_TELEMETRY=1` disables collection on the server. Building the online
entries with that variable disables the client and hides its preference control.
CI sets it to 1. Anonymous events are retained on this owner's server, with no
third-party forwarding; disabling future collection does not erase previous counts.

The importer only persists daily aggregate page counts, never visitor identifiers.
Legacy nginx logs stay subject to existing rotation. New log format omits IPs,
query strings, referrers and raw User-Agents. Admin and collector requests are not
access-logged. Login limiting temporarily HMACs remote addresses with a separate
purpose (15 minutes); these keys are not used to count visitors. Metadata shows
when log imports last completed. Log rotation/gzip reimports replace the same
segment, so historical counts neither vanish after rotation nor double count.

## Deploy / operate

1. Place an exact Git checkout at `/opt/figweave-admin/releases/<commit>`; point
   `current` at it. Install `requirements.txt` in `/opt/figweave-admin/venv`.
2. Create an unprivileged `figweave` account and `/var/lib/figweave`, mode 0700.
3. Set `PYTHONPATH=<checkout>/src` and `TAVOTTO_DATA_DIR=/var/lib/figweave`.
   Run `python -m services.figweave_admin.manage init --config
   /var/lib/figweave/figweave-admin/config.json --credentials <private-path>`.
   Existing files will not be overwritten. Store the credentials privately.
4. Install the three systemd files in `deploy/`. The app uses only loopback 8791.
   Only the log importer has `SupplementaryGroups=adm` to read existing nginx logs.
5. Include `nginx-http.conf` in the http block, `nginx-locations.conf` in the HTTPS
   site, and copy `nginx-proxy.conf` to the named snippets path. Change the site's
   `access_log` to use the `figweave_counts` format. Canonicalize `www` to the main
   HTTPS hostname so Host and Origin match. Validate `nginx -t` before reload.
6. Start the backend and import/verify counts **before** deploying the client.
   Enable `figweave-admin.service` and `figweave-traffic.timer`.
   Rebuild the standalone site and publish the corresponding source archive.
7. Check unauthenticated summary is 401, login/cookie/logout work, and importer
   timer succeeds. Roll back app/site symlinks to their preceding releases if needed.
   Data remains outside releases; keep private backups of database + configuration.

Tests: `python -m pytest tests/test_figweave_admin.py` and
`pnpm --dir web test src/online/usage.test.ts`. Security tests exercise the actual
WSGI entry and SQLite storage, not source-text matching.

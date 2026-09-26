// Portable renderer for hosts whose OS cannot run Remotion's bundled encoder.
// Remotion Player is frame-addressed; Playwright captures it; FFmpeg only muxes.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  createReadStream,
} from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
const root = process.cwd();
const out = path.join(root, "out");
const preview = path.join(out, "browser-preview");
mkdirSync(preview, { recursive: true });
await build({
  entryPoints: ["src/preview.tsx"],
  bundle: true,
  format: "iife",
  outdir: preview,
  loader: { ".woff2": "file", ".woff": "file" },
  assetNames: "fonts/[name]-[hash]",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
const html =
  '<html><head><meta charset="utf-8"><link rel="stylesheet" href="/preview.css"></head><body style="margin:0;overflow:hidden;background:#090a0b"><div id="root"></div><script src="/preview.js"></script></body></html>';
const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  }
  const rel = decodeURIComponent(url.pathname).replace(/^\//, "");
  const base =
    rel.startsWith("v2/") || rel.startsWith("screens/") || rel === "sfx.wav"
      ? path.join(root, "public")
      : preview;
  const file = path.resolve(base, rel);
  if (!file.startsWith(base + path.sep) || !existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    {
      ".js": "text/javascript",
      ".css": "text/css",
      ".woff2": "font/woff2",
      ".png": "image/png",
      ".wav": "audio/wav",
    }[path.extname(file)] || "application/octet-stream",
  );
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || "chrome",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const seek = async (frame) => {
  await page.evaluate((f) => window.figweavePlayer.seekTo(f), frame);
  await page.waitForFunction(
    (f) =>
      document
        .querySelector("[data-video-frame]")
        ?.getAttribute("data-video-frame") === String(f),
    frame,
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
  });
};
let encoder;
try {
  await page.goto(url);
  await page.waitForFunction(() => window.figweavePlayer);
  await page.evaluate(async () => {
    await Promise.all([...document.fonts].map((f) => f.load()));
  });
  const reviews = [45, 150, 270, 360, 480, 570, 675, 820, 915];
  for (const frame of reviews) {
    await seek(frame);
    await page.screenshot({ path: path.join(out, `frame-${frame}.png`) });
  }
  console.log("Review frames saved.");
  if (process.argv.includes("--review")) process.exitCode = 0;
  else {
    const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
    encoder = spawn(
      ffmpeg,
      [
        "-y",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-framerate",
        "30",
        "-i",
        "pipe:0",
        "-i",
        path.join(root, "public/sfx.wav"),
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-t",
        "32",
        "-movflags",
        "+faststart",
        path.join(out, "FigWeave-promo-1080p.mp4"),
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errorLog = "";
    encoder.stderr.on("data", (chunk) => {
      errorLog = (errorLog + chunk.toString()).slice(-6000);
    });
    encoder.on("error", (e) => {
      errors.push(e.message);
    });
    const ended = once(encoder, "close");
    for (let frame = 0; frame < 960; frame++) {
      await seek(frame);
      const png = await page.screenshot({ type: "jpeg", quality: 94 });
      if (!encoder.stdin.write(png)) await once(encoder.stdin, "drain");
      if (frame % 120 === 0) console.log(`Rendered ${frame}/960 frames`);
    }
    encoder.stdin.end();
    const [exit] = await ended;
    if (exit !== 0) throw Error(errorLog);
    console.log("Rendered 32 s / 1080p / 30 fps / H.264 + original SFX");
  }
  if (errors.length) throw Error(errors.join("\n"));
  writeFileSync(
    path.join(out, "browser-verification.json"),
    JSON.stringify(
      {
        frames: 960,
        fps: 30,
        width: 1920,
        height: 1080,
        reviewFrames: reviews,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  if (encoder && encoder.exitCode === null) encoder.kill();
  await browser.close();
  await new Promise((r) => server.close(r));
}

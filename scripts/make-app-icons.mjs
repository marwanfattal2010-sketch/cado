/**
 * Renders the CADO app icon: Persimmon face, cream CADO wordmark, nothing else.
 *
 * WHY A BROWSER
 *
 * The wordmark has to be set in Jost 600 — the same face the real logo uses —
 * and Node has no font renderer. A browser does. So this drives headless
 * Chrome, draws the wordmark on a canvas, and writes the PNG straight to
 * disk. Nothing is passed through a chat window, which is how this was first
 * attempted and it was both slow and easy to corrupt.
 *
 * It loads the live site rather than a blank page because the site already
 * self-hosts Jost 600 and declares it. Never swap that for a Google Fonts
 * link — production CSP blocks fonts.googleapis.com and the wordmark would
 * silently fall back to a lookalike.
 *
 * Usage:  node scripts/make-app-icons.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "apps", "mobile", "assets");

const PERSIMMON = "#F94E33";
const CREAM = "#F6F1E7";
const SITE = "https://cado-web.vercel.app";

const BROWSERS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const PORT = 9333;

/**
 * The drawing itself, run inside the page.
 *
 * `targetWidth` is how wide "CADO" should be on a 1024 canvas. The Android
 * adaptive icon is masked to a circle and only the middle ~66% is guaranteed
 * visible, so the foreground is drawn narrower than the square icon.
 *
 * Centring uses the real bounding box rather than the baseline — with
 * textBaseline alone the wordmark sits visibly low in the square.
 */
const DRAW = `(async (bg, targetWidth) => {
  await document.fonts.ready;
  // Loading it into the document is not enough - the canvas needs the face
  // resolved before it will use it, and quoting the family matters. Without
  // both, canvas silently falls back to a serif and the wordmark comes out
  // in the wrong typeface entirely.
  await document.fonts.load('600 300px \\"Jost\\"');
  if (!document.fonts.check('600 300px \\"Jost\\"')) throw new Error('Jost 600 did not load');
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const x = c.getContext('2d');
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, S, S); }
  x.letterSpacing = '14px';
  let size = 300;
  x.font = '600 ' + size + 'px "Jost", sans-serif';
  size = Math.floor(size * targetWidth / x.measureText('CADO').width);
  x.font = '600 ' + size + 'px "Jost", sans-serif';
  x.fillStyle = '${CREAM}';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  const m = x.measureText('CADO');
  const yOff = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  x.fillText('CADO', S / 2 + 7, S / 2 + yOff);
  return c.toDataURL('image/png').split(',')[1];
})`;

function launch(exe) {
  return spawn(exe, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--user-data-dir=" + join(process.env.TEMP || ".", "cado-icon-profile"),
    SITE,
  ], { stdio: "ignore", detached: false });
}

async function waitForDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const tabs = await res.json();
      const page = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chrome DevTools never became reachable");
}

/** Minimal CDP client — one command at a time is all this needs. */
async function evaluate(wsUrl, expression) {
  const { WebSocket } = await import("node:worker_threads").then(() => ({ WebSocket: globalThis.WebSocket }));
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = () => rej(new Error("could not open the devtools socket"));
  });
  const result = await new Promise((res, rej) => {
    const id = 1;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      if (msg.result?.exceptionDetails) {
        rej(new Error(msg.result.exceptionDetails.exception?.description ?? "page threw"));
      } else {
        res(msg.result?.result?.value);
      }
    };
    ws.send(JSON.stringify({
      id,
      method: "Runtime.evaluate",
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
    setTimeout(() => rej(new Error("timed out waiting for the page")), 60000);
  });
  ws.close();
  return result;
}

const exe = BROWSERS.find((p) => {
  return existsSync(p);
});
if (!exe) {
  console.error("No Chrome or Edge found. Nothing was written.");
  process.exit(1);
}

console.log(`Using ${exe.split("\\").pop()}`);
const child = launch(exe);

try {
  const page = await waitForDevtools();
  // Give the page a moment to actually fetch and apply the webfont.
  await new Promise((r) => setTimeout(r, 3000));

  mkdirSync(OUT_DIR, { recursive: true });

  const jobs = [
    { file: "icon.png", bg: PERSIMMON, width: 560, label: "app icon (Persimmon face)" },
    { file: "android-icon-foreground.png", bg: null, width: 560, label: "Android foreground (transparent)" },
    { file: "splash-icon.png", bg: PERSIMMON, width: 560, label: "splash" },
  ];

  for (const job of jobs) {
    process.stdout.write(`  ${job.label}... `);
    const b64 = await evaluate(page.webSocketDebuggerUrl, `${DRAW}(${job.bg ? `'${job.bg}'` : "null"}, ${job.width})`);
    if (!b64 || b64.length < 1000) throw new Error("the page returned no image");
    const buf = Buffer.from(b64, "base64");
    writeFileSync(join(OUT_DIR, job.file), buf);
    console.log(`ok (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  console.log(`\nWritten to ${OUT_DIR}`);
} finally {
  child.kill();
}

/**
 * Screenshots every catalog component's docs demo into the catalog's tiles:
 * public/catalog/<group>/<slug>-<theme>.webp, once per site theme.
 *
 * Needs a running dev server (the capture page, /catalog-capture/<group>/<slug>,
 * only renders in development), agent-browser, and python3 with Pillow for
 * the WebP encode. Rerun it after changing a demo.
 *
 *   CATALOG_URL=http://localhost:3000 pnpm catalog:capture [group/slug ...]
 *
 * With no arguments it captures every component; pass `group/slug` pairs
 * (`backgrounds/aurora`) to redo only those.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { z } from "zod";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "catalog");
const BASE_URL = (process.env.CATALOG_URL ?? "http://localhost:3000").replace(
  /\/$/,
  ""
);
const SESSION = process.env.CATALOG_SESSION ?? "dithercn-catalog-capture";
const THEMES = ["dark", "light"] as const;

/*
 * The demo lays out at 495x372 CSS pixels, a little under the docs stage, so
 * charts keep their axes. A 4/3 pixel ratio makes the image 660x496: two
 * device pixels per CSS pixel on a 330px tile.
 */
const VIEWPORT = { height: 372, scale: 4 / 3, width: 495 } as const;

// Long enough for intro animations (count-ups, dissolves) to settle.
const SETTLE_MS = 3500;

// Demos that play once and end on plain text, caught mid-effect instead.
const SETTLE_OVERRIDES_MS: Readonly<Record<string, number>> = {
  "text/dissolve-text": 700,
};

// One flat colour means a blank stage or a fallback; a two-tone dither is fine.
const MIN_COLOURS = 2;

const FALLBACK_COUNT = `document.querySelectorAll('[data-catalog-capture] [class~="group/dither"][data-state="fallback"]').length`;

interface Target {
  group: string;
  slug: string;
}

const parseTarget = (arg: string): Target => {
  const [group, slug, ...rest] = arg.split("/");
  if (!(group && slug) || rest.length > 0) {
    throw new Error(`Expected group/slug, got "${arg}"`);
  }
  return { group, slug };
};

// The dev server lists the catalog in order (app/catalog-capture/route.ts).
const readTargets = async (): Promise<Target[]> => {
  const response = await fetch(`${BASE_URL}/catalog-capture`);
  if (!response.ok) {
    throw new Error(`${BASE_URL}/catalog-capture answered ${response.status}`);
  }
  const urls = z.array(z.string()).parse(await response.json());
  return urls.map((url) => parseTarget(url.replace(/^\/docs\//u, "")));
};

const browser = (...args: string[]) =>
  execFileSync("agent-browser", ["--session", SESSION, ...args], {
    encoding: "utf-8",
  });

// Runs even when a capture failed, so it must not throw over that error.
const closeBrowser = () => {
  try {
    browser("close");
  } catch (error) {
    console.warn(`Could not close agent-browser session ${SESSION}:`, error);
  }
};

// Keeps lossless when the dither's few flat colours make it smaller, and
// prints the colour count so blank captures can be caught.
const ENCODE = `
import io, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
image = Image.open(src).convert("RGB")
best = None
for options in ({"lossless": True}, {"quality": 90}):
    buffer = io.BytesIO()
    image.save(buffer, "WEBP", method=6, **options)
    if best is None or len(buffer.getvalue()) < len(best):
        best = buffer.getvalue()
open(out, "wb").write(best)
print(len(image.getcolors(1 << 24)))
`;

const encode = (png: string, webp: string) =>
  Number(execFileSync("python3", ["-I", "-c", ENCODE, png, webp]).toString());

const capture = async (target: Target, theme: string, scratch: string) => {
  const url = `${BASE_URL}/catalog-capture/${target.group}/${target.slug}`;
  browser("console", "--clear");
  browser("open", url);
  browser("wait", "[data-catalog-capture]");
  await sleep(
    SETTLE_OVERRIDES_MS[`${target.group}/${target.slug}`] ?? SETTLE_MS
  );

  // A shader without a frame shows its flat fallback instead of the dither.
  const fallbacks = Number(browser("eval", FALLBACK_COUNT).trim());
  if (fallbacks > 0) {
    throw new Error(`${url} (${theme}) shows ${fallbacks} shader fallback(s)`);
  }
  if (browser("console").includes("shader failed to compile")) {
    throw new Error(`${url} (${theme}): a shader failed to compile`);
  }

  const png = path.join(scratch, `${target.group}-${target.slug}-${theme}.png`);
  browser("screenshot", png);
  const dir = path.join(OUT_DIR, target.group);
  mkdirSync(dir, { recursive: true });
  const colours = encode(png, path.join(dir, `${target.slug}-${theme}.webp`));
  if (colours < MIN_COLOURS) {
    throw new Error(`${url} (${theme}) looks blank: ${colours} colours`);
  }
  console.log(`${target.group}/${target.slug} ${theme}: ${colours} colours`);
};

const main = async () => {
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args.map(parseTarget) : await readTargets();
  const scratch = mkdtempSync(path.join(tmpdir(), "catalog-capture-"));

  try {
    browser(
      "set",
      "viewport",
      String(VIEWPORT.width),
      String(VIEWPORT.height),
      String(VIEWPORT.scale)
    );
    for (const theme of THEMES) {
      // next-themes reads the stored choice before the first paint.
      browser("open", `${BASE_URL}/robots.txt`);
      browser("eval", `localStorage.setItem("theme", "${theme}")`);
      for (const target of targets) {
        // One at a time: each page holds the only WebGL context.
        // oxlint-disable-next-line no-await-in-loop
        await capture(target, theme, scratch);
      }
    }
  } finally {
    closeBrowser();
  }
  console.log(
    `Captured ${targets.length} components in ${THEMES.length} themes.`
  );
};

await main();

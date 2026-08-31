#!/usr/bin/env bun
// Full-bleed A4 poster render: geen marges, geen header/footer.
// Hergebruikt de Puppeteer-install van de pdf-generator skill.
import { resolve, join } from "path";

const SKILL_DIR = "/Users/dylan/.claude/skills/pdf-generator";
const puppeteer = require(join(SKILL_DIR, "node_modules", "puppeteer", "lib", "cjs", "puppeteer", "puppeteer.js"));

// Gebruik: render.ts <input.html> <uit.pdf|-> [uit.png] [--viewport WxH] [--scale N]
// '-' als pdf-doel slaat de PDF over (voor og-images en previews).
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const vlag = (naam: string) => {
  const i = process.argv.indexOf(naam);
  return i === -1 ? null : process.argv[i + 1];
};
const input = resolve(args[0]);
const pdfOut = args[1] && args[1] !== "-" ? resolve(args[1]) : null;
const pngOut = args[2] ? resolve(args[2]) : null;
const [vw, vh] = (vlag("--viewport") ?? "794x1123").split("x").map(Number);
const schaal = Number(vlag("--scale") ?? 2);

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: vw, height: vh, deviceScaleFactor: schaal });
  await page.goto(`file://${input}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  if (pngOut) {
    await page.screenshot({ path: pngOut, fullPage: true });
    console.log(`PNG: ${pngOut}`);
  }

  if (pdfOut) {
    await page.emulateMediaType("print");
    await page.pdf({
      path: pdfOut,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    console.log(`PDF: ${pdfOut}`);
  }
} finally {
  await browser.close();
}

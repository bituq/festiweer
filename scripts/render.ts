#!/usr/bin/env bun
// Full-bleed A4 poster render: geen marges, geen header/footer.
// Hergebruikt de Puppeteer-install van de pdf-generator skill.
import { resolve, join } from "path";

const SKILL_DIR = "/Users/dylan/.claude/skills/pdf-generator";
const puppeteer = require(join(SKILL_DIR, "node_modules", "puppeteer", "lib", "cjs", "puppeteer", "puppeteer.js"));

const input = resolve(process.argv[2]);
const pdfOut = resolve(process.argv[3]);
const pngOut = process.argv[4] ? resolve(process.argv[4]) : null;

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto(`file://${input}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);

  if (pngOut) await page.screenshot({ path: pngOut, fullPage: true });

  await page.emulateMediaType("print");
  await page.pdf({
    path: pdfOut,
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  console.log(`PDF: ${pdfOut}`);
} finally {
  await browser.close();
}

/*
 * Renders every mockup HTML file in this folder to a PNG in the parent
 * folder (requirements/mockups/).
 *
 * The HTML sources are the editable form of the mockups. The PNGs are
 * what reviewers look at on GitHub. Re-run this after editing any
 * source so the two stay in sync. See ../README.md for usage.
 *
 * Uses Playwright's Chromium. Each page is captured full-height at the
 * fixed 1440px desktop width set by wireframe.css.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const sourceDirectory = __dirname;
const outputDirectory = path.resolve(__dirname, "..");

/*
 * Screenshots one HTML file to <outputDirectory>/<same name>.png.
 * Called once per source file by main(), sharing a single browser page.
 */
async function renderMockup(page, htmlFileName) {
  const sourceUrl = "file://" + path.join(sourceDirectory, htmlFileName);
  const pngPath = path.join(outputDirectory, htmlFileName.replace(/\.html$/, ".png"));

  await page.goto(sourceUrl, { waitUntil: "load" });
  await page.screenshot({ path: pngPath, fullPage: true });

  console.log(`rendered ${path.relative(process.cwd(), pngPath)}`);
}

/*
 * Entry point: renders all *.html files in this folder, or only the
 * names passed on the command line (e.g. `node render.cjs 05-results.html`).
 */
async function main() {
  const requestedFiles = process.argv.slice(2);
  const htmlFiles = requestedFiles.length > 0
    ? requestedFiles
    : fs.readdirSync(sourceDirectory).filter((name) => name.endsWith(".html")).sort();

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const htmlFileName of htmlFiles) {
    await renderMockup(page, htmlFileName);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

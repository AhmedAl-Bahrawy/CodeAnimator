import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

await page.goto('http://localhost:4174/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1200);

const report = {};
report.editorCount = await page.locator('.cm-editor').count();
report.canvasCount = await page.locator('canvas').count();
report.editorTextBefore = await page.locator('.cm-content').first().innerText();
report.canvasSizeBefore = await page.locator('canvas').first().evaluate((canvas) => `${canvas.width}x${canvas.height}`);

// Confirm the editor accepts input and that the displayed document is not a markup-bearing value.
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('const parity = true;\nconsole.log(parity);');
await page.waitForTimeout(600);
report.editorTextAfter = await editor.innerText();
report.editorHasMarkupTokens = /\[\[/.test(report.editorTextAfter);

// Switch Style/Skins tabs and record visible controls.
await page.getByRole('tab', { name: 'Style' }).click();
await page.waitForTimeout(250);
report.styleControls = await page.locator('button, input, [role="combobox"]').count();
await page.getByRole('tab', { name: 'Skins' }).click();
await page.waitForTimeout(250);
report.skinControls = await page.locator('button').count();

// Try each format through the current Export panel and capture outcome/error text.
await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(300);
report.exportPanelText = await page.locator('body').innerText();
const formats = ['MP4', 'WebM', 'GIF'];
report.exports = {};
for (const format of formats) {
  const button = page.getByRole('button', { name: new RegExp(`Export ${format}`, 'i') });
  report.exports[format] = { buttonCount: await button.count() };
  if (await button.count()) {
    try {
      const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
      await button.click();
      const download = await downloadPromise;
      report.exports[format].download = await download.suggestedFilename();
    } catch (error) {
      report.exports[format].error = error instanceof Error ? error.message : String(error);
    }
  }
  report.exports[format].status = await page.locator('body').innerText();
}

report.errors = errors;
console.log(JSON.stringify(report, null, 2));
await browser.close();
process.exit(0);

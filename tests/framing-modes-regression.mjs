import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

await page.goto('http://localhost:4180/', { waitUntil: 'domcontentloaded' });
await page.locator('.cm-content').first().waitFor({ state: 'visible', timeout: 30000 });
await page.getByRole('tab', { name: 'Design' }).click();
await page.waitForTimeout(250);

const recordingMode = page.locator('label').filter({ hasText: 'Recording mode' }).locator('xpath=../..').getByRole('combobox');
const canvas = page.locator('canvas').first();
const dimensions = async () => canvas.evaluate((node) => ({ width: node.width, height: node.height }));

await recordingMode.click();
await page.getByRole('option', { name: 'Fit to Code' }).click();
await page.waitForTimeout(250);
const fit = await dimensions();

await recordingMode.click();
await page.getByRole('option', { name: 'Fill Canvas' }).click();
await page.waitForTimeout(250);
const fill = await dimensions();

await recordingMode.click();
await page.getByRole('option', { name: 'Code Lines Mode' }).click();
await page.waitForTimeout(250);
const codeLines = await dimensions();
const transparentPixels = await canvas.evaluate((node) => {
  const context = node.getContext('2d');
  if (!context) return 0;
  const pixels = context.getImageData(0, 0, node.width, node.height).data;
  let transparent = 0;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] === 0) transparent += 1;
  return transparent;
});
const zoomSlider = page.locator('[role="slider"][aria-valuemin="0.5"][aria-valuemax="4"]');
await zoomSlider.focus();
for (let index = 0; index < 60; index += 1) await page.keyboard.press('ArrowRight');
await page.waitForTimeout(250);
const codeLinesZoomed = await dimensions();

const body = (await page.locator('body').innerText()).toLowerCase();
const result = { fit, fill, codeLines, codeLinesZoomed, transparentPixels, errors };
console.log(JSON.stringify(result, null, 2));

if (errors.length) process.exit(1);
if (fit.width !== 1080 || fit.height !== 1920) process.exit(1);
if (fill.width !== 1080 || fill.height !== 1920) process.exit(1);
if (codeLines.width >= fit.width || codeLines.height >= fit.height) process.exit(1);
if (codeLinesZoomed.width <= codeLines.width || codeLinesZoomed.height <= codeLines.height) process.exit(1);
if (transparentPixels <= 0) process.exit(1);
if (!body.includes('code lines mode') || !body.includes('transparent surface')) process.exit(1);

await browser.close();

import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('download', async (download) => console.log('download', await download.suggestedFilename(), await download.path()));
page.on('console', (message) => errors.push(`console:${message.type()}:${message.text()}`));
page.on('pageerror', (error) => errors.push(`page:${error.message}`));
await page.goto('http://localhost:4180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
console.log('capabilities', await page.evaluate(() => ({ videoEncoder: 'VideoEncoder' in window, mediaRecorder: 'MediaRecorder' in window, captureStream: typeof HTMLCanvasElement.prototype.captureStream === 'function', offscreen: 'OffscreenCanvas' in window })));
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('const parity = true;\nconsole.log(parity);');
await page.waitForTimeout(500);
await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(300);
const format = 'WebM';
await page.getByRole('button', { name: new RegExp(`^${format}$`, 'i') }).click();
const button = page.getByRole('button', { name: new RegExp(`^Export ${format}$`, 'i') });
console.log('before', await button.count(), await button.isEnabled(), await button.boundingBox(), await button.evaluate((el) => ({ html: el.outerHTML, pointerEvents: getComputedStyle(el).pointerEvents, disabled: el.disabled })));
await button.click({ force: true });
for (const delay of [100, 500, 1000]) {
  await page.waitForTimeout(delay);
  console.log('short', delay, (await page.locator('body').innerText()).slice(-500));
}
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  console.log('tick', i + 1, 'enabled', await button.isEnabled(), 'bodyTail', (await page.locator('body').innerText()).slice(-900));
}
console.log(JSON.stringify({ errors }, null, 2));
await page.screenshot({ path: '/tmp/codereel-export-debug.png', fullPage: true });
await browser.close();

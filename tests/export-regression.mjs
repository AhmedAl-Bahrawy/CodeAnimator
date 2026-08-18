import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

await page.goto('http://localhost:4174/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('const parity = true;\nconsole.log(parity);');
await page.waitForTimeout(500);

await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(300);

const results = {};
for (const format of ['MP4', 'WebM', 'GIF']) {
  const formatButton = page.getByRole('button', { name: new RegExp(`^${format}$`, 'i') });
  await formatButton.click();
  await page.waitForTimeout(100);

  const exportButton = page.getByRole('button', { name: new RegExp(`^Export ${format}$`, 'i') });
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await exportButton.click();
  const download = await downloadPromise;
  const path = await download.path();
  const bytes = path ? await readFile(path) : Buffer.alloc(0);
  const firstBytes = bytes.subarray(0, 16).toString('ascii');
  const filename = await download.suggestedFilename();
  const bodyText = await page.locator('body').innerText();

  results[format] = {
    filename,
    byteLength: bytes.length,
    firstBytes,
    validSignature:
      format === 'GIF' ? bytes.subarray(0, 6).toString('ascii') === 'GIF89a' || bytes.subarray(0, 6).toString('ascii') === 'GIF87a' :
      format === 'MP4' ? bytes.subarray(4, 8).toString('ascii') === 'ftyp' :
      bytes.subarray(0, 4).toString('ascii') === '\u001aE\u00df\u00a3',
    status: bodyText.includes('Export complete') ? 'complete' : bodyText.slice(-300),
  };
  await page.waitForTimeout(1800);
}

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
if (errors.length || Object.values(results).some((result) => !result.validSignature || result.byteLength === 0)) process.exit(1);

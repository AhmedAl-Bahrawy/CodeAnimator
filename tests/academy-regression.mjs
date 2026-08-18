import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 } });
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', error => errors.push(`page: ${error.message}`));
await page.goto('http://localhost:4180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.getByRole('tab', { name: 'Skins' }).click();
await page.getByText('Khwarizm Academy', { exact: true }).first().click();
await page.waitForTimeout(500);
const editor = page.locator('.cm-editor').first();
const canvas = page.locator('canvas').first();
const result = await page.evaluate(() => {
  const root = getComputedStyle(document.documentElement);
  const cm = document.querySelector('.cm-editor');
  const canvasEl = document.querySelector('canvas');
  const context = canvasEl?.getContext('2d');
  const pixel = context ? Array.from(context.getImageData(Math.floor((canvasEl.width || 1) / 2), Math.floor((canvasEl.height || 1) / 2), 1, 1).data) : [];
  return {
    accent: root.getPropertyValue('--accent').trim(),
    editorBackground: cm ? getComputedStyle(cm).backgroundColor : '',
    canvasSize: canvasEl ? [canvasEl.width, canvasEl.height] : [],
    centerPixel: pixel,
  };
});
console.log(JSON.stringify({ result, editorVisible: await editor.isVisible(), canvasVisible: await canvas.isVisible(), errors }, null, 2));
await browser.close();
if (errors.length || result.accent !== '#E5B65C') process.exit(1);

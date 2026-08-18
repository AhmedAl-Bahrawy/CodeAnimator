import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 } });
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', error => errors.push(`page: ${error.message}`));
await page.goto('http://localhost:4180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(700);
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('const visibleOnCanvas = true;\nconsole.log(visibleOnCanvas);');
await page.waitForTimeout(900);
const result = await page.evaluate(() => {
  const cm = document.querySelector('.cm-content');
  const canvas = document.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  let bright = 0;
  let nonBackground = 0;
  if (canvas && ctx) {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const bg = [image[0], image[1], image[2]];
    for (let i = 0; i < image.length; i += 4) {
      const delta = Math.abs(image[i] - bg[0]) + Math.abs(image[i + 1] - bg[1]) + Math.abs(image[i + 2] - bg[2]);
      if (delta > 24) nonBackground += 1;
      if (image[i] + image[i + 1] + image[i + 2] > 500) bright += 1;
    }
  }
  return {
    editorText: cm?.textContent || '',
    canvasSize: canvas ? [canvas.width, canvas.height] : [],
    nonBackground,
    bright,
    center: canvas && ctx ? Array.from(ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data) : [],
  };
});
console.log(JSON.stringify({ result, errors }, null, 2));
await browser.close();
if (errors.length || !result.editorText.includes('visibleOnCanvas') || result.bright === 0) process.exit(1);

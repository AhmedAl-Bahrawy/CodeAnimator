import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
await page.goto('http://localhost:4180/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);

const source = 'function parity(value) {\n  return `value: ${value}`;\n}\nconsole.log(parity(42));';
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type(source);
await page.waitForTimeout(700);

const before = await page.evaluate(() => {
  const editorRoot = document.querySelector('.cm-editor');
  const content = document.querySelector('.cm-content');
  const gutters = document.querySelector('.cm-gutters');
  const canvas = document.querySelector('canvas');
  const editorStyle = editorRoot ? getComputedStyle(editorRoot) : null;
  const contentStyle = content ? getComputedStyle(content) : null;
  const gutterStyle = gutters ? getComputedStyle(gutters) : null;
  const canvasContext = canvas?.getContext('2d');
  const pixel = canvasContext ? Array.from(canvasContext.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data) : null;
  return {
    editorText: content?.textContent || '',
    editorBackground: editorStyle?.backgroundColor || '',
    editorFont: contentStyle?.fontFamily || '',
    editorFontSize: contentStyle?.fontSize || '',
    editorLineHeight: contentStyle?.lineHeight || '',
    gutterBackground: gutterStyle?.backgroundColor || '',
    canvasSize: canvas ? [canvas.width, canvas.height] : null,
    canvasCenterPixel: pixel,
    canvasTitlePixel: canvasContext ? Array.from(canvasContext.getImageData(Math.floor(canvas.width / 2), 40, 1, 1).data) : null,
    rootAccent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  };
});

await page.getByRole('tab', { name: 'Design' }).click();
await page.waitForTimeout(200);
const skinButtons = page.locator('button').filter({ hasText: /^Terminal Green$/ });
const skinCount = await skinButtons.count();
if (skinCount > 0) await skinButtons.last().click();
await page.waitForTimeout(500);
const afterSkin = await page.evaluate(() => {
  const editorRoot = document.querySelector('.cm-editor');
  const content = document.querySelector('.cm-content');
  const canvas = document.querySelector('canvas');
  const editorStyle = editorRoot ? getComputedStyle(editorRoot) : null;
  const contentStyle = content ? getComputedStyle(content) : null;
  const context = canvas?.getContext('2d');
  const pixel = context && canvas ? Array.from(context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data) : null;
  return {
    editorText: content?.textContent || '',
    editorBackground: editorStyle?.backgroundColor || '',
    editorFont: contentStyle?.fontFamily || '',
    editorFontSize: contentStyle?.fontSize || '',
    editorLineHeight: contentStyle?.lineHeight || '',
    canvasCenterPixel: pixel,
    canvasTitlePixel: context && canvas ? Array.from(context.getImageData(Math.floor(canvas.width / 2), 40, 1, 1).data) : null,
    rootAccent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
  };
});

await page.screenshot({ path: '/tmp/codereel-parity.png', fullPage: true });
await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(200);
await page.getByRole('button', { name: /^WEBM$/i }).click();
const exportButton = page.getByRole('button', { name: /^Export WEBM$/i });
const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
await exportButton.click();
const download = await downloadPromise;
const downloadPath = await download.path();
const bytes = downloadPath ? await readFile(downloadPath) : Buffer.alloc(0);
const exportResult = {
  filename: await download.suggestedFilename(),
  byteLength: bytes.length,
  validWebm: bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
};

const result = {
  errors,
  sourceStable: before.editorText.includes('function parity') && afterSkin.editorText.includes('function parity'),
  metricsStable: before.editorFont === afterSkin.editorFont && before.editorFontSize === afterSkin.editorFontSize && before.editorLineHeight === afterSkin.editorLineHeight,
  skinChangedDocument: before.rootAccent !== afterSkin.rootAccent && before.canvasTitlePixel?.join(',') !== afterSkin.canvasTitlePixel?.join(','),
  before,
  afterSkin,
  exportResult,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length || !result.sourceStable || !result.metricsStable || !result.skinChangedDocument || !exportResult.validWebm) process.exit(1);

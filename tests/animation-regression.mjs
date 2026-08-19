import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1633, height: 756 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto('http://127.0.0.1:4180', { waitUntil: 'domcontentloaded' });
await page.locator('.cm-editor').first().waitFor({ state: 'visible', timeout: 15000 });
await page.getByRole('tab', { name: 'Animate' }).click();
await page.getByText('Animation timeline').waitFor({ state: 'visible' });
await page.getByText('SYNCED').waitFor({ state: 'visible' });

const animationTabText = await page.locator('body').innerText();
const normalizedAnimationTabText = animationTabText.toLowerCase();
if (!normalizedAnimationTabText.includes('motion design') || !normalizedAnimationTabText.includes('cursor stability') || !normalizedAnimationTabText.includes('sound cues')) {
  throw new Error('Dedicated Animations tab is incomplete');
}

const canvas = page.locator('canvas').first();
const before = await canvas.evaluate((node) => {
  const ctx = node.getContext('2d');
  return ctx?.getImageData(0, 0, node.width, node.height).data.slice(0, 128).reduce((sum, value) => sum + value, 0) || 0;
});

await page.getByText('Animation preset').locator('..').getByRole('combobox').click();
await page.getByText('Cinematic — subtle push-in', { exact: false }).click();
await page.getByRole('button', { name: 'Play preview' }).click();
await page.waitForTimeout(320);
const timelineValue = await page.getByRole('slider', { name: 'Preview timeline' }).inputValue();
if (Number(timelineValue) <= 0) throw new Error('Deterministic preview playhead did not advance');

const frames = [];
for (let index = 0; index < 4; index += 1) {
  frames.push(await canvas.screenshot());
  await page.waitForTimeout(50);
}
const distinctFrames = new Set(frames.map((buffer) => buffer.toString('base64'))).size;
if (distinctFrames < 2) throw new Error('Animation preview did not change across playhead frames');

await page.getByRole('button', { name: 'Pause preview' }).click();
await page.getByRole('button', { name: 'Fit canvas' }).click();
const after = await canvas.evaluate((node) => {
  const ctx = node.getContext('2d');
  return ctx?.getImageData(0, 0, node.width, node.height).data.slice(0, 128).reduce((sum, value) => sum + value, 0) || 0;
});
if (before === 0 || after === 0) throw new Error('Canvas did not contain rendered pixels');
if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);

console.log(JSON.stringify({ ok: true, timelineValue, distinctFrames, browserErrors: errors.length }));
await browser.close();

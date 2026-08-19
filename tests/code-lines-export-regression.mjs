import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));

await page.goto('http://localhost:4180/', { waitUntil: 'domcontentloaded' });
await page.locator('.cm-content').first().waitFor({ state: 'visible', timeout: 30000 });
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type(Array.from({ length: 14 }, (_, index) => `const line${index + 1} = ${index + 1};`).join('\n'));
await page.waitForTimeout(500);

await page.getByRole('tab', { name: 'Design' }).click();
const recordingMode = page.locator('label').filter({ hasText: 'Recording mode' }).locator('xpath=../..').getByRole('combobox');
await recordingMode.click();
await page.getByRole('option', { name: 'Code Lines Mode' }).click();
await page.waitForTimeout(300);
const canvas = page.locator('canvas').first();
const canvasSize = await canvas.evaluate((node) => ({ width: node.width, height: node.height }));

await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /^MP4$/i }).click();
const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
await page.getByRole('button', { name: /^Export MP4$/i }).click();
const download = await downloadPromise;
const root = path.resolve('tests/media-artifacts');
await mkdir(root, { recursive: true });
const output = path.join(root, 'code-lines.mp4');
await download.saveAs(output);
const bytes = await readFile(output);
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,codec_type,width,height:format=duration', '-of', 'json', output], { encoding: 'utf8' });
const parsed = probe.status === 0 ? JSON.parse(probe.stdout) : null;
const video = parsed?.streams?.find((stream) => stream.codec_type === 'video');
const result = { canvasSize, bytes: bytes.length, ffprobeExit: probe.status, video, errors };
console.log(JSON.stringify(result, null, 2));
await browser.close();
if (errors.length || probe.status !== 0 || !video || video.width >= 1620 || video.height >= 2880) process.exit(1);

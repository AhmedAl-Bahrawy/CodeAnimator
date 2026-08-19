import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve('tests/media-artifacts');
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1632, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  await page.goto('http://localhost:4180/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('.cm-content').first().waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForTimeout(500);
const editor = page.locator('.cm-content').first();
await editor.click();
await page.keyboard.press('Control+A');
await page.keyboard.type('const playable = true;\nconsole.log(playable);');
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: 'Animate' }).click();
  await page.waitForTimeout(300);
  const typingCueControl = page.locator('label').filter({ hasText: 'Typing cue' }).locator('xpath=../..').getByRole('combobox');
  await typingCueControl.click();
  await page.getByRole('option', { name: 'Key Tap' }).click();
  await page.getByRole('tab', { name: 'Export' }).click();
await page.waitForTimeout(300);

const results = {};
for (const format of ['MP4', 'WebM']) {
  await page.getByRole('button', { name: new RegExp(`^${format}$`, 'i') }).click();
  await page.waitForTimeout(100);
  const downloadPromise = page.waitForEvent('download', { timeout: 90000 });
  await page.getByRole('button', { name: new RegExp(`^Export ${format}$`, 'i') }).click();
  const download = await downloadPromise;
  const target = path.join(root, `current-${format.toLowerCase()}.${format === 'MP4' ? 'mp4' : 'webm'}`);
  await download.saveAs(target);
  const bytes = await readFile(target);
  const bodyText = await page.locator('body').innerText();
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=format_name,duration,size:stream=index,codec_name,codec_type,width,height,avg_frame_rate,nb_frames', '-of', 'json', target], { encoding: 'utf8' });
  const probeJson = probe.status === 0 ? JSON.parse(probe.stdout) : null;
  const streams = probeJson?.streams || [];
  results[format] = {
    path: target,
    bytes: bytes.length,
    signature: bytes.subarray(0, 16).toString('latin1'),
    ffprobeExit: probe.status,
    ffprobeStdout: probe.stdout,
    ffprobeStderr: probe.stderr,
    hasVideo: streams.some((stream) => stream.codec_type === 'video'),
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
    statusTail: bodyText.slice(-500),
  };
  await page.waitForTimeout(500);
}
console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
if (errors.length || Object.entries(results).some(([format, result]) => result.ffprobeExit !== 0 || !result.hasVideo || (format === 'MP4' && !result.hasAudio))) process.exit(1);

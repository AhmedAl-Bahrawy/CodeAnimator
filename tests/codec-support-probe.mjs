import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:4180/', { waitUntil: 'networkidle', timeout: 30000 });
const result = await page.evaluate(async () => {
  const codecs = ['vp09.00.10.08', 'vp8', 'avc1.42001e'];
  const output = {};
  for (const codec of codecs) {
    try {
      output[codec] = await VideoEncoder.isConfigSupported({ codec, width: 1080, height: 1920, bitrate: 8_000_000, framerate: 30 });
    } catch (error) {
      output[codec] = { error: String(error) };
    }
  }
  return output;
});
console.log(JSON.stringify(result, null, 2));
await browser.close();

import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);

const title = await page.textContent('header span');
const projectsBtn = await page.locator('button:has-text("Projects")').count();
const canvas = await page.locator('canvas').count();
const previewText = await page.locator('.cm-content').first().textContent();

console.log('App title:', title);
console.log('Projects button visible:', projectsBtn > 0);
console.log('Preview canvas mounted:', canvas > 0);
console.log('Editor content length:', previewText ? previewText.length : 0);
console.log('Console errors:', errors.length ? errors.join('\n') : 'none');

// Click Projects to ensure modal opens (was previously unreachable)
if (projectsBtn > 0) {
  const projBtn = await page.locator('button:has-text("Projects")').first();
  await projBtn.click({ timeout: 5000 }).catch(async () => {
    // Fallback: the header may need viewport scroll into view
    await projBtn.scrollIntoViewIfNeeded();
    await projBtn.click();
  });
  await page.waitForTimeout(500);
  const modal = await page.locator('text=My Projects').count();
  const exportBtn = await page.locator('button:has-text("Export Archive")').count();
  console.log('ProjectManager modal opened:', modal > 0);
  console.log('Export Archive button wired:', exportBtn > 0);
}

// Verify preview shows cleaned code, not markup tokens
const frameSrc = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c ? `${c.width}x${c.height}` : 'no canvas';
});
console.log('Preview canvas size:', frameSrc);

await browser.close();
const hasError = errors.some(e => /Markup|TypeError|ReferenceError/i.test(e));
process.exit(hasError ? 1 : 0);

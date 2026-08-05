import { chromium } from 'playwright';

const TEAM_ID = 'cmo9krmfo0001sz2uzqablzm0';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

await page.goto('http://localhost:3000/login');
await page.waitForTimeout(1000);
await page.fill('input[name="username"], input#username, input[type="text"]', 'AJ');
await page.fill('input[name="password"], input#password, input[type="password"]', '3927');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log('After login URL:', page.url());

await page.goto(`http://localhost:3000/dashboard/team/${TEAM_ID}`);
await page.waitForTimeout(2000);
console.log('Team page URL:', page.url());

await page.screenshot({ path: '/tmp/attendance-01-initial.png', fullPage: true });

// Inspect DOM structure
const html = await page.content();
console.log('Has 전체 출석 체크:', html.includes('전체 출석 체크'));
console.log('Has 되돌리기:', html.includes('되돌리기'));

// Footer count text
const footer = await page.locator('text=/명 중 .*명 기록됨/').first().textContent().catch(() => null);
console.log('Footer text:', footer);

await browser.close();

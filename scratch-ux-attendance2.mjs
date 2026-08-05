import { chromium } from 'playwright';

const TEAM_ID = 'cmo9krmfo0001sz2uzqablzm0';
const PARTIAL_DATE_ID = 'cmp3dwah1005h3es9eo7pk8uz'; // 11/13 recorded, 2 blank

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 375, height: 812 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();

await page.goto('http://localhost:3000/login');
await page.waitForTimeout(1000);
await page.fill('input[type="text"]', 'AJ');
await page.fill('input[type="password"]', '3927');
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);

await page.goto(`http://localhost:3000/dashboard/team/${TEAM_ID}`);
await page.waitForTimeout(2000);

// Select the partial date
await page.selectOption('select', PARTIAL_DATE_ID);
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/attendance-02-partial-before.png', fullPage: true });

const footerBefore = await page.locator('text=/명 중 .*명 기록됨/').first().textContent();
console.log('Footer before:', footerBefore);

// Find blank members (rows with no colored button)
const rows = await page.locator('.divide-y > div').all();
console.log('Row count:', rows.length);

// Tap 전체 출석 체크
await page.click('text=전체 출석 체크');
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/attendance-03-after-markall.png', fullPage: true });

const footerAfter = await page.locator('text=/명 중 .*명 기록됨/').first().textContent();
console.log('Footer after mark-all:', footerAfter);

const undoVisible = await page.locator('text=되돌리기').isVisible().catch(() => false);
console.log('되돌리기 visible after mark-all:', undoVisible);

// Now tap undo
if (undoVisible) {
  await page.click('text=되돌리기');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/attendance-04-after-undo.png', fullPage: true });
  const footerUndo = await page.locator('text=/명 중 .*명 기록됨/').first().textContent();
  console.log('Footer after undo:', footerUndo);
  const undoStillVisible = await page.locator('text=되돌리기').isVisible().catch(() => false);
  console.log('되돌리기 visible after undo tap:', undoStillVisible);
}

// Now test: tap 전체출석체크 again when EVERYTHING already recorded (no-op case)
await page.selectOption('select', TEAM_ID === TEAM_ID ? PARTIAL_DATE_ID : '');
await page.waitForTimeout(500);
// re-fill blanks manually to get to full state, then tap mark-all-present again to observe silent no-op
await page.click('text=전체 출석 체크');
await page.waitForTimeout(1500);
await page.click('text=전체 출석 체크'); // second tap when already full
await page.waitForTimeout(1000);
await page.screenshot({ path: '/tmp/attendance-05-noop-tap.png', fullPage: true });
console.log('Done second mark-all tap (expect silent no-op, no visual change, no 되돌리기 change)');

// Tap target measurements
const statusBtn = page.locator('button:has-text("출석")').first();
const box = await statusBtn.boundingBox();
console.log('출석 button box:', box);

const pencilBtn = page.locator('svg.lucide-pencil').first();
const pencilBox = await pencilBtn.boundingBox().catch(() => null);
console.log('Pencil icon box:', pencilBox);

// Check bottom nav overlap
const nav = await page.locator('nav, [class*="fixed"][class*="bottom"]').first().boundingBox().catch(() => null);
console.log('Bottom nav box:', nav);

// Check last member row position vs viewport/nav
const lastRow = page.locator('.divide-y > div').last();
const lastRowBox = await lastRow.boundingBox();
console.log('Last member row box:', lastRowBox);

await browser.close();

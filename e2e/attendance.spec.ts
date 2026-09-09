import { test, expect, type Locator } from "@playwright/test";

// Next dev-server compiles each route on first visit; that lag lands after
// navigation resolves and after "networkidle" fires, so an immediate
// `.count()` right after a click routinely races real data. Wait for the
// element (or timeout) before counting, rather than trusting either signal.
async function settledCount(locator: Locator, timeout = 15_000) {
  await locator.first().waitFor({ timeout }).catch(() => {});
  return locator.count();
}

// Smoke test for the attendance mark/unmark round trip described in
// scratch-ux-attendance*.mjs, rewritten as a real assertion-based spec:
// - navigates by clicking through the UI (no hardcoded team/date ids)
// - runs against both the mobile (TodayAttendanceList) and desktop
//   (AttendanceTable) views, selected by breakpoint at src/app/dashboard/team/[teamId]/page.tsx
// - leaves data as it found it (mark, then unmark)
//
// Needs a real account: set E2E_USER / E2E_PASS. Skipped if unset.
const USER = process.env.E2E_USER;
const PASS = process.env.E2E_PASS;

// Desktop cell is a Popover trigger (src/components/attendance/AttendanceCell.tsx)
// around the shared StatusOptionList (src/components/StatusOptionList.tsx) —
// selecting a status is explicit now, not a click-to-cycle. Glyph <-> label
// mirrors STATUS_OPTIONS in src/lib/attendance-status.ts.
const GLYPH_TO_LABEL: Record<string, string> = {
  O: "출석",
  X: "결석",
  "△": "사유결석",
  "-": "지우기",
};

test.describe("attendance mark/unmark", () => {
  test.skip(!USER || !PASS, "E2E_USER / E2E_PASS not set");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.locator("#username").fill(USER!);
    await page.locator("#password").fill(PASS!);
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("mark a member then restore original state", async ({ page }, testInfo) => {
    await page.goto("/dashboard");

    // Navigate to a team page by clicking through, same as a real user
    // would. Scoped to <main>: the sidebar (src/app/dashboard/layout.tsx)
    // renders the same hrefs off-screen behind the mobile hamburger menu.
    const main = page.locator("main");
    const teamLink = main.locator('a[href^="/dashboard/team/"]').first();
    if (await settledCount(teamLink)) {
      await teamLink.click();
    } else {
      const groupLink = main.locator('a[href^="/dashboard/group/"]').first();
      test.skip(!(await settledCount(groupLink)), "account has no team/group access");
      await groupLink.click();
      await page.waitForURL(/\/dashboard\/group\//, { timeout: 10_000 });
      const teamCard = main.locator(".cursor-pointer").first();
      test.skip(!(await settledCount(teamCard)), "group has no teams");
      await teamCard.click();
    }
    await expect(page).toHaveURL(/\/dashboard\/team\//, { timeout: 10_000 });

    if (testInfo.project.name === "mobile") {
      const list = page.locator("text=아직 등록된 날짜가 없습니다").first();
      const firstRow = page.locator(".divide-y > div").first();
      // Whichever shows up first: the empty state, or an actual member row.
      await Promise.race([
        list.waitFor({ timeout: 15_000 }).catch(() => {}),
        firstRow.waitFor({ timeout: 15_000 }).catch(() => {}),
      ]);
      test.skip(await list.count() > 0, "team has no date columns");
      test.skip(!(await firstRow.count()), "team has no members");
      const presentBtn = firstRow.getByRole("button", { name: "출석", exact: true });
      // Scoped to the list's own footer div: a header/status-bar element
      // elsewhere on the page shows the same "N명 중 N명 기록됨" text.
      const footer = page.locator("div.border-t.border-gray-100", {
        hasText: /명 중 \d+명 기록됨/,
      });

      // Don't assume the starting state is blank — a prior run (or a real
      // user) may have already marked this member present for this date.
      // Assert the round trip instead: tap flips it, tap again restores it.
      const wasPresent = ((await presentBtn.getAttribute("class")) ?? "").includes("bg-green-600");
      const beforeFooter = await footer.textContent();

      await presentBtn.click();
      if (wasPresent) {
        await expect(presentBtn).not.toHaveClass(/bg-green-600/);
      } else {
        await expect(presentBtn).toHaveClass(/bg-green-600/);
      }

      // Tapping the same status again toggles it back (handleStatusTap).
      await presentBtn.click();
      if (wasPresent) {
        await expect(presentBtn).toHaveClass(/bg-green-600/);
      } else {
        await expect(presentBtn).not.toHaveClass(/bg-green-600/);
      }
      await expect(footer).toHaveText(beforeFooter!);
    } else {
      // Scoped to tbody: thead has its own w-11 h-11 lock-toggle button
      // that .first() would otherwise grab ahead of an actual data cell.
      const cell = page.locator("table tbody button.w-11.h-11").first();
      test.skip(!(await settledCount(cell)), "team has no date columns or members");

      // Selects a status from the popover, opening it first if it isn't
      // already open (picking one status leaves the popover open when it's
      // ABSENT/AWR, to focus the reason field — see handleSelect).
      const selectStatus = async (label: string) => {
        const option = page.getByRole("button", { name: label, exact: true });
        if (!(await option.isVisible().catch(() => false))) {
          await cell.click();
        }
        await option.waitFor({ timeout: 5_000 });
        await option.click();
      };

      const original = await cell.textContent();
      const originalLabel = GLYPH_TO_LABEL[original ?? "-"] ?? "지우기";
      // Toggle through HERE/blank only — both close the popover on select,
      // unlike ABSENT/AWR — so the round trip doesn't depend on reason-field state.
      const tempLabel = originalLabel === "출석" ? "지우기" : "출석";

      await selectStatus(tempLabel);
      await expect(cell).not.toHaveText(original ?? "");

      await selectStatus(originalLabel);
      await expect(cell).toHaveText(original ?? "");
    }
  });
});

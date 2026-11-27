/**
 * Level 4, Experiment 01 (convolution, stride, padding and pooling), end to end in the built app. Every relation is
 * checked on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-01';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-1a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-1b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-1c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-1d"]');

const FEATURE_MAP = [3, 2, -1, 3, 0, -2, 2, -2, -2];

const text = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

const setBParams = async (page: Page, stride: number, padding: number): Promise<void> => {
  await sectionB(page).locator(`label:has([data-control="b:stride:${stride}"])`).click();
  await sectionB(page).locator(`label:has([data-control="b:padding:${padding}"])`).click();
};

test('Part A: stepping to position 3 shows a sum equal to the engine value', async ({ page }) => {
  await page.goto(URL);
  const next = sectionA(page).locator('[data-control="a:next"]');
  for (let i = 0; i < 3; i++) await next.click();
  await expect(sectionA(page).locator('[data-tour="cv-step"]')).toHaveAttribute('data-position', '3');
  const sum = await text(sectionA(page), 'sum');
  const engine = await text(sectionA(page), 'engine');
  const sumValue = num(sum.split('=').pop()!.trim());
  expect(num(engine.split(/\s/)[0])).toBe(sumValue);
  expect(sumValue).toBe(FEATURE_MAP[3]);
  await expect(sectionA(page).getByText('✓ equals the sum')).toBeVisible();
});

test('Part A: every position matches the feature map and the buttons disable at the ends', async ({
  page,
}) => {
  await page.goto(URL);
  const prev = sectionA(page).locator('[data-control="a:prev"]');
  const next = sectionA(page).locator('[data-control="a:next"]');
  await expect(prev).toBeDisabled();
  for (let k = 0; k < 9; k++) {
    await expect(sectionA(page).locator('[data-tour="cv-step"]')).toHaveAttribute('data-position', String(k));
    const engine = await text(sectionA(page), 'engine');
    expect(num(engine.split(/\s/)[0])).toBe(FEATURE_MAP[k]);
    expect(engine).toContain('✓ equals the sum');
    if (k < 8) await next.click();
  }
  await expect(next).toBeDisabled();
});

test('Part B: stride and padding give the expected output size and the formula agrees', async ({ page }) => {
  await page.goto(URL);
  const cases: Array<[number, number, number]> = [
    [1, 0, 4],
    [1, 1, 6],
    [2, 0, 2],
    [2, 1, 3],
  ];
  for (const [s, p, n] of cases) {
    await setBParams(page, s, p);
    await expect(sectionB(page).locator('[data-value="shape"]')).toHaveText(`${n}×${n}`);
    const formula = await text(sectionB(page), 'formula');
    expect(num(formula.split('=').pop()!.trim()), formula).toBe(n);
  }
});

test('Part C: max and average pooling give the expected values, each checked by the engine', async ({
  page,
}) => {
  await page.goto(URL);
  const expected: Record<string, number[]> = {
    max: [4, 2, 2, 5],
    avg: [2.5, 0.75, 0.75, 2.75],
  };
  for (const [mode, values] of Object.entries(expected)) {
    await sectionC(page).locator(`label:has([data-control="c:mode:${mode}"])`).click();
    for (let k = 0; k < 4; k++) {
      await sectionC(page).locator(`[data-control="c:cell:${k}"]`).click();
      const explain = await text(sectionC(page), 'pool-explain');
      expect(explain, `${mode} ${k}`).toMatch(/✓$/);
      const m = /The engine’s value:\s*([−+\d.]+)/.exec(explain);
      expect(m, explain).not.toBeNull();
      expect(num(m![1])).toBe(values[k]);
    }
  }
});

test('Part D: each pattern gives the expected strongest responses', async ({ page }) => {
  await page.goto(URL);
  const strongest = async (kernel: string): Promise<number> =>
    num(await sectionD(page).locator(`tr[data-kernel="${kernel}"] td`).last().innerText());
  const expected: Record<string, [number, number]> = {
    vertical: [3, 0],
    horizontal: [0, 3],
    uniform: [0, 0],
  };
  for (const [pattern, [v, h]] of Object.entries(expected)) {
    await sectionD(page).locator(`label:has([data-control="d:pattern:${pattern}"])`).click();
    await expect.poll(() => strongest('vertical')).toBe(v);
    expect(await strongest('horizontal')).toBe(h);
  }
  await sectionD(page).locator('label:has([data-control="d:pattern:corner"])').click();
  await expect.poll(() => strongest('vertical')).toBeGreaterThan(0);
  expect(await strongest('horizontal')).toBeGreaterThan(0);
});

test('Tour: stepping advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await sectionA(page).locator('[data-control="a:next"]').click();
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

test('Check: the live size question accepts the engine row count for stride 2, padding 1', async ({
  page,
}) => {
  await page.goto(URL);
  await setBParams(page, 2, 1);
  await expect(sectionB(page).locator('[data-value="shape"]')).toHaveText('3×3');
  const q = page.locator('[data-question="l4-live-size"]');
  await expect(q).toContainText('stride 2, padding 1');
  await q.locator('label.lv-option', { hasText: /^3$/ }).click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
});

/**
 * Level 3, Experiment 02 (momentum), end to end in the built app. Every relation is checked on values the page
 * shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-3/experiment-02';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l3-2a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l3-2b"]');
const row = (page: Page, run: string): Locator => sectionA(page).locator(`tr[data-run="${run}"]`);

const trainA = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:compare"]').click();
  await expect(row(page, 'plain gradient descent')).toBeVisible({ timeout: 60_000 });
};

const trainB = async (page: Page, mu: string): Promise<void> => {
  await sectionB(page).locator(`label:has([data-control="b:mu:${mu}"])`).click();
  await sectionB(page).locator('[data-control="b:train"]').click();
  await expect(sectionB(page).locator('[data-control="b:update"]')).toBeVisible({ timeout: 60_000 });
};

const setUpdate = async (page: Page, n: number): Promise<Locator> => {
  await sectionB(page).locator('[data-control="b:update"]').fill(String(n));
  const box = sectionB(page).locator(`[data-update="${n}"]`);
  await expect(box).toBeVisible();
  return box;
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

const finalLoss = async (page: Page, run: string): Promise<number> =>
  num(await row(page, run).locator('td').nth(1).innerText());

test('Part A: momentum reaches a lower epoch-60 loss, and more momentum is lower still', async ({ page }) => {
  await page.goto(URL);
  await trainA(page);
  const plain = await finalLoss(page, 'plain gradient descent');
  const half = await finalLoss(page, 'momentum μ = 0.5');
  const high = await finalLoss(page, 'momentum μ = 0.9');
  expect(high).toBeLessThan(half);
  expect(half).toBeLessThan(plain);
  expect(high).toBeLessThan(0.1);
});

test('Part B with mu 0.9: velocity chains from the previous velocity and the steps match', async ({
  page,
}) => {
  await page.goto(URL);
  await trainB(page, '0.9');
  const box1 = await setUpdate(page, 1);
  expect(num(await value(box1, 'prev'))).toBe(0);
  await expect(box1.locator('[data-value="prev"]')).toContainText('(starts at 0)');
  const grad1 = num(await value(box1, 'grad'));
  const v1 = num(await value(box1, 'velocity'));
  expect(Math.abs(v1 - grad1)).toBeLessThanOrEqual(1e-6);

  const box2 = await setUpdate(page, 2);
  const grad2 = num(await value(box2, 'grad'));
  const v2 = num(await value(box2, 'velocity'));
  expect(Math.abs(v2 - (0.9 * v1 + grad2))).toBeLessThanOrEqual(2e-6);
  const delta2 = num(await value(box2, 'delta'));
  expect(Math.abs(delta2 - -0.5 * v2)).toBeLessThanOrEqual(1e-6);
  const plain2 = num(await value(box2, 'plain'));
  expect(Math.abs(plain2 - -0.5 * grad2)).toBeLessThanOrEqual(1e-6);
  await expect(box2.locator('[data-value="velocity"]')).toContainText('✓ checked here');
  await expect(box2.locator('[data-value="delta"]')).toContainText('✓ checked here');
  await expect(box1.locator('[data-value="velocity"]')).toHaveCount(0);
});

test('Part B with mu 0: momentum collapses to plain gradient descent', async ({ page }) => {
  await page.goto(URL);
  await trainB(page, '0');
  const box = await setUpdate(page, 5);
  const grad = num(await value(box, 'grad'));
  expect(Math.abs(num(await value(box, 'velocity')) - grad)).toBeLessThanOrEqual(1e-6);
  expect(Math.abs(num(await value(box, 'delta')) - num(await value(box, 'plain')))).toBeLessThanOrEqual(1e-6);
  await expect(box.locator('[data-value="ratio"]')).toHaveText('1.00×');
});

test('Part B with mu 0.9: some update has a momentum step more than twice the plain step', async ({
  page,
}) => {
  await page.goto(URL);
  await trainB(page, '0.9');
  let best = 0;
  for (let n = 1; n <= 60; n++) {
    const box = await setUpdate(page, n);
    const ratio = num(await value(box, 'ratio'));
    if (Number.isFinite(ratio)) best = Math.max(best, ratio);
  }
  expect(best).toBeGreaterThan(2);
});

test('Part B: Show moves the explorer to the id in its label', async ({ page }) => {
  await page.goto(URL);
  await trainB(page, '0.9');
  await setUpdate(page, 3);
  const show = sectionB(page).locator('[data-control="b:show"]');
  const label = (await show.innerText()) + ' ' + ((await show.getAttribute('aria-label')) ?? '');
  const id = /#(\d+)/.exec(label)![1];
  await show.click();
  await expect(page.locator('[data-control="trace:position"]')).toHaveValue(id);
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await trainA(page);
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

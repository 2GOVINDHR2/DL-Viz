/**
 * Level 3, Experiment 04 (overfitting and weight decay), end to end in the built app. Every relation is checked
 * on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-3/experiment-04';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l3-4a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l3-4b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l3-4c"]');

const trainA = async (page: Page, lambda: string): Promise<void> => {
  await sectionA(page).locator(`label:has([data-control="a:lambda:${lambda}"])`).click();
  await sectionA(page).locator('[data-control="a:train"]').click();
  await expect(sectionA(page).locator('[data-control="a:epoch"]')).toBeVisible({ timeout: 120_000 });
};

const trainB = async (page: Page): Promise<void> => {
  await sectionB(page).locator('[data-control="b:compare"]').click();
  await expect(sectionB(page).locator('tbody tr[data-lambda]')).toHaveCount(4, { timeout: 120_000 });
};

const aValue = async (page: Page, name: string): Promise<string> =>
  (await sectionA(page).locator(`[data-value="${name}"]`).innerText()).trim();

const setUpdate = async (page: Page, n: number): Promise<Locator> => {
  await sectionC(page).locator('[data-control="c:update"]').fill(String(n));
  const box = sectionC(page).locator(`[data-update="${n}"]`);
  await expect(box).toBeVisible();
  return box;
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

const bestOf = (text: string): { loss: number; epoch: number } => {
  const m = /([\d.]+)\s*(?:after epoch|\(epoch)\s*(\d+)/.exec(text)!;
  return { loss: parseFloat(m[1]), epoch: parseInt(m[2], 10) };
};

const tableRow = (page: Page, lambda: string): Locator =>
  sectionB(page)
    .getByRole('region', { name: 'Weight decay compared' })
    .locator(`tbody tr[data-lambda="${lambda}"]`);
const cell = async (page: Page, lambda: string, col: number): Promise<string> =>
  (await tableRow(page, lambda).locator('td').nth(col).innerText()).trim();

test('Part A with lambda 0: the best epoch is the default, and training on overfits', async ({ page }) => {
  await page.goto(URL);
  await trainA(page, '0');
  const best = bestOf(await aValue(page, 'best'));
  expect(parseInt(await aValue(page, 'epoch'), 10)).toBe(best.epoch);
  expect(num((await aValue(page, 'held')).split('·')[0])).toBe(best.loss);

  await sectionA(page).locator('[data-control="a:epoch"]').fill('300');
  await expect(sectionA(page).locator('[data-value="epoch"]')).toHaveText('300');
  const heldEnd = num((await aValue(page, 'held')).split('·')[0]);
  const trainEnd = num((await aValue(page, 'train')).split('·')[0]);
  expect(heldEnd).toBeGreaterThan(2 * best.loss);
  expect(trainEnd).toBeLessThan(0.05);
  await expect(sectionC(page).getByText('Choose λ greater than 0')).toBeVisible();
});

test('Part B: weight decay lowers the final held-out loss, and the training loss rises with lambda', async ({
  page,
}) => {
  await page.goto(URL);
  await trainA(page, '0');
  const bestA = bestOf(await aValue(page, 'best'));
  await trainB(page);
  await expect(tableRow(page, '0')).toBeVisible();
  const heldEnd = async (l: string): Promise<number> => num(await cell(page, l, 1));
  const trainEnd = async (l: string): Promise<number> => num(await cell(page, l, 0));
  expect(await heldEnd('0.01')).toBeLessThan(await heldEnd('0'));
  const losses = [
    await trainEnd('0'),
    await trainEnd('0.003'),
    await trainEnd('0.01'),
    await trainEnd('0.03'),
  ];
  for (let i = 1; i < losses.length; i++) expect(losses[i]).toBeGreaterThan(losses[i - 1]);
  const bestB = bestOf(await cell(page, '0', 2));
  expect(bestB.epoch).toBe(bestA.epoch);
  expect(bestB.loss).toBe(bestA.loss);
});

test('Part C: the penalty gradient is lambda times the weight, and the optimiser receives their sum', async ({
  page,
}) => {
  await page.goto(URL);
  await trainA(page, '0.01');
  await expect(sectionA(page).getByText('Loss after each epoch (λ = 0.01)')).toBeVisible();
  const slider = sectionC(page).locator('[data-control="c:update"]');
  await expect(slider).toBeVisible({ timeout: 60_000 });
  for (const n of [1, 5]) {
    const box = await setUpdate(page, n);
    const w = num(await value(box, 'w'));
    const grad = num(await value(box, 'grad'));
    const decay = num(await value(box, 'decay'));
    const reg = num(await value(box, 'regularized'));
    const delta = num(await value(box, 'delta'));
    const after = num((await box.locator('dt:has-text("Weight after") + dd').innerText()).trim());
    expect(Math.abs(decay - 0.01 * w)).toBeLessThanOrEqual(1e-6);
    expect(Math.abs(reg - (grad + decay))).toBeLessThanOrEqual(2e-6);
    expect(Math.abs(after - (w + delta))).toBeLessThanOrEqual(2e-6);
    await expect(box.getByText('✓ checked here')).toHaveCount(2);
  }
});

test('Check: the live decay question accepts the recorded gradient', async ({ page }) => {
  await page.goto(URL);
  const q = page.locator('[data-question="l3-live-decay"]');
  await expect(q.getByText('Train a run with λ > 0 in Part A first.')).toBeVisible();
  await trainA(page, '0.01');
  await expect(sectionC(page).locator('[data-control="c:update"]')).toBeVisible({ timeout: 60_000 });
  await expect(q.getByText('update 3')).toBeVisible({ timeout: 60_000 });
  const box = await setUpdate(page, 3);
  const reg = (await value(box, 'regularized')).split(/\s/)[0];
  const correct = q.locator('label.lv-option', { hasText: reg.slice(0, 6) }).first();
  await correct.click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
  await expect(q.locator('.lv-feedback')).toContainText('as recorded');
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await trainA(page, '0');
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

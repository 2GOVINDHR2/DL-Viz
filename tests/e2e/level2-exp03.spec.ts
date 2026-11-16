/**
 * Level 2, Experiment 03 (derivatives and gradient descent), end to end in the built app. Expected numbers are
 * computed here by hand, independently of the engine, and compared with what the page shows.
 */
import { expect, test, type Page } from '@playwright/test';

const URL = '/#/level-2/experiment-03';
const set = async (page: Page, control: string, value: string): Promise<void> => {
  const field = page.locator(`[data-control="${control}:exact"]`);
  await field.fill(value);
  await field.press('Enter');
};
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const f = (v: number, d: number): string => v.toFixed(d).replace(/^-/, '−');

/** One full-batch step of the one-input sigmoid neuron with binary cross-entropy, computed by hand. */
const firstUpdate = (eta: number): { loss: number; w: number; b: number } => {
  const xs = [-2, -1, 0.5, 2];
  const ys = [0, 1, 0, 1];
  let w = -1.5;
  let b = 1;
  let loss = 0;
  let gw = 0;
  let gb = 0;
  xs.forEach((x, i) => {
    const p = sigmoid(w * x + b);
    loss += -(ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p));
    gw += (p - ys[i]) * x;
    gb += p - ys[i];
  });
  loss /= 4;
  gw /= 4;
  gb /= 4;
  w += -eta * gw;
  b += -eta * gb;
  return { loss, w, b };
};

const train = async (page: Page): Promise<void> => {
  await page.locator('[data-control="e:train"]').click();
  await expect(page.getByText('The first update, read from the record')).toBeVisible({ timeout: 60_000 });
};

test('Tour: moving the Part A point advances it, and the slope then matches 2(x − 1)', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 5')).toBeVisible();
  await set(page, 'a:x', '2');
  await expect(page.getByText('step 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(
    page
      .locator('dt', { hasText: /^Slope$/ })
      .locator('xpath=following-sibling::dd[1]')
      .filter({ hasText: /^[−\d]/ }),
  ).toHaveText(f(2 * (2 - 1), 3));
});

test('Part A: the slope sign is named downhill, flat or uphill', async ({ page }) => {
  await page.goto(URL);
  await set(page, 'a:x', '0');
  await expect(page.getByText('↘ downhill')).toBeVisible();
  await set(page, 'a:x', '1');
  await expect(page.getByText('→ flat')).toBeVisible();
  await set(page, 'a:x', '2');
  await expect(page.getByText('↗ uphill')).toBeVisible();
});

test('Part C: steps are counted and reset returns to zero', async ({ page }) => {
  await page.goto(URL);
  for (let i = 0; i < 3; i++) await page.locator('[data-control="c:step"]').click();
  await expect(page.getByText('Steps taken: 3')).toBeVisible();
  await page.locator('[data-control="c:reset"]').click();
  await expect(page.getByText('Steps taken: 0')).toBeVisible();
});

test('Part D: each learning rate gets its verdict', async ({ page }) => {
  await page.goto(URL);
  const cases: [string, string][] = [
    ['Too large (1.05)', 'Diverging'],
    ['Small (0.1)', 'Converging slowly'],
    ['Suitable (0.45)', 'Converging quickly'],
    ['Large (0.9)', 'Overshooting'],
  ];
  for (const [label, verdict] of cases) {
    await page.locator('label', { hasText: label }).click();
    await expect(page.locator('p', { hasText: new RegExp(`^${verdict}`) }).first()).toBeVisible();
  }
});

test('Part E: the first update matches the hand-computed loss, w and b; batch of 1 gives 4 updates', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await expect(page.getByText('4 examples processed').first()).toBeVisible();
  await expect(page.getByText('1 parameter update').first()).toBeVisible();
  await page.locator('[data-control="e:reveal-all"]').click();
  const { loss, w, b } = firstUpdate(1);
  const body = page.locator('body');
  await expect(body).toContainText(f(loss, 4));
  await expect(body).toContainText(f(w, 4));
  await expect(body).toContainText(f(b, 4));
  await page.locator('[data-control="e:batch1"]').click();
  await expect(page.getByText(/4 updates/).first()).toBeVisible({ timeout: 60_000 });
});

test('Explorer: steps forward and back, with Level 2 wording', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  await expect(page.getByText('The record of run 1')).toBeVisible();
  const where = page.locator('.lv-where').first();
  // Nothing has executed until the first Next; the first two steps give distinct positions.
  await page.locator('[data-control="trace:next"]').click();
  await expect(where).toBeVisible();
  const before = await where.innerText();
  await page.locator('[data-control="trace:next"]').click();
  await expect(where).not.toHaveText(before);
  const second = await where.innerText();
  for (let i = 0; i < 2; i++) await page.locator('[data-control="trace:next"]').click();
  await page.locator('[data-control="trace:back"]').click();
  await page.locator('[data-control="trace:back"]').click();
  await expect(where).toHaveText(second);
  await page.locator('[data-control="trace:back"]').click();
  await expect(where).toHaveText(before);
  // The batch node lists its samples and the single update once the batch is opened.
  await page.locator('[data-control="trace:node:batch"]').nth(1).click();
  await expect(
    page.getByText('Update the parameters (one update for the whole batch)').first(),
  ).toBeAttached();
  await expect(page.getByText('Adjustment signal')).toHaveCount(0);
});

test('Staleness: changing the Part E learning rate after a run is announced', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  await page.locator('label:has([data-control="e:lr:10"])').click();
  await expect(page.getByText('You changed the learning rate since run 1')).toBeVisible();
});

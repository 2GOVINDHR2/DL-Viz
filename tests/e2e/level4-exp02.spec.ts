/**
 * Level 4, Experiment 02 (training a small convolutional network), end to end in the built app. Every relation is
 * checked on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-02';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-2a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-2b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-2c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-2d"]');

const train = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:train"]').click();
  await expect(sectionA(page).locator('[data-value="final"]')).toBeVisible({ timeout: 90_000 });
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

const showExample = async (page: Page, example: number, epoch: number): Promise<Locator> => {
  await sectionB(page).locator('[data-control="b:example"]').selectOption(String(example));
  await sectionB(page).locator('[data-control="b:epoch"]').fill(String(epoch));
  const box = sectionB(page).locator(`[data-example="${example}"][data-epoch="${epoch}"]`);
  await expect(box).toBeVisible({ timeout: 90_000 });
  return box;
};

const setUpdate = async (page: Page, n: number): Promise<Locator> => {
  await sectionD(page).locator('[data-control="d:update"]').fill(String(n));
  const box = sectionD(page).locator(`[data-update="${n}"]`);
  await expect(box).toBeVisible({ timeout: 90_000 });
  return box;
};

const beforeAfter = async (box: Locator): Promise<{ before: number; after: number }> => {
  const t = await value(box, 'before-after');
  const m = /^([−+\d.]+)\s*→\s*([−+\d.]+)$/.exec(t);
  expect(m, t).not.toBeNull();
  return { before: num(m![1]), after: num(m![2]) };
};

test('Part A: training reaches a low loss and full accuracy', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const final = await value(sectionA(page), 'final');
  const m =
    /After epoch 1: loss ([\d.]+), ([\d.]+) % correct\. After epoch 30: loss ([\d.]+), ([\d.]+) % correct\./.exec(
      final,
    );
  expect(m, final).not.toBeNull();
  expect(num(m![3])).toBeLessThan(0.1);
  expect(num(m![4])).toBe(100);
  expect(num(m![1])).toBeGreaterThan(num(m![3]));
});

test('Part B: probabilities, loss and prediction agree, and the first images are right at epoch 30', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  for (const example of [0, 1, 2, 3, 10, 25]) {
    const box = await showExample(page, example, 30);
    const rows = box.locator('tr[data-class]');
    await expect(rows).toHaveCount(3);
    const probs: number[] = [];
    let correctIndex = -1;
    for (let i = 0; i < 3; i++) {
      const r = rows.nth(i);
      probs.push(num(await r.locator('td').nth(1).innerText()));
      if ((await r.locator('th').innerText()).includes('(correct class)')) correctIndex = i;
    }
    expect(correctIndex).toBeGreaterThanOrEqual(0);
    expect(Math.abs(probs.reduce((a, b) => a + b, 0) - 1)).toBeLessThanOrEqual(0.002);
    const loss = num((await value(box, 'loss')).split(/\s/)[0]);
    expect(Math.abs(loss - -Math.log(probs[correctIndex]))).toBeLessThanOrEqual(0.002);
    expect(await value(box, 'loss')).toContain('✓ checked here');
    const best = probs.indexOf(Math.max(...probs));
    const className = await rows.nth(best).getAttribute('data-class');
    const prediction = await value(box, 'prediction');
    expect(prediction.startsWith(`${className} `), prediction).toBe(true);
    if (example <= 2) {
      expect(prediction).toContain('✓ correct');
      expect(loss).toBeLessThan(0.2);
    }
  }
});

test('Part C: kernels change during training and the slider moves the shown epoch', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const slider = sectionC(page).locator('[data-control="c:epoch"]');
  await slider.fill('30');
  const box = sectionC(page).locator('[data-kernels-epoch="30"]');
  await expect(box).toBeVisible({ timeout: 90_000 });
  const grids = box.locator('[data-kernel="1"] table.lv-mgrid');
  await expect(grids).toHaveCount(2);
  const start = (await grids.nth(0).innerText()).trim();
  const end = (await grids.nth(1).innerText()).trim();
  expect(end).not.toBe(start);
  await expect(sectionC(page).locator('[data-kernel]')).toHaveCount(4);
  await slider.fill('1');
  await expect(sectionC(page).locator('[data-kernels-epoch="1"]')).toBeVisible();
});

test('Part D: the recorded step is -eta times the gradient and updates chain', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const box1 = await setUpdate(page, 1);
  const grad = num(await value(box1, 'grad'));
  const deltaText = await box1.locator('[data-value="delta"]').locator('..').innerText();
  expect(deltaText).toContain('✓ −η·ḡ, checked here');
  const delta = num(await value(box1, 'delta'));
  expect(Math.abs(delta - -0.1 * grad)).toBeLessThanOrEqual(1e-6);
  const one = await beforeAfter(box1);
  expect(Math.abs(one.before + delta - one.after)).toBeLessThanOrEqual(0.0002);
  await expect(sectionD(page).locator('[data-value="update-number"]')).toHaveText(/^1 of 180$/);

  const box2 = await setUpdate(page, 2);
  await expect(sectionD(page).locator('[data-value="update-number"]')).toHaveText('2 of 180');
  const two = await beforeAfter(box2);
  expect(two.before).toBe(one.after);
});

test('Trace explorer appears after training', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  await expect(page.getByText('The record of run')).toBeVisible();
  await expect(page.getByText('Network 1×8×8 → convolution 4 × 3×3 (relu)').first()).toBeVisible();
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await train(page);
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

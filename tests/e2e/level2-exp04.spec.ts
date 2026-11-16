/**
 * Level 2, Experiment 04 (backpropagation), end to end in the built app. Expected numbers are computed here by
 * hand, independently of the engine, and compared with what the page shows.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-2/experiment-04';
const set = async (page: Page, control: string, value: string): Promise<void> => {
  const field = page.locator(`[data-control="${control}:exact"]`);
  await field.fill(value);
  await field.press('Enter');
};
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const f = (v: number, d: number): string => v.toFixed(d).replace(/^-/, '−');
const fs = (v: number, d: number): string => (v >= 0 ? '+' : '') + f(v, d);
const num = (text: string): number => parseFloat(text.replace('−', '-'));

const tableValue = (page: Page, row: string): Locator =>
  page.locator('th', { hasText: row }).locator('xpath=following-sibling::td[1]');
const box = (page: Page, title: string): Locator =>
  page.getByText(title, { exact: true }).locator('xpath=following-sibling::div[1]');

const inspector = (page: Page): Locator =>
  page.locator('section[aria-label="Where a parameter’s gradient comes from"]');
const dd = (page: Page, term: string): Locator =>
  inspector(page).locator('dt', { hasText: term }).locator('xpath=following-sibling::dd[1]');
const phase = (page: Page): Locator => page.locator('.lv-callout strong').first();

const train = async (page: Page): Promise<void> => {
  await page.locator('[data-control="c:train"]').click();
  await expect(page.locator('.lv-where').first()).toContainText('Epoch 1 of 10 · example 1 of 4', {
    timeout: 60_000,
  });
};

test('Part A: the chain rule rows match the hand-computed rates at x = 1.5', async ({ page }) => {
  await page.goto(URL);
  await set(page, 'a:x', '1.5');
  const g = 1.5 * 1.5;
  const dgdx = 2 * 1.5;
  const dydg = sigmoid(g) * (1 - sigmoid(g));
  const product = dgdx * dydg;
  await expect(tableValue(page, 'Local rate dg/dx (= 2x)')).toHaveText('3.0000');
  await expect(tableValue(page, 'Local rate dg/dx (= 2x)')).toHaveText(f(dgdx, 4));
  await expect(tableValue(page, 'Local rate dy/dg (= σ′(g))')).toHaveText(f(dydg, 4));
  await expect(tableValue(page, 'Their product, multiplied here')).toHaveText(f(product, 4));
  await expect(tableValue(page, 'dy/dx, computed by the engine for the whole chain')).toHaveText(
    f(product, 4),
  );
});

test('Part B: backward boxes match by hand at the defaults, and target 1 flips the sign of dL/dz', async ({
  page,
}) => {
  await page.goto(URL);
  const w = -1.5;
  const b = 1;
  const x = -2;
  const compute = (y: number): { dLda: number; dLdz: number; dLdw: number; dLdb: number } => {
    const a = sigmoid(w * x + b);
    return {
      dLda: -y / a + (1 - y) / (1 - a),
      dLdz: a - y,
      dLdw: (a - y) * x,
      dLdb: a - y,
    };
  };
  const check = async (y: number): Promise<void> => {
    const e = compute(y);
    await expect(box(page, '∂L/∂a (from the loss)')).toHaveText(fs(e.dLda, 4));
    await expect(box(page, '∂L/∂z = ∂L/∂a × σ′(z)')).toHaveText(fs(e.dLdz, 4));
    await expect(box(page, '∂L/∂w = ∂L/∂z × x')).toHaveText(fs(e.dLdw, 4));
    await expect(box(page, '∂L/∂b = ∂L/∂z × 1')).toHaveText(fs(e.dLdb, 4));
  };
  await check(0);
  expect(compute(0).dLdz).toBeGreaterThan(0);
  await page.locator('label:has([data-control="b:y:1"])').click();
  expect(compute(1).dLdz).toBeLessThan(0);
  await check(1);
});

test('Part C order: forward and loss come before backward; apply needs the end of the backward pass', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  const apply = page.locator('[data-control="c:apply"]');
  // The record opens "Between examples"; stepping then moves through the forward pass and the loss.
  await expect(phase(page)).toHaveText('Between examples');
  let reached = false;
  let seenForward = false;
  for (let i = 0; i < 80 && !reached; i++) {
    const callout = page.locator('.lv-callout').first();
    const before = (await callout.textContent()) ?? '';
    await page.locator('[data-control="c:step"]').click();
    // A step is asynchronous: wait until the callout shows the new instruction before reading its phase.
    await expect(callout).not.toHaveText(before);
    const text = (await phase(page).innerText()).trim();
    if (text.startsWith('← Backward pass')) {
      reached = true;
    } else {
      expect(text).toMatch(/^(→ Forward pass|→ Loss)/);
      if (text.startsWith('→ Forward pass')) seenForward = true;
    }
  }
  expect(seenForward).toBe(true);
  expect(reached).toBe(true);
  await expect(apply).toBeDisabled();
  await page.locator('[data-control="c:to-backward-end"]').click();
  await expect(apply).toBeEnabled();
});

test('Part C replay: replaying clears the view and the same backward pass reads back identically', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await page.locator('[data-control="c:to-backward-end"]').click();
  await inspector(page).locator('select[data-control="c:param"]').selectOption('6');
  const before = (await inspector(page).locator('dl').textContent()) ?? '';
  await page.locator('[data-control="c:replay"]').click();
  await expect(inspector(page)).toContainText('Not computed yet at this step');
  await page.locator('[data-control="c:to-backward-end"]').click();
  await expect(inspector(page).locator('dl')).toHaveText(before);
});

test('Part C first example: gradients match the hand computation; an input of 0 gives gradient 0', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await page.locator('[data-control="c:to-backward-end"]').click();
  await expect(page.locator('.lv-where').first()).toHaveText(
    'Epoch 1 of 10 · example 1 of 4 · x = (0, 0), target 0',
  );
  await inspector(page).locator('select[data-control="c:param"]').selectOption('6');
  const a1 = [sigmoid(0.1), sigmoid(-0.1)];
  const a2 = sigmoid(0.9 * a1[0] - 0.7 * a1[1] + 0.05);
  await expect(dd(page, 'Incoming gradient ∂L/∂z')).toHaveText(fs(a2, 4));
  await expect(dd(page, 'Recorded gradient')).toContainText(fs(a1[0] * a2, 4));
  await expect(dd(page, 'Recorded gradient')).toContainText('✓ the same');
  await inspector(page).locator('select[data-control="c:param"]').selectOption('0');
  await expect(dd(page, 'Recorded gradient')).toContainText('✓ the same');
  expect(num(await dd(page, 'Recorded gradient').innerText())).toBe(0);
});

test('Part C update: applying shows four updated parameters and Next example moves to example 2', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await page.locator('[data-control="c:to-backward-end"]').click();
  await page.locator('[data-control="c:apply"]').click();
  const table = page.locator('[aria-label="The update of this example"]');
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await page.locator('[data-control="c:next-example"]').click();
  await expect(page.locator('.lv-where').first()).toContainText('example 2 of 4');
});

test('Tour: moving the Part A point advances from step 1 to step 2', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 5')).toBeVisible();
  await set(page, 'a:x', '1');
  await expect(page.getByText('step 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 5')).toHaveCount(0);
});

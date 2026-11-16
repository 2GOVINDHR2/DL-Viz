/**
 * Level 2, Stage 2 (Experiments 01 and 02), end to end in the built app. Expected numbers are computed here by
 * hand, independently of the engine, and compared with what the page shows.
 */
import { expect, test, type Page } from '@playwright/test';

const set = async (page: Page, control: string, value: string): Promise<void> => {
  const field = page.locator(`[data-control="${control}:exact"]`);
  await field.fill(value);
  await field.press('Enter');
};
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const f = (v: number, d: number): string => v.toFixed(d).replace(/^-/, '−');

test('Level 2 is reachable from the levels page; 01–04 are open, 05 is listed as in preparation', async ({
  page,
}) => {
  await page.goto('/#/levels');
  await page.locator('[data-control="open-level-2"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('How Neural Networks Learn');
  const items = page.locator('.lv-path-item');
  await expect(items).toHaveCount(5);
  for (const k of [0, 1, 2, 3]) await expect(items.nth(k).getByRole('link')).toBeVisible();
  for (const k of [4]) {
    await expect(items.nth(k).getByRole('link')).toHaveCount(0);
    await expect(items.nth(k)).toContainText('In preparation');
  }
  await page.locator('[data-control="start-level-2"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Forward Propagation: From Input to Prediction',
  );
  await expect(page.locator('.lv-exp-kicker')).toHaveText('Level 2 · Experiment 01');
  await page.locator('[data-control="next-experiment"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Loss Functions: Measuring Prediction Error',
  );
  await expect(page.locator('[data-control="next-experiment"]')).toHaveAttribute(
    'href',
    '#/level-2/experiment-03',
  );
  await page.locator('[data-control="next-experiment"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Derivatives and Gradient Descent: How Parameters Learn',
  );
  await expect(page.locator('[data-control="next-experiment"]')).toHaveAttribute(
    'href',
    '#/level-2/experiment-04',
  );
  await page.locator('[data-control="next-experiment"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Backpropagation: How Errors Travel Through a Network',
  );
  // The last open experiment leads back to the overview, not to an unbuilt one.
  await expect(page.locator('[data-control="next-experiment"]')).toHaveAttribute('href', '#/level-2');
  // Level 1 is untouched.
  await page.goto('/#/level-1/experiment-01');
  await expect(page.locator('.lv-exp-kicker')).toHaveText('Level 1 · Experiment 01');
});

test('Experiment 01: the network steps forward and back, and its prediction matches the network computed by hand', async ({
  page,
}) => {
  await page.goto('/#/level-2/experiment-01');
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 5')).toBeVisible();
  await set(page, 'a:x1', '2');
  await expect(page.getByText('step 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();

  // Defaults: x = (1, 0); hidden W (engine layout) [0.8, −0.5, 0.2, 0.9], b [0, 0.1]; output W [1.2, −0.7], b 0.05.
  const a1 = [sigmoid(1 * 0.8 + 0 * 0.2 + 0), sigmoid(1 * -0.5 + 0 * 0.9 + 0.1)];
  const prediction = sigmoid(a1[0] * 1.2 + a1[1] * -0.7 + 0.05);
  await expect(page.getByText('Step 1 of 3')).toBeVisible();
  await page.locator('[data-control="c:next"]').click();
  await expect(page.getByText('Step 2 of 3')).toBeVisible();
  await page.locator('[data-control="c:detail:operation"]').check({ force: true });
  await expect(page.getByText(/Step \d of 7/)).toBeVisible();
  await page.locator('[data-control="c:back"]').click();
  await page.locator('[data-control="c:end"]').click();
  await expect(page.getByText(`Prediction: ${f(prediction, 3)}`)).toBeVisible();
  await page.getByText('Show the matrix form').click();
  await expect(page.getByText('Row 1 is neuron 1:').first()).toBeVisible();
});

test('Experiment 02: MSE, the clipping note, and the live question follow what is on screen', async ({
  page,
}) => {
  await page.goto('/#/level-2/experiment-02');
  // Defaults: predictions (0.9, 0.2, 0.6, 0.4), targets (1, 0, 1, 0): MSE = (0.01 + 0.04 + 0.16 + 0.16)/4.
  await expect(page.getByText(`MSE = ${f(0.37 / 4, 4)}`)).toBeVisible();
  for (const [k, v] of [
    ['b:p1', '1'],
    ['b:p2', '0'],
    ['b:p3', '1'],
    ['b:p4', '0'],
  ])
    await set(page, k, v);
  await expect(page.getByText('MSE = 0.0000')).toBeVisible();
  await expect(page.locator('[data-question="l-live-mse"] legend')).toBeVisible();
  await page
    .locator('[data-question="l-live-mse"] label')
    .filter({ hasText: /^0\.000$/ })
    .click();
  await expect(page.locator('[data-question="l-live-mse"]')).toContainText('Correct');
  await set(page, 'e:z', '20');
  await page.locator('[data-tour="logit-chain"] label').filter({ hasText: /^0$/ }).click();
  await expect(page.locator('[data-tour="logit-chain"] [role="status"]')).toContainText(
    'clips probabilities',
  );
  await expect(page.locator('[data-tour="logit-chain"]')).toContainText(f(-Math.log(1e-7), 4));
});

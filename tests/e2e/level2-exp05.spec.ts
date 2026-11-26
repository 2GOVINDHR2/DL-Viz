/**
 * Level 2, Experiment 05 (automatic differentiation), end to end in the built app. Expected numbers are computed
 * here by hand, independently of the engine, and compared with what the page shows.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-2/experiment-05';
const set = async (page: Page, control: string, value: string): Promise<void> => {
  const field = page.locator(`[data-control="${control}:exact"]`);
  await field.fill(value);
  await field.press('Enter');
};
const sigmoid = (z: number): number => 1 / (1 + Math.exp(-z));
const f = (v: number, d: number): string => v.toFixed(d).replace(/^-/, '−');
const fs = (v: number, d: number): string => (v >= 0 ? '+' : '') + f(v, d);
const num = (text: string): number => parseFloat(text.replace('−', '-').replace('+', ''));

const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5d"]');
const sectionE = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5e"]');
const sectionF = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5f"]');
const control = (page: Page, c: string): Locator => page.locator(`[data-control="${c}"]`);
const narration = (page: Page): Locator => sectionB(page).locator('[data-narration]');
const cell = (page: Page, input: string, col: number): Locator =>
  sectionC(page).locator(`tr[data-input="${input}"] td`).nth(col);

test('Part B: the forward pass fills values, the reverse pass fills gradients, and Back removes them', async ({
  page,
}) => {
  await page.goto(URL);
  const b = sectionB(page);
  await expect(narration(page)).toHaveText('Nothing has been computed yet: only the inputs have values.');
  await expect(b).toContainText('Position 0 of 5 · forward pass');
  await control(page, 'b:step').click();
  await expect(narration(page)).toContainText(
    'Forward step 1 of 2: the + node takes x₁ = 2.0000 and x₂ = −1.0000 and computes 1.0000.',
  );
  await expect(b).toContainText('Position 1 of 5');
  for (const p of [2, 3]) {
    await control(page, 'b:step').click();
    await expect(b).toContainText(`Position ${p} of 5`);
  }
  await expect(narration(page)).toContainText('The reverse pass starts at the output with ∂f/∂f = 1');
  await expect(b).not.toContainText('∂f/∂x₃');
  await control(page, 'b:step').click();
  await expect(b).toContainText('Position 4 of 5');
  await expect(narration(page)).toContainText('Reverse step 1 of 2');
  // The × node sends x₃ = 3 to the + node and the + node's value (2 + −1 = 1) to x₃.
  await expect(narration(page)).toContainText('+1.0000 × its other input (x₃, 3.0000) = +3.0000');
  await expect(narration(page)).toContainText(
    'to x₃, +1.0000 × its other input (the + node’s value, 1.0000) = +1.0000',
  );
  await expect(b).toContainText('∂f/∂x₃ = +1.000');
  await control(page, 'b:back').click();
  await expect(b).toContainText('Position 3 of 5');
  await expect(b).not.toContainText('∂f/∂x₃');
});

test('Part B: with changed inputs the reverse pass gives the other input as each gradient', async ({
  page,
}) => {
  await page.goto(URL);
  await set(page, 'a:x1', '0.5');
  await set(page, 'a:x2', '0.25');
  await set(page, 'a:x3', '-4');
  const b = sectionB(page);
  await expect(b).not.toContainText('∂f/∂x₁ =');
  await control(page, 'b:end').click();
  await expect(b).toContainText('Position 5 of 5');
  // ∂f/∂x₁ = x₃ = −4 and ∂f/∂x₃ = x₁ + x₂ = 0.75.
  await expect(b.locator('g[data-node="0"]')).toContainText(`∂f/∂x₁ = ${fs(-4, 3)}`);
  await expect(b.locator('g[data-node="2"]')).toContainText(`∂f/∂x₃ = ${fs(0.5 + 0.25, 3)}`);
  await expect(b.locator('g[data-node="3"]')).toContainText(`∂f/∂(+) = ${fs(-4, 3)}`);
});

test('Part C: the product expression is exact; the sigmoid with h = 1 drifts from autodiff', async ({
  page,
}) => {
  await page.goto(URL);
  await expect(cell(page, 'x₁', 0)).toHaveText('+3.000000');
  await expect(cell(page, 'x₁', 1)).toHaveText('+3.000000');
  await expect(cell(page, 'x₃', 0)).toHaveText('+1.000000');
  await expect(cell(page, 'x₃', 1)).toHaveText('+1.000000');
  await expect(cell(page, 'x₁', 2)).toHaveText(/^0(\.0)?(e[+−]?\d+)?$|e−(1[0-9]|[7-9])$/);
  await page.locator('label:has([data-control="a:expr:sigmoid"])').click();
  await page.locator('label:has([data-control="c:h:1"])').click();
  const [x1, x2, x3] = [2, -1, 3];
  const p = (x1 + x2) * x3;
  const grad = sigmoid(p) * (1 - sigmoid(p)) * x3;
  const fd = (sigmoid((x1 + 1 + x2) * x3) - sigmoid((x1 - 1 + x2) * x3)) / 2;
  await expect(cell(page, 'x₁', 0)).toHaveText(fs(grad, 6));
  await expect(cell(page, 'x₁', 1)).toHaveText(fs(fd, 6));
  // The gap shown, by hand: |estimate − exact| ≈ 0.11, well above 0.01.
  await expect(cell(page, 'x₁', 2)).toHaveText(
    Math.abs(fd - grad)
      .toExponential(1)
      .replace('-', '−'),
  );
});

test('Part D: two contributions arrive at x and the engine adds them', async ({ page }) => {
  await page.goto(URL);
  const d = sectionD(page);
  const rows = d.locator('tbody tr');
  await expect(rows.nth(0).locator('td').last()).toHaveText(fs(1, 4));
  await expect(rows.nth(1).locator('td').last()).toHaveText(fs(3, 4));
  const total = d.locator('tbody tr').last().locator('td');
  await expect(total).toHaveText(fs(1 + 3, 4));
  await set(page, 'd:y', '-1');
  await expect(rows.nth(1).locator('td').last()).toHaveText(fs(-1, 4));
  await expect(rows.nth(0).locator('td').last()).toHaveText(fs(1, 4));
  await expect(total).toHaveText(/^[+−]?0\.0000$/);
  expect(num(await total.innerText())).toBe(0);
});

test('Part E: the counts follow the parameter count of each network', async ({ page }) => {
  await page.goto(URL);
  const e = sectionE(page);
  const counts = async (n: number): Promise<void> => {
    await expect(e.locator('[data-count="forward-passes"]')).toHaveText(String(n));
    await expect(e.locator('[data-count="backward-passes"]')).toHaveText('1');
    await expect(e.locator('[data-count="gradient-values"]')).toHaveText(String(n));
  };
  // Parameters: inputs × units + units, per layer.
  await page.locator('label:has([data-control="e:net:2-2-1"])').click();
  await counts(2 * 2 + 2 + (2 * 1 + 1));
  await page.locator('label:has([data-control="e:net:2-3-1"])').click();
  await counts(2 * 3 + 3 + (3 * 1 + 1));
  await page.locator('label:has([data-control="e:net:2-16-16-1"])').click();
  await counts(2 * 16 + 16 + (16 * 16 + 16) + (16 * 1 + 1));
});

test('Part F: choosing a step shows its links, following a link moves the choice, switching example clears it', async ({
  page,
}) => {
  await page.goto(URL);
  const panel = sectionF(page).locator('section[aria-label="The chosen step"]');
  await expect(panel).toContainText('Choose a step in the graph');
  await page.locator('label:has([data-control="f:example:1"])').click();
  await page.locator('[data-record-node="42"]').click();
  await expect(panel.getByRole('heading')).toHaveText('Step #42: u¹');
  await expect(panel.locator('[data-list="uses"]')).toContainText('#29 W¹');
  await expect(panel.locator('[data-list="uses"]')).toContainText('as its weight');
  await expect(panel.locator('[data-list="uses"]')).toContainText('#41 x, y');
  await expect(panel.locator('[data-list="uses"]')).toContainText('as its input');
  await panel.locator('[data-list="uses"] button', { hasText: '#29 W¹' }).click();
  await expect(panel.getByRole('heading')).toHaveText('Step #29: W¹');
  await expect(panel).toContainText('Made before this example: the update after example 1 (step #29)');
  await page.locator('label:has([data-control="f:example:0"])').click();
  // The panel shows the prompt instead of a chosen step (the two never show together).
  await expect(panel).toContainText('Choose a step in the graph');
});

test('Part F keyboard: Enter on a focused graph node chooses that step', async ({ page }) => {
  await page.goto(URL);
  const panel = sectionF(page).locator('section[aria-label="The chosen step"]');
  await expect(panel).toContainText('Choose a step in the graph');
  await page.locator('[data-record-node="7"]').focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('heading')).toHaveText('Step #7: u¹');
});

test('Tour: changing x₁ in Part A advances from step 1 to step 2', async ({ page }) => {
  await page.goto(URL);
  await control(page, 'tour:start').click();
  await expect(page.getByText('step 1 of 5')).toBeVisible();
  await set(page, 'a:x1', '1');
  await expect(page.getByText('step 2 of 5')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 5')).toHaveCount(0);
});

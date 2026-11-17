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
  // With target 0 the output is too high: ∂L/∂z is positive. With target 1 it is too low: negative.
  await expect(box(page, '∂L/∂z = ∂L/∂a × σ′(z)')).toHaveText(/^\+/);
  await page.locator('label:has([data-control="b:y:1"])').click();
  await expect(box(page, '∂L/∂z = ∂L/∂a × σ′(z)')).toHaveText(/^−/);
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
  // Step until the backward pass begins, recording the phase of every step: F(orward), L(oss), B(ackward).
  const seen: string[] = [];
  const callout = page.locator('.lv-callout').first();
  while (seen.at(-1) !== 'B' && seen.length < 80) {
    const before = (await callout.textContent()) ?? '';
    await page.locator('[data-control="c:step"]').click();
    // A step is asynchronous: wait until the callout shows the new instruction before reading its phase.
    await expect(callout).not.toHaveText(before);
    const text = (await phase(page).innerText()).trim();
    seen.push(
      text.startsWith('→ Forward pass')
        ? 'F'
        : text.startsWith('→ Loss')
          ? 'L'
          : text.startsWith('← Backward pass')
            ? 'B'
            : `?${text}`,
    );
  }
  // Every forward step, then every loss step, then the first backward step: nothing out of order.
  expect(seen.join('')).toMatch(/^F+L+B$/);
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

// ------------------------------------------------------------------ Stage 4 review: navigation and consistency

const where = (page: Page): Locator => page.locator('.lv-where').first();
const control = (page: Page, c: string): Locator => page.locator(`[data-control="${c}"]`);

/** Finishes the example at the cursor: to the end of its backward pass, then its update. */
const finishExample = async (page: Page): Promise<void> => {
  await control(page, 'c:to-backward-end').click();
  await expect(control(page, 'c:apply')).toBeEnabled();
  await control(page, 'c:apply').click();
  await expect(phase(page)).toHaveText(/^⇄ Update applied/);
};

test('Part C examples: next and previous cross the epoch boundary and land on a real example', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await expect(control(page, 'c:prev-example')).toBeDisabled();
  for (let k = 1; k <= 4; k++) {
    await expect(where(page)).toHaveText(`Epoch 1 of 10 · example ${k} of 4`);
    await finishExample(page);
    if (k < 4) await control(page, 'c:next-example').click();
  }
  // After the last example of the epoch, "Next example" skips the end-of-epoch check and opens epoch 2.
  await control(page, 'c:next-example').click();
  await expect(where(page)).toHaveText('Epoch 2 of 10 · example 1 of 4');
  await expect(phase(page)).toHaveText('Between examples');
  await control(page, 'c:prev-example').click();
  await expect(where(page)).toHaveText('Epoch 1 of 10 · example 4 of 4');
  await control(page, 'c:prev-example').click();
  await expect(where(page)).toHaveText('Epoch 1 of 10 · example 3 of 4');
  // An earlier example is replayed from its record: its backward pass reads back the same gradient as the first time.
  await control(page, 'c:to-backward-end').click();
  await expect(where(page)).toHaveText('Epoch 1 of 10 · example 3 of 4 · x = (1, 0), target 1');
});

test('Part C after the update: the hidden-layer explanation keeps the output weight the backward pass used', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  for (let k = 0; k < 3; k++) {
    await finishExample(page);
    await control(page, 'c:next-example').click();
  }
  await control(page, 'c:to-backward-end').click();
  await inspector(page).locator('select[data-control="c:param"]').selectOption('1');
  const note = inspector(page).locator('p', { hasText: 'From the output neuron' });
  // The maths is hidden until asked for.
  await expect(note).toBeHidden();
  await inspector(page).getByText('Where the hidden neuron’s incoming gradient came from').click();
  await expect(note).toBeVisible();
  const before = (await note.textContent()) ?? '';
  // Its first factor times its second gives its third, by hand.
  const [w2, dz2, da1] = [...before.matchAll(/[+−]?\d+\.\d{4}/g)].slice(0, 3).map((m) => num(m[0]));
  expect(Math.abs(w2 * dz2 - da1)).toBeLessThan(2e-4);
  await expect(page.locator('[data-note="after-update"]')).toHaveCount(0);
  await control(page, 'c:apply').click();
  await expect(page.locator('[data-note="after-update"]')).toBeVisible();
  // The update changed the drawn weights, but the explanation still uses the weight of this example's pass.
  await expect(note).toHaveText(before);
});

test('Part C and the explorer stay in step: either one moves the other, and the explorer’s Start is kept', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  const position = control(page, 'trace:position');
  // Part C's Step moves the shared cursor: the explorer shows the step Part C names.
  await control(page, 'c:step').click();
  await expect(phase(page)).not.toHaveText('Between examples');
  const step = /step #(\d+)/.exec((await page.locator('.lv-callout').first().textContent()) ?? '')![1];
  await expect(position).toHaveValue(step);
  // The explorer's Start goes to the beginning of the record, and stays there.
  await control(page, 'trace:start').click();
  await expect(position).toHaveValue('-1');
  await expect(where(page)).toHaveText('Before the first example: the starting values');
  await page.waitForTimeout(500);
  await expect(position).toHaveValue('-1');
  // The explorer's Next moves Part C.
  await control(page, 'trace:next').click();
  await expect(position).not.toHaveValue('-1');
  await expect(phase(page)).toHaveText('Starting values');
});

test('Part C wording: the explorer describes one update per example, not a batch average', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await finishExample(page);
  const explorer = page.locator('section', { hasText: 'The record of run' }).last();
  await expect(explorer).toContainText('one update for this example');
  await expect(explorer).not.toContainText('whole batch');
  await expect(explorer).not.toContainText('Average loss of this batch');
});

test('Part C after another experiment’s run: it shows only its own network’s run, and starts it at example 1', async ({
  page,
}) => {
  // Experiment 03 trains its neuron in the same shared trace store; then the learner moves on to Experiment 04.
  await page.goto('/#/level-2/experiment-03');
  await page.locator('[data-control="e:train"]').click();
  await expect(page.getByText('The first update, read from the record')).toBeVisible({ timeout: 60_000 });
  await page.goto(URL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Backpropagation: How Errors Travel Through a Network',
  );
  await expect(control(page, 'c:train')).toHaveText('Run the network');
  await control(page, 'c:train').click();
  await expect(where(page)).toHaveText('Epoch 1 of 10 · example 1 of 4', { timeout: 60_000 });
  await expect(control(page, 'trace:position')).not.toHaveValue('-1');
});

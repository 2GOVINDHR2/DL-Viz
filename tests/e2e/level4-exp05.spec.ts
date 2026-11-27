/**
 * Level 4, Experiment 05 (LSTM and GRU), end to end in the built app. Every relation is checked on values the page
 * shows, never on numbers computed from the engine. The plain recurrent comparison row is deliberately not asserted:
 * its loss differs between JavaScript engines.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-05';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-5a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-5b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-5c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-5d"]');

const train = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:train"]').click();
  await expect(sectionA(page).locator('[data-control="a:example"]')).toBeVisible({ timeout: 120_000 });
  await expect(sectionA(page).locator('table[data-lstm-overview]')).toBeVisible({ timeout: 120_000 });
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

/** The numbers of a vector written "(a, b, c)". */
const vector = (text: string): number[] => {
  const m = /\(([^)]*)\)/.exec(text);
  expect(m, text).not.toBeNull();
  return m![1].split(',').map((s) => num(s.trim()));
};

const setStep = async (section: Locator, control: string, n: number): Promise<void> => {
  await section.locator(`[data-control="${control}"]`).fill(String(n));
};

test('LSTM: overview, gates and the cell state add up', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await expect(sectionB(page).getByText('Train and record the LSTM in Part A first.')).toBeVisible();
  await train(page);
  await expect(sectionA(page).locator('table[data-lstm-overview] tbody tr')).toHaveCount(6);
  for (const t of [1, 2, 3, 4, 5, 6]) {
    await expect(sectionA(page).locator(`table[data-lstm-overview] tr[data-t="${t}"]`)).toHaveCount(1);
  }

  const box = sectionB(page).locator('dl[data-lstm-step]');
  await expect(box).toHaveAttribute('data-lstm-step', '2', { timeout: 60_000 });
  await expect(box.locator('[data-value="c"]')).toContainText('✓ checked here');
  await expect(box.locator('[data-value="h"]')).toContainText('✓ checked here');

  const rows = sectionB(page).locator('table[data-gate-table] tbody tr');
  await expect(rows).toHaveCount(3);
  const c = vector(await value(box, 'c'));
  for (let j = 0; j < 3; j++) {
    const cells = await rows.nth(j).locator('td').allInnerTexts();
    const kept = num(cells[0].trim());
    const written = num(cells[1].trim());
    const cell = num(cells[2].trim());
    expect(Math.abs(kept + written - cell)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(cell - c[j])).toBeLessThanOrEqual(0.002);
  }

  await setStep(sectionA(page), 'a:step', 1);
  await expect(box).toHaveAttribute('data-lstm-step', '1');
  await expect(box.locator('[data-value="c"]')).toContainText('c₀ = 0');
  for (const t of [1, 2, 3, 4, 5, 6]) {
    await setStep(sectionA(page), 'a:step', t);
    await expect(box).toHaveAttribute('data-lstm-step', String(t));
    for (const name of ['f', 'i', 'o']) {
      const v = vector(await value(box, name));
      expect(v).toHaveLength(3);
      for (const x of v) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(1);
      }
    }
    const g = vector(await value(box, 'g'));
    expect(g).toHaveLength(3);
    for (const x of g) {
      expect(x).toBeGreaterThan(-1);
      expect(x).toBeLessThan(1);
    }
  }
  await expect(sectionB(page).locator('table[data-cell-path] tbody tr')).toHaveCount(5);
});

test('GRU: gates, no cell state, and the LSTM record is replaced', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await sectionC(page).locator('[data-control="c:train"]').click();
  const box = sectionC(page).locator('dl[data-gru-step]');
  await expect(box).toBeVisible({ timeout: 120_000 });
  await setStep(sectionC(page), 'c:step', 1);
  await expect(box).toHaveAttribute('data-gru-step', '1');
  expect(await value(box, 'r')).toMatch(/^—/);
  await expect(box.locator('[data-value="gh"]')).toContainText('✓ checked here');
  await setStep(sectionC(page), 'c:step', 4);
  await expect(box).toHaveAttribute('data-gru-step', '4');
  expect(vector(await value(box, 'r'))).toHaveLength(3);
  await expect(box.locator('[data-value="gh"]')).toContainText('✓ checked here');
  await expect(box.locator('[data-value="no-cell"]')).toContainText('none: a GRU carries everything in hₜ');
  const summary = page.locator('[data-value="recorded-summary"]');
  await expect(summary).toContainText('GRU');
  await expect(summary).toContainText('49 parameters');
  await expect(sectionB(page).getByText('Train and record the LSTM in Part A first.')).toBeVisible();
});

test('Part D: parameter counts and the comparison across seeds', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  const cells = (kind: string): Locator => sectionD(page).locator(`tr[data-kind="${kind}"] td`);
  await expect(cells('rnn').first()).toHaveText('29');
  await expect(cells('lstm').first()).toHaveText('101');
  await expect(cells('gru').first()).toHaveText('77');
  const lossText = async (): Promise<string[]> => [
    (await cells('rnn').last().innerText()).trim(),
    (await cells('lstm').last().innerText()).trim(),
    (await cells('gru').last().innerText()).trim(),
  ];

  await sectionD(page).locator('label:has([data-control="d:seed:1"])').click();
  await sectionD(page).locator('[data-control="d:compare"]').click();
  await expect(cells('lstm').last()).not.toHaveText('—', { timeout: 120_000 });
  await expect(cells('gru').last()).not.toHaveText('—', { timeout: 120_000 });
  await expect(cells('rnn').last()).not.toHaveText('—', { timeout: 120_000 });
  const first = await lossText();
  expect(num(first[1])).toBeLessThan(0.1);
  expect(num(first[2])).toBeLessThan(0.1);

  await sectionD(page).locator('label:has([data-control="d:seed:2"])').click();
  await sectionD(page).locator('[data-control="d:compare"]').click();
  await expect
    .poll(async () => (await lossText()).some((t, k) => t !== first[k]), { timeout: 120_000 })
    .toBe(true);
  await expect(cells('lstm').first()).toHaveText('101');
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await train(page);
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

test('Check: the live question accepts the recorded cell state', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  const q = page.locator('[data-question="l4-live-cell"]');
  await expect(q.getByText('Train and record the LSTM in Part A', { exact: false })).toBeVisible();
  await train(page);
  const box = sectionB(page).locator('dl[data-lstm-step]');
  await expect(box).toHaveAttribute('data-lstm-step', '2', { timeout: 60_000 });
  const c0 = vector(await value(box, 'c'))[0];
  await expect(q.getByText('time step 2, first unit')).toBeVisible({ timeout: 60_000 });
  const options = q.locator('label.lv-option');
  const texts = await options.allInnerTexts();
  let best = 0;
  texts.forEach((t, k) => {
    if (Math.abs(num(t.trim()) - c0) < Math.abs(num(texts[best].trim()) - c0)) best = k;
  });
  expect(Math.abs(num(texts[best].trim()) - c0)).toBeLessThanOrEqual(0.0006);
  await options.nth(best).click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
});

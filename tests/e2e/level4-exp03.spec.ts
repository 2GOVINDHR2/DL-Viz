/**
 * Level 4, Experiment 03 (recurrent networks), end to end in the built app. Every relation is checked on values
 * the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-03';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-3a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-3b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-3c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-3d"]');

const train = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:train"]').click();
  await expect(sectionA(page).locator('[data-control="a:example"]')).toBeVisible({ timeout: 90_000 });
  await expect(sectionA(page).locator('table[data-unrolled]')).toBeVisible({ timeout: 90_000 });
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

/** The numbers of a vector written "(a, b, c, d)". */
const vector = (text: string): number[] => {
  const m = /\(([^)]*)\)/.exec(text);
  expect(m, text).not.toBeNull();
  return m![1].split(',').map((s) => num(s.trim()));
};

const showExample = async (page: Page, index: number, epoch: number): Promise<Locator> => {
  await sectionA(page)
    .locator('[data-control="a:example"]')
    .selectOption({ value: String(index) });
  await sectionA(page).locator('[data-control="a:epoch"]').fill(String(epoch));
  await expect(sectionA(page).locator(`table[data-unrolled="${index}"]`)).toBeVisible({ timeout: 90_000 });
  const box = sectionD(page).locator(`[data-prediction="${index}"]`);
  await expect(box).toBeVisible({ timeout: 90_000 });
  await expect(sectionA(page).locator('table[data-unrolled] caption')).toContainText(`epoch ${epoch}:`);
  return box;
};

const cellsOf = async (row: Locator): Promise<string[]> => row.locator('td').allInnerTexts();

const tableH = async (page: Page): Promise<number[][]> => {
  const cells = await cellsOf(sectionA(page).locator('table[data-unrolled] tr[data-row="h"]'));
  return cells.map((c) =>
    c
      .trim()
      .split(/\n/)
      .map((s) => num(s.trim())),
  );
};

const step = async (page: Page, n: number): Promise<Locator> => {
  const box = sectionB(page).locator('[data-tour="rn-step"]');
  while (Number(await box.getAttribute('data-step')) < n) {
    await sectionB(page).locator('[data-control="b:next"]').click();
  }
  await expect(box).toHaveAttribute('data-step', String(n));
  return box;
};

test('Part A: the unrolled table shows five inputs and five hidden states of four values in [-1, 1]', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  const table = sectionA(page).locator('table[data-unrolled]');
  await expect(table.locator('tr[data-row="x"] td')).toHaveCount(5);
  await expect(table.locator('tr[data-row="h"] td')).toHaveCount(5);
  for (const t of await cellsOf(table.locator('tr[data-row="x"]'))) {
    expect(Math.abs(num(t.trim()))).toBeLessThanOrEqual(1);
  }
  const h = await tableH(page);
  expect(h).toHaveLength(5);
  for (const col of h) {
    expect(col).toHaveLength(4);
    for (const v of col) {
      expect(Number.isNaN(v)).toBe(false);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  }
});

test('Part B: one time step is taken apart consistently, and stepping works', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const x = (await cellsOf(sectionA(page).locator('table[data-unrolled] tr[data-row="x"]'))).map((t) =>
    num(t.trim()),
  );
  const hTable = await tableH(page);
  const box = sectionB(page).locator('[data-tour="rn-step"]');
  await expect(box).toHaveAttribute('data-step', '1');
  expect(await value(box, 'hprev')).toMatch(/^h₀ = 0/);
  await expect(box.locator('[data-value="hu"]')).toHaveCount(0);
  await expect(box.locator('[data-value="sum"]')).toHaveCount(0);
  await expect(sectionB(page).locator('[data-control="b:prev"]')).toBeDisabled();
  expect(Math.abs(num(await value(box, 'x')) - x[0])).toBeLessThanOrEqual(0.006);

  await sectionB(page).locator('[data-control="b:next"]').click();
  await expect(box).toHaveAttribute('data-step', '2');
  expect(Math.abs(num(await value(box, 'x')) - x[1])).toBeLessThanOrEqual(0.006);
  const hprev = vector(await value(box, 'hprev'));
  expect(hprev).toHaveLength(4);
  hprev.forEach((v, j) => expect(Math.abs(v - hTable[0][j])).toBeLessThanOrEqual(0.006));
  const z = vector(await value(box, 'z'));
  const h = vector(await value(box, 'h'));
  z.forEach((v, j) => expect(Math.abs(Math.tanh(v) - h[j])).toBeLessThanOrEqual(1e-4));
  h.forEach((v, j) => expect(Math.abs(v - hTable[1][j])).toBeLessThanOrEqual(0.006));
  const xw = vector(await value(box, 'xw'));
  const hu = vector(await value(box, 'hu'));
  const sum = vector(await value(box, 'sum'));
  sum.forEach((v, j) => expect(Math.abs(xw[j] + hu[j] - v)).toBeLessThanOrEqual(2e-4));
  await expect(box.locator('[data-value="sum"]')).toContainText('✓ checked here');
  await expect(box.locator('[data-value="h"]')).toContainText('✓ checked here');

  for (let n = 3; n <= 5; n++) {
    await sectionB(page).locator('[data-control="b:next"]').click();
    await expect(box).toHaveAttribute('data-step', String(n));
  }
  await expect(sectionB(page).locator('[data-control="b:next"]')).toBeDisabled();
  await sectionB(page).locator('[data-control="b:prev"]').click();
  await expect(box).toHaveAttribute('data-step', '4');
});

test('Part C: every time step uses the same W and the same U', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const shared = await value(sectionC(page), 'shared');
  const m =
    /^All 5 time steps use W from instruction #(\d+); steps 2–5 use U from instruction #(\d+)\.$/.exec(
      shared,
    );
  expect(m, shared).not.toBeNull();
  await sectionC(page).getByText('Which recorded value each time step uses').click();
  const rows = sectionC(page).locator('details table tbody tr');
  await expect(rows).toHaveCount(5);
  for (let k = 0; k < 5; k++) {
    const cells = rows.nth(k).locator('td');
    await expect(cells.nth(0)).toHaveText(`#${m![1]}`);
    if (k === 0) await expect(cells.nth(1)).toContainText('h₀ = 0');
    else await expect(cells.nth(1)).toHaveText(`#${m![2]}`);
  }
});

test('Part D: label, prediction and loss agree for the first sequences at epoch 40', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  await train(page);
  for (const index of [0, 1, 2, 3]) {
    const box = await showExample(page, index, 40);
    const m = /^([−+]?[\d.]+)\s*→\s*label\s*([01])$/.exec(await value(box, 'seqsum'));
    expect(m).not.toBeNull();
    const sum = num(m![1]);
    const label = Number(m![2]);
    expect(label).toBe(sum > 0 ? 1 : 0);
    const p = num(await value(box, 'p'));
    expect(await value(box, 'prediction')).toBe(`${label} ✓ correct`);
    const lossText = await value(box, 'loss');
    expect(lossText).toContain('✓ checked here');
    const expected = label === 1 ? -Math.log(p) : -Math.log(1 - p);
    expect(Math.abs(num(lossText.split(/\s/)[0]) - expected)).toBeLessThanOrEqual(2e-3);
  }
  await expect(sectionD(page).locator('[data-value="accuracy"]')).toContainText(
    'After epoch 40: 100 % of the sequences correct.',
  );
  const late = num((await value(sectionD(page).locator('[data-prediction="3"]'), 'loss')).split(/\s/)[0]);
  expect(late).toBeGreaterThanOrEqual(0);

  const lossAt = async (epoch: number): Promise<number> => {
    const box = await showExample(page, 0, epoch);
    return num((await value(box, 'loss')).split(/\s/)[0]);
  };
  const end = await lossAt(40);
  const start = await lossAt(1);
  expect(start).toBeGreaterThan(end);
});

test('Show in the record moves the trace explorer to the same instruction', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  const show = sectionB(page).locator('[data-control="b:show"]');
  const label = (await show.innerText()) + ' ' + ((await show.getAttribute('aria-label')) ?? '');
  const id = /#(\d+)/.exec(label)![1];
  await show.click();
  await expect(page.locator('[data-control="trace:position"]')).toHaveValue(id);
});

test('Trace explorer appears after training', async ({ page }) => {
  await page.goto(URL);
  await train(page);
  await expect(page.getByText('The record of run')).toBeVisible();
  await expect(page.getByText('Network 5×1 → recurrent layer (4 hidden units)').first()).toBeVisible();
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

test('Check: the live memory question accepts the recorded hidden state', async ({ page }) => {
  await page.goto(URL);
  const q = page.locator('[data-question="l4-live-memory"]');
  await expect(q.getByText('Train the network in Part A first.')).toBeVisible();
  await train(page);
  const box = await step(page, 2);
  const first = (await value(box, 'h')).match(/\(([^,)]+)/)![1].trim();
  const text = first.startsWith('−') ? first : `+${first}`;
  await expect(q.getByText('In Part B, step 2 of the sequence shown')).toBeVisible({ timeout: 60_000 });
  const escaped = text.replace(/[+.]/g, '\\$&');
  await q
    .locator('label.lv-option', { hasText: new RegExp(`^\\s*${escaped}\\s*$`) })
    .first()
    .click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
  await expect(q.locator('.lv-feedback')).toContainText('as recorded');
});

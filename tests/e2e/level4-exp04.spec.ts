/**
 * Level 4, Experiment 04 (backpropagation through time), end to end in the built app. Every relation is checked
 * on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-04';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-4a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-4b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-4c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-4d"]');
const sectionE = (page: Page): Locator => page.locator('section[aria-labelledby="l4-4e"]');

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

const leadingNumber = (text: string): number => num(/^[−+-]?[\d.]+/.exec(text.trim())![0]);

test('Part B: the backward pass starts at t = 5 and walks back to t = 1', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  await train(page);
  const box = sectionB(page).locator('[data-tour="bp-backward"]');
  await expect(box).toHaveAttribute('data-back-step', '5', { timeout: 90_000 });
  expect(await value(box, 'back-step')).toBe('t = 5 (step 1 of the backward pass)');
  await expect(box.locator('table.lv-mgrid')).toBeVisible();
  await expect(box.locator('[data-value="dz"]')).toContainText('✓ checked here');
  expect(vector(await value(box, 'dh'))).toHaveLength(4);
  const dhPrev5 = vector(await value(box, 'dhprev'));
  expect(dhPrev5).toHaveLength(4);
  await expect(sectionB(page).locator('[data-control="b:later"]')).toBeDisabled();

  await sectionB(page).locator('[data-control="b:earlier"]').click();
  await expect(box).toHaveAttribute('data-back-step', '4');
  const dh4 = vector(await value(box, 'dh'));
  expect(dh4.map((v) => v.toFixed(4))).toEqual(dhPrev5.map((v) => v.toFixed(4)));

  for (const n of [3, 2, 1]) {
    await sectionB(page).locator('[data-control="b:earlier"]').click();
    await expect(box).toHaveAttribute('data-back-step', String(n));
  }
  expect(await value(box, 'du')).toMatch(/^none/);
  expect(await value(box, 'dhprev')).toBe('— (first time step)');
  await expect(sectionB(page).locator('[data-control="b:earlier"]')).toBeDisabled();
});

test('Part C: the running sum ends at the recorded sum, for two entries', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  await train(page);
  const rows = sectionC(page).locator('tr[data-use]');
  const check = async (): Promise<void> => {
    await expect(rows).toHaveCount(4);
    for (const t of [2, 3, 4, 5]) await expect(sectionC(page).locator(`tr[data-use="${t}"]`)).toHaveCount(1);
    const cells = await rows.last().locator('td').allInnerTexts();
    const usum = await value(sectionC(page), 'usum');
    expect(Math.abs(num(cells[1].trim()) - leadingNumber(usum))).toBeLessThanOrEqual(1e-6);
    await expect(sectionC(page).locator('[data-value="usum"]')).toContainText(
      '✓ the sum of the contributions, checked here',
    );
  };
  await expect(rows.first()).toBeVisible({ timeout: 90_000 });
  await check();
  await sectionC(page).locator('[data-control="c:entry"]').selectOption({ value: '5' });
  await check();
});

test('Part D: full BPTT beats every window, and shorter windows do worse', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  await sectionD(page).locator('[data-control="d:compare"]').click();
  const rows = sectionD(page).locator('tr[data-window]');
  await expect(rows).toHaveCount(4, { timeout: 90_000 });
  const loss = async (w: number): Promise<number> =>
    num((await sectionD(page).locator(`tr[data-window="${w}"] td`).last().innerText()).trim());
  const [l1, l2, l3, full] = [await loss(1), await loss(2), await loss(3), await loss(0)];
  expect(full).toBeLessThan(0.01);
  for (const l of [l1, l2, l3]) expect(full).toBeLessThan(l);
  expect(l1).toBeGreaterThan(l2);
  expect(l2).toBeGreaterThan(l3);

  const reach = sectionD(page).locator('[data-value="reach"]');
  await sectionD(page).locator('label:has([data-control="d:window:1"])').click();
  await expect(reach).toContainText('time steps 8.');
  await sectionD(page).locator('label:has([data-control="d:window:3"])').click();
  await expect(reach).toContainText('6, 7, 8');
  await sectionD(page).locator('label:has([data-control="d:window:0"])').click();
  await expect(reach).toContainText('2, 3, 4, 5, 6, 7, 8');
  await expect(reach).toContainText('Nothing was cut.');
});

test('Part E: vanishing, roughly constant and exploding gradients', async ({ page }) => {
  await page.goto(URL);
  const pick = async (scale: string, input: string): Promise<void> => {
    await sectionE(page).locator(`label:has([data-control="e:scale:${scale}"])`).click();
    await sectionE(page).locator(`label:has([data-control="e:input:${input}"])`).click();
    await expect(sectionE(page).locator(`table[data-sizes="${scale},${input}"]`)).toBeVisible();
  };
  const ratio = sectionE(page).locator('[data-value="ratio"]');
  await pick('0.5', '0.5');
  await expect(ratio).toContainText('it has vanished');
  await expect(sectionE(page).locator('table[data-sizes] thead th')).toHaveCount(9);
  await expect(sectionE(page).locator('table[data-sizes] tbody td')).toHaveCount(8);
  await pick('2', '0.01');
  await expect(ratio).toContainText('it exploded');
  await pick('2', '0.5');
  await expect(ratio).toContainText('it has vanished');
  await pick('1', '0.01');
  await expect(ratio).toContainText('roughly kept its size');
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

test('Check: the live question accepts the recorded sum for U', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(URL);
  const q = page.locator('[data-question="l4-live-usum"]');
  await expect(q.getByText('Train the network in Part A first.')).toBeVisible();
  await train(page);
  await expect(sectionC(page).locator('[data-value="usum"]')).toBeVisible({ timeout: 90_000 });
  await expect(q.getByText('What is its gradient for this example?')).toBeVisible({ timeout: 60_000 });
  const total = leadingNumber(await value(sectionC(page), 'usum'));
  const options = q.locator('label.lv-option');
  const texts = await options.allInnerTexts();
  let best = 0;
  texts.forEach((t, k) => {
    if (Math.abs(num(t.trim()) - total) < Math.abs(num(texts[best].trim()) - total)) best = k;
  });
  expect(Math.abs(num(texts[best].trim()) - total)).toBeLessThanOrEqual(6e-6);
  await options.nth(best).click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
});

/**
 * Level 3, Experiment 01 (learning rate and training dynamics), end to end in the built app. Every relation is
 * checked on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-3/experiment-01';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l3-1a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l3-1b"]');
const row = (page: Page, lr: string): Locator => sectionA(page).locator(`tr[data-lr="${lr}"]`);

const trainA = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:compare"]').click();
  await expect(row(page, '2')).toBeVisible({ timeout: 60_000 });
};

const trainB = async (page: Page, lr: string): Promise<void> => {
  await sectionB(page).locator(`label:has([data-control="b:lr:${lr}"])`).click();
  await sectionB(page).locator('[data-control="b:train"]').click();
  await expect(sectionB(page).locator('[data-control="b:update"]')).toBeVisible({ timeout: 60_000 });
};

const setUpdate = async (page: Page, n: number): Promise<Locator> => {
  await sectionB(page).locator('[data-control="b:update"]').fill(String(n));
  const box = sectionB(page).locator(`[data-update="${n}"]`);
  await expect(box).toBeVisible();
  return box;
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

const beforeAfter = async (box: Locator): Promise<{ before: number; after: number }> => {
  const text = await value(box, 'before-after');
  const m = /^([−+\d.]+)\s*→\s*([−+\d.]+)$/.exec(text);
  expect(m, text).not.toBeNull();
  return { before: num(m![1]), after: num(m![2]) };
};

test('Part A: each learning rate gets its verdict and the loss and rise counts agree', async ({ page }) => {
  await page.goto(URL);
  await trainA(page);
  const verdicts: Record<string, string> = {
    '0.05': 'barely moved',
    '0.5': 'learned slowly',
    '2': 'learned',
    '8': 'unstable',
    '30': 'got worse',
  };
  for (const [lr, verdict] of Object.entries(verdicts)) {
    await expect(row(page, lr).locator('td').last()).toContainText(verdict);
  }
  const cells = async (lr: string): Promise<string[]> => row(page, lr).locator('td').allInnerTexts();
  const c2 = await cells('2');
  const c8 = await cells('8');
  const c005 = await cells('0.05');
  expect(c2).toHaveLength(4);
  expect(Number(c2[2].trim())).toBe(0);
  expect(Number(c8[2].trim())).toBeGreaterThanOrEqual(5);
  const final2 = num(c2[1]);
  expect(final2).toBeLessThan(num(c005[1]));
  expect(final2).toBeLessThan(num(c8[1]));
});

test('Part A: unchecking two learning rates leaves exactly three rows', async ({ page }) => {
  await page.goto(URL);
  await sectionA(page).locator('[data-control="a:lr:30"]').uncheck();
  await sectionA(page).locator('[data-control="a:lr:8"]').uncheck();
  await sectionA(page).locator('[data-control="a:compare"]').click();
  await expect(row(page, '2')).toBeVisible({ timeout: 60_000 });
  await expect(sectionA(page).locator('tr[data-lr]')).toHaveCount(3);
  await expect(row(page, '8')).toHaveCount(0);
});

test('Part B with eta 2: the recorded step is -eta times the gradient and updates chain', async ({
  page,
}) => {
  await page.goto(URL);
  await trainB(page, '2');
  const box1 = await setUpdate(page, 1);
  const grad = num(await value(box1, 'grad'));
  const deltaText = await box1.locator('[data-value="delta"]').locator('..').innerText();
  expect(deltaText).toContain('✓ −η·ḡ, checked here');
  const delta = num(await value(box1, 'delta'));
  expect(Math.abs(delta - -2 * grad)).toBeLessThanOrEqual(1e-6);
  const ba = await beforeAfter(box1);
  expect(Math.abs(ba.before + delta - ba.after)).toBeLessThanOrEqual(0.0001);

  const box9 = await setUpdate(page, 9);
  const nine = await beforeAfter(box9);
  const box10 = await setUpdate(page, 10);
  await expect(sectionB(page).locator('[data-value="update-number"]')).toHaveText('10 of 60');
  const ten = await beforeAfter(box10);
  expect(ten.before).toBe(nine.after);
});

test('Part B: eta 8 overshoots at update 1 and eta 0.05 takes a much smaller step', async ({ page }) => {
  await page.goto(URL);
  await trainB(page, '8');
  const box = await setUpdate(page, 1);
  const lossText = await value(box, 'loss-after');
  expect(lossText).toContain('↑ the loss rose');
  const lossAfter = num(/[−+]?\d+(\.\d+)?/.exec(lossText.replace(/−/g, '-'))![0]);
  const lossBefore = num(
    (await box.locator('dt:has-text("Batch loss before") + dd').innerText()).trim().split(/\s/)[0],
  );
  expect(lossAfter).toBeGreaterThan(lossBefore);
  const bigStep = Math.abs(num(await value(box, 'delta')));

  await sectionB(page).locator('label:has([data-control="b:lr:0.05"])').click();
  await sectionB(page).locator('[data-control="b:train"]').click();
  await expect(sectionB(page).locator('[data-control="b:train"]')).toContainText('Train and record again');
  const small = await setUpdate(page, 1);
  const smallStep = Math.abs(num(await value(small, 'delta')));
  expect(smallStep).toBeLessThan(0.01);
  expect(bigStep).toBeGreaterThan(smallStep);
});

test('Part B: another parameter changes the panel and Show moves the explorer', async ({ page }) => {
  await page.goto(URL);
  await trainB(page, '2');
  const box = await setUpdate(page, 1);
  const first = await value(box, 'before-after');
  await sectionB(page).locator('select[data-control="b:param"]').selectOption({ value: '24' });
  const changed = sectionB(page).locator('[data-update="1"] [data-value="before-after"]');
  await expect(changed).not.toHaveText(first);
  const show = sectionB(page).locator('[data-control="b:show"]');
  const label = (await show.innerText()) + ' ' + ((await show.getAttribute('aria-label')) ?? '');
  const id = /#(\d+)/.exec(label)![1];
  await show.click();
  await expect(page.locator('[data-control="trace:position"]')).toHaveValue(id);
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await sectionA(page).locator('[data-control="a:compare"]').click();
  await expect(row(page, '2')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

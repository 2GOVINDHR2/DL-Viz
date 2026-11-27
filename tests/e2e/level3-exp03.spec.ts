/**
 * Level 3, Experiment 03 (Adam), end to end in the built app. Every relation is checked on values the page
 * shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-3/experiment-03';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l3-3a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l3-3b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l3-3c"]');
const row = (page: Page, run: string): Locator => sectionA(page).locator(`tr[data-run="${run}"]`);

const trainA = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:compare"]').click();
  await expect(row(page, 'Adam')).toBeVisible({ timeout: 60_000 });
};

const trainB = async (page: Page): Promise<void> => {
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

const finalLoss = async (page: Page, run: string): Promise<number> =>
  num(await row(page, run).locator('td').nth(1).innerText());

test('Part A: Adam reaches a lower epoch-60 loss than momentum, which beats plain descent', async ({
  page,
}) => {
  await page.goto(URL);
  await trainA(page);
  const plain = await finalLoss(page, 'plain gradient descent');
  const momentum = await finalLoss(page, 'momentum μ = 0.9');
  const adam = await finalLoss(page, 'Adam');
  expect(adam).toBeLessThan(momentum);
  expect(momentum).toBeLessThan(plain);
  expect(adam).toBeLessThan(0.15);
});

test('Part B update 1: the first Adam step is eta in size, whatever the gradient', async ({ page }) => {
  await page.goto(URL);
  await trainB(page);
  const box = await setUpdate(page, 1);
  expect(num(await value(box, 't'))).toBe(1);
  const grad = num(await value(box, 'grad'));
  expect(Math.abs(num(await value(box, 'm')) - 0.1 * grad)).toBeLessThanOrEqual(1e-6);
  expect(Math.abs(num(await value(box, 'mhat')) - grad)).toBeLessThanOrEqual(1e-6);
  const ratio = parseFloat(/([\d.]+)\s*×/.exec(await value(box, 'step-over-lr'))![1]);
  expect(ratio).toBeGreaterThan(0.999);
  expect(ratio).toBeLessThan(1.001);
  const delta = num(await value(box, 'delta'));
  expect(Math.abs(delta - -0.05 * Math.sign(grad))).toBeLessThanOrEqual(1e-5);
  await expect(box.getByText('m̂ = ḡ exactly')).toBeVisible();
  await expect(box.getByText('✓ checked here')).toHaveCount(5);
});

test('Part B update 2: the moving average chains and bias correction divides by 0.19', async ({ page }) => {
  await page.goto(URL);
  await trainB(page);
  const box1 = await setUpdate(page, 1);
  const m1 = num(await value(box1, 'm'));
  const box2 = await setUpdate(page, 2);
  expect(num(await value(box2, 't'))).toBe(2);
  const grad2 = num(await value(box2, 'grad'));
  const m2 = num(await value(box2, 'm'));
  expect(Math.abs(m2 - (0.9 * m1 + 0.1 * grad2))).toBeLessThanOrEqual(2e-6);
  const mhat2 = num(await value(box2, 'mhat'));
  expect(Math.abs(mhat2 - m2 / 0.19)).toBeLessThanOrEqual(1e-5);
  await expect(box2.getByText('m̂ = ḡ exactly')).toHaveCount(0);
  await expect(box1.locator('[data-value="m"]')).toHaveCount(0);
});

test('Part C: every step is about eta while gradients differ widely; update 1 gives exactly eta', async ({
  page,
}) => {
  await page.goto(URL);
  await trainB(page);
  const c = sectionC(page);
  const slider = c.locator('[data-control="c:update"]');
  await expect(slider).toBeVisible();
  await expect(slider).toHaveValue('10');
  const text = c.locator('[data-value="ratios"]');
  await expect(text).toContainText('At update 10:');
  await expect(
    c.getByRole('region', { name: 'Gradient and step of every parameter' }).locator('tbody tr'),
  ).toHaveCount(25);
  const read = async (): Promise<{ x: number; y: number; k: number }> => {
    const t = (await text.innerText()).replace(/−/g, '-');
    return {
      x: parseFloat(/largest gradient is ([\d.e+-]+)\s*×/.exec(t)![1]),
      y: parseFloat(/no step is larger than ([\d.e+-]+)\s*·\s*η/.exec(t)![1]),
      k: parseInt(/(\d+) pairs? of parameters/.exec(t)![1], 10),
    };
  };
  const at10 = await read();
  expect(at10.y).toBeLessThanOrEqual(1.5);
  expect(at10.k).toBeGreaterThanOrEqual(1);
  expect(at10.x).toBeGreaterThan(10);

  await slider.fill('1');
  await expect(text).toContainText('At update 1:');
  const at1 = await read();
  expect(at1.y).toBeGreaterThan(0.99);
  expect(at1.y).toBeLessThan(1.01);
});

test('Tour: training advances to step 2 and Skip tour removes it', async ({ page }) => {
  await page.goto(URL);
  await page.locator('[data-control="tour:start"]').click();
  await expect(page.getByText('step 1 of 4')).toBeVisible();
  await trainA(page);
  await expect(page.getByText('step 2 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByText('step 2 of 4')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Skip tour' })).toHaveCount(0);
});

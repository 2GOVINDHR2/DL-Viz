/**
 * Level 4, Experiment 06 (the autoencoder), end to end in the built app. Every relation is checked on values the page
 * shows, never on numbers computed from the engine. Only the code size 1 being the worst of the comparison is asserted.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-4/experiment-06';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionA = (page: Page): Locator => page.locator('section[aria-labelledby="l4-6a"]');
const sectionB = (page: Page): Locator => page.locator('section[aria-labelledby="l4-6b"]');
const sectionC = (page: Page): Locator => page.locator('section[aria-labelledby="l4-6c"]');
const sectionD = (page: Page): Locator => page.locator('section[aria-labelledby="l4-6d"]');
const sectionE = (page: Page): Locator => page.locator('section[aria-labelledby="l4-6e"]');

const train = async (page: Page): Promise<void> => {
  await sectionA(page).locator('[data-control="a:train"]').click();
  await expect(sectionA(page).locator('[data-control="a:example"]')).toBeVisible({ timeout: 120_000 });
  await expect(sectionA(page).locator('[data-value="code"]')).toBeVisible({ timeout: 120_000 });
  await expect(sectionD(page).locator('[data-value="worst"]')).toBeVisible({ timeout: 120_000 });
};

const value = async (box: Locator, name: string): Promise<string> =>
  (await box.locator(`[data-value="${name}"]`).innerText()).trim();

/** The numbers of a vector written "(a, b, c)". */
const vector = (text: string): number[] => {
  const m = /\(([^)]*)\)/.exec(text);
  expect(m, text).not.toBeNull();
  return m![1].split(',').map((s) => num(s.trim()));
};

test('Part A: the encoder code has two numbers and follows the chosen image', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await train(page);
  const sel = sectionA(page).locator('[data-control="a:example"]');
  await expect(sectionA(page).locator('[data-encoder="0"]')).toHaveCount(1);
  const before = await value(sectionA(page), 'code');
  expect(vector(before)).toHaveLength(2);
  expect(vector(await value(sectionA(page), 'enc'))).toHaveLength(8);
  await sel.selectOption('7');
  await expect(sectionA(page).locator('[data-encoder="7"]')).toHaveCount(1);
  await expect.poll(async () => value(sectionA(page), 'code')).not.toBe(before);
  const after = await value(sectionA(page), 'code');
  expect(vector(after)).toHaveLength(2);
});

test('Part B: the latent table and the measured distances', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await train(page);
  const b = sectionB(page);
  await expect(b.locator('svg[role="img"]').first()).toHaveAttribute(
    'aria-label',
    /Latent codes of the 24 images during epoch 150/,
  );
  await b.locator('summary', { hasText: 'Every latent code as a table' }).click();
  await expect(b.locator('details table tbody tr')).toHaveCount(24);

  const read = async (): Promise<string> => value(b, 'distances');
  const text = await read();
  const m = /on average\s+([\d.]+)\s+apart, images of different classes\s+([\d.]+)\s+apart/.exec(text);
  expect(m, text).not.toBeNull();
  expect(num(m![1])).toBeGreaterThan(0);
  expect(num(m![2])).toBeGreaterThan(0);

  await b.locator('[data-control="b:epoch"]').fill('1');
  await expect(b.locator('svg[role="img"]').first()).toHaveAttribute('aria-label', /during epoch 1$/);
  await expect.poll(read).not.toBe(text);
});

test('Part C: the reconstruction grid is 25 values between 0 and 1', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await train(page);
  const grid = sectionC(page).locator('table.lv-mgrid', { hasText: 'Reconstruction (25 values)' });
  const cells = grid.locator('td');
  await expect(cells).toHaveCount(25);
  const texts = await cells.allInnerTexts();
  for (const t of texts) {
    const v = num(t.trim());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  }
  expect(vector(await value(sectionC(page), 'dec'))).toHaveLength(8);
});

test('Part D: the loss is checked and the worst image has the largest loss', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await train(page);
  const d = sectionD(page);
  await expect(d.getByText('checked here')).toBeVisible();
  await expect(d.locator('table.lv-mgrid')).toHaveCount(3);
  const loss = num(await value(d, 'loss'));
  const worstText = await value(d, 'worst');
  const wm = /^([\d.]+)\s*\(image (\d+)\)/.exec(worstText);
  expect(wm, worstText).not.toBeNull();
  const worst = num(wm![1]);
  const worstImage = Number(wm![2]);
  expect(worst).toBeGreaterThanOrEqual(loss);

  await sectionA(page)
    .locator('[data-control="a:example"]')
    .selectOption(String(worstImage - 1));
  await expect(sectionA(page).locator(`[data-encoder="${worstImage - 1}"]`)).toHaveCount(1);
  await expect.poll(async () => num(await value(d, 'loss'))).toBe(worst);
  await expect(d.getByText('checked here')).toBeVisible();
});

test('Part E: three epochs of one image and the comparison of code sizes', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  await train(page);
  const e = sectionE(page);
  await e.locator('summary', { hasText: 'reconstructed at three epochs' }).click();
  const grids = e.locator('[data-snapshots] table.lv-mgrid');
  await expect(grids).toHaveCount(4);
  const captions = await grids.locator('caption').allInnerTexts();
  const loss = (epoch: number): number => {
    const c = captions.find((t) => t.includes(`Epoch ${epoch}:`));
    expect(c, captions.join('|')).toBeDefined();
    return num(/loss\s+([\d.]+)/.exec(c!)![1]);
  };
  expect(loss(1)).toBeGreaterThan(loss(150));

  await e.locator('[data-control="e:compare"]').click();
  const rows = e.locator('tr[data-latent]');
  await expect(rows).toHaveCount(4, { timeout: 120_000 });
  const losses: number[] = [];
  for (const k of [1, 2, 3, 4]) {
    losses.push(num(await e.locator(`tr[data-latent="${k}"] td`).innerText()));
  }
  for (const l of losses.slice(1)) expect(losses[0]).toBeGreaterThan(l);
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

test('Check: the live question accepts the reconstruction loss of Part D', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(URL);
  const q = page.locator('[data-question="l4-live-recon"]');
  await expect(q.getByText('Train the autoencoder in Part A first.')).toBeVisible();
  await train(page);
  const loss = num(await value(sectionD(page), 'loss'));
  const options = q.locator('label.lv-option');
  await expect(options.first()).toBeVisible({ timeout: 60_000 });
  const texts = await options.allInnerTexts();
  let best = 0;
  texts.forEach((t, k) => {
    if (Math.abs(num(t.trim()) - loss) < Math.abs(num(texts[best].trim()) - loss)) best = k;
  });
  expect(Math.abs(num(texts[best].trim()) - loss)).toBeLessThanOrEqual(0.00006);
  await options.nth(best).click();
  await expect(q.locator('.lv-feedback')).toContainText('Correct');
});

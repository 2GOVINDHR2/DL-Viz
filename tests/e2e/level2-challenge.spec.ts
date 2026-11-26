/**
 * Level 2, Experiment 05, Part G (train a network and take one update apart), end to end in the built app. Every
 * relation is checked on values the page shows, never on numbers computed from the engine.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

const URL = '/#/level-2/experiment-05';
const num = (text: string): number => parseFloat(text.replace(/−/g, '-').replace('+', ''));

const sectionG = (page: Page): Locator => page.locator('section[aria-labelledby="l2-p5g"]');
const option = (page: Page, control: string): Locator =>
  page.locator(`label:has([data-control="${control}"])`);
const select = (page: Page, control: string): Locator =>
  sectionG(page).locator(`select[data-control="${control}"]`);
const update = (page: Page, id: string): Locator => sectionG(page).locator(`[data-update="${id}"]`);
const stage = (page: Page, id: string, name: string): Locator =>
  update(page, id).locator(`[data-stage="${name}"]`);
const status = (page: Page): Locator => sectionG(page).getByRole('status');

const train = async (page: Page): Promise<void> => {
  await sectionG(page).locator('[data-control="g:train"]').click();
  await expect(update(page, '1-1')).toBeVisible({ timeout: 60_000 });
};

/** Reads the prediction, the loss and the first backward value of the shown update, and checks their relations. */
const checkRelations = async (page: Page, id: string): Promise<{ yhat: number; loss: number }> => {
  const prediction = await stage(page, id, 'prediction').locator('[data-value="prediction"]').innerText();
  const m = /ŷ = ([−\d.]+) → answer ([01]) · target ([01])/.exec(prediction);
  expect(m, prediction).not.toBeNull();
  const yhat = num(m![1]);
  const answer = Number(m![2]);
  const target = Number(m![3]);
  expect(answer).toBe(yhat >= 0.5 ? 1 : 0);
  const loss = num(await stage(page, id, 'loss').locator('[data-value="loss"]').innerText());
  const expectedLoss = target === 1 ? -Math.log(yhat) : -Math.log(1 - yhat);
  expect(Math.abs(loss - expectedLoss)).toBeLessThanOrEqual(0.0002);
  const first = await stage(page, id, 'backward').locator('[data-list="backward"] li').first().innerText();
  expect(first).toContain('start the backward pass: the gradient of the loss with respect to the output:');
  const v = num(first.split('output:').pop()!.trim());
  const expectedV = target === 1 ? -1 / yhat : 1 / (1 - yhat);
  expect(Math.abs(v - expectedV)).toBeLessThanOrEqual(Math.max(0.001, Math.abs(expectedV) * 0.002));
  return { yhat, loss };
};

const parseCompare = async (page: Page): Promise<{ first: number; last: number }> => {
  const text = await sectionG(page).locator('section[aria-label="Before and after training"]').innerText();
  const m = /after epoch 1 gives loss ([−\d.]+) and after epoch 20 gives ([−\d.]+)/.exec(text);
  expect(m, text).not.toBeNull();
  return { first: num(m![1]), last: num(m![2]) };
};

test('Part G: default training gives 5 updates per epoch and the Show buttons move the explorer in order', async ({
  page,
}) => {
  await page.goto(URL);
  await expect(sectionG(page)).toContainText('5 updates per epoch');
  await train(page);
  const ids: number[] = [];
  for (const name of ['prediction', 'loss', 'backward', 'gradients', 'update']) {
    const button = stage(page, '1-1', name).locator(`[data-control="g:show:${name}"]`);
    const label = (await button.innerText()) + ' ' + ((await button.getAttribute('aria-label')) ?? '');
    const id = Number(/#(\d+)/.exec(label)![1]);
    ids.push(id);
    await button.click();
    await expect(page.locator('[data-control="trace:position"]')).toHaveValue(String(id));
  }
  for (let i = 1; i < ids.length; i++) expect(ids[i]).toBeGreaterThan(ids[i - 1]);
});

test('Part G: prediction, loss and first backward value are consistent, also after choosing another example', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await checkRelations(page, '1-1');
  await select(page, 'g:epoch').selectOption({ value: '19' });
  await select(page, 'g:batch').selectOption({ value: '2' });
  await select(page, 'g:example').selectOption({ value: '4' });
  await expect(update(page, '20-3')).toBeVisible();
  // The stages show the chosen example: the dataset number in its option label.
  const chosen = await select(page, 'g:example').locator('option:checked').innerText();
  const n = /dataset #(\d+)/.exec(chosen)![1];
  await expect(stage(page, '20-3', 'prediction').locator('[data-value="prediction"]')).toContainText(
    `dataset #${n}:`,
  );
  await checkRelations(page, '20-3');
});

test('Part G: the update card applies After = Before + Δ against the opposite of the mean gradient', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  const grads = stage(page, '1-1', 'gradients');
  const upd = stage(page, '1-1', 'update');
  const gRow = grads.locator('tr', { hasText: 'L2.b' });
  const gCells = await gRow.locator('td').allInnerTexts();
  // Columns: parameter, this example’s gradient, mean over the batch (ḡ), check.
  const gbar = num(gCells[2]);
  expect(Number.isNaN(gbar)).toBe(false);
  const cells = await upd.locator('tr[data-param="L2.b"] td').allInnerTexts();
  const before = num(cells[1]);
  const delta = num(cells[2]);
  const after = num(cells[3]);
  expect(Math.abs(after - (before + delta))).toBeLessThanOrEqual(0.0001);
  expect(Math.sign(delta)).toBe(-Math.sign(gbar));
  expect(Math.abs(Math.abs(delta) - 0.5 * Math.abs(gbar))).toBeLessThanOrEqual(0.0002);
  const checks = grads.locator('td', { hasText: '✓' });
  await expect(checks).toHaveCount(4);
  const updChecks = upd.locator('td', { hasText: '✓ before + Δ' });
  await expect(updChecks).toHaveCount(4);
});

test('Part G: batch size 1 gives 40 updates per epoch and no example selector', async ({ page }) => {
  await page.goto(URL);
  await option(page, 'g:batchSize:1').click();
  await expect(sectionG(page)).toContainText('40 updates per epoch');
  await train(page);
  await expect(select(page, 'g:batch').locator('option')).toHaveCount(40);
  await expect(select(page, 'g:example')).toHaveCount(0);
  await expect(stage(page, '1-1', 'gradients')).toContainText('✓ mean of the 1 recorded');
});

test('Part G: changing settings after training shows a note and training again removes it', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  await expect(status(page)).toHaveCount(0);
  await option(page, 'g:lr:2').click();
  await expect(status(page)).toContainText('The settings have changed since this run');
  await expect(status(page)).toContainText('Train again to use them.');
  await sectionG(page).locator('[data-control="g:train"]').click();
  await expect(status(page)).toHaveCount(0, { timeout: 60_000 });
  await expect(update(page, '1-1')).toBeVisible();
  await expect(sectionG(page).locator('[data-control="g:train"]')).toContainText(
    'Train again with these settings',
  );
});

test('Part G: before and after training, the loss falls and the compare selector moves the second panel', async ({
  page,
}) => {
  await page.goto(URL);
  await train(page);
  const { first, last } = await parseCompare(page);
  expect(last).toBeLessThan(first);
  expect(last).toBeLessThan(0.05);
  const before = sectionG(page).locator('section[aria-label="Before and after training"]');
  await expect(before.locator('[data-check-epoch="20"]')).toBeVisible();
  await select(page, 'g:compare').selectOption({ value: '4' });
  const panel = before.locator('[data-check-epoch="5"]');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('After epoch 5:');
  await expect(before.locator('[data-check-epoch="20"]')).toHaveCount(0);
});

test('Part G: a small learning rate with one batch per epoch learns slowly', async ({ page }) => {
  await page.goto(URL);
  await option(page, 'g:lr:0.05').click();
  await option(page, 'g:batchSize:40').click();
  await expect(sectionG(page)).toContainText('1 update per epoch');
  await train(page);
  const { first, last } = await parseCompare(page);
  expect(last).toBeGreaterThan(0.3);
  expect(last).toBeLessThanOrEqual(first);
});

test('after the challenge’s 40-example run, Level 1’s Experiment 04 (4 examples) opens and trains without an error', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await train(page);
  await sectionG(page).locator('[data-control="g:show:gradients"]').click();
  // Leaving the page releases the shared record before Level 1 renders (ADR-095).
  await page.goto('/#/level-1/experiment-04');
  await page.locator('[data-control="train"]').click();
  await expect(page.getByText('The record of run 1')).toBeVisible({ timeout: 60_000 });
  expect(errors).toEqual([]);
});

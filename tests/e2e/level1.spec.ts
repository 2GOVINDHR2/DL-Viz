/**
 * Level 1, end to end in the built app (ADR-080 to ADR-085): the sequence is reachable in order; the guided tour
 * advances on the learner's actions; each experiment's interaction changes what the engine computes; Experiment 04
 * trains through the engine worker and its record can be stepped in both directions.
 */
import { expect, test, type Page } from '@playwright/test';

const set = async (page: Page, control: string, value: string): Promise<void> => {
  const field = page.locator(`[data-control="${control}:exact"]`);
  await field.fill(value);
  await field.press('Enter');
};

test('the Level 1 path is reachable in order, from Home to the assessment', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Learn how neural networks work/);
  await page.locator('[data-control="start-learning"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Neural Network Foundations');
  const path = page.locator('.lv-path-item h3');
  await expect(path).toHaveCount(6);
  await expect(path.nth(1)).toContainText('Inside a Neuron');
  await expect(page.locator('.lv-status').nth(1)).toHaveText(/Not started/);
  await page.locator('[data-control="start-level"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/AI, machine learning and deep learning/);
  const titles = [
    'Inside a Neuron',
    'Perceptrons and Logic Gates',
    'Linear vs Nonlinear Transformations',
    /Multilayer Perceptron/,
  ];
  for (const t of titles) {
    await page.locator('[data-control="next-experiment"]').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(t);
    for (const section of ['Key ideas', 'Explore', 'Knowledge check'])
      await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible();
  }
  await page.locator('[data-control="next-experiment"]').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check what you have learned');
  await page.goto('/#/level-1');
  await expect(page.locator('.lv-status').nth(1)).toHaveText(/Opened/);
  // The workbench (Levels 2+) is still reachable.
  await page.goto('/#/levels');
  await page.locator('[data-control="open-workbench"]').click();
  await expect(page.getByRole('button', { name: /^1\. A single neuron/ })).toBeVisible({ timeout: 60_000 });
});

test('Experiment 01: the guided tour advances on the learner’s actions, and the neuron updates', async ({
  page,
}) => {
  await page.goto('/#/level-1/experiment-01');
  const z = page.locator('.lv-kv dd').first();
  await expect(z).toHaveText('0.700');
  await page.locator('[data-control="tour:start"]').click();
  const tour = page.getByRole('dialog', { name: 'One neuron, left to right' });
  await expect(tour).toBeVisible();
  await expect(page.locator('[data-tour="neuron-diagram"]')).toHaveAttribute('data-tour-active', 'true');
  await page.getByRole('button', { name: 'Next →' }).click();
  await expect(page.getByText('step 2 of 6')).toBeVisible();
  await set(page, 'x1', '2');
  // The action completes the step: the tour moves on by itself.
  await expect(page.getByText('step 3 of 6')).toBeVisible();
  await expect(z).toHaveText('1.500');
  await set(page, 'w1', '0');
  await expect(page.getByText('step 4 of 6')).toBeVisible();
  await expect(z).toHaveText('−0.100');
  await expect(page.locator('.lv-control-was').filter({ hasText: 'was' }).first()).toBeVisible();
  await page.getByRole('button', { name: '← Previous' }).click();
  await expect(page.getByText('step 3 of 6')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // The live question follows the settings on screen, not the defaults.
  await expect(page.locator('[data-question="n-live-relu"] legend')).toContainText('z = −0.10');
  await page.locator('[data-control="activation:relu"]').check({ force: true });
  await expect(page.locator('.lv-kv dd').nth(1)).toHaveText('0.000');
  await page.locator('[data-control="reset"]').click();
  await expect(z).toHaveText('0.700');
});

test('Experiment 02: the gates can be built, and XOR cannot', async ({ page }) => {
  await page.goto('/#/level-1/experiment-02');
  for (const gate of ['AND', 'OR', 'NOT']) {
    await page.locator(`[data-control="gate:${gate}"]`).check({ force: true });
    await page.locator('[data-control="solution"]').click();
    await expect(page.getByText(`this perceptron is an ${gate} gate`)).toBeVisible();
  }
  await page.locator('[data-control="gate:XOR"]').check({ force: true });
  for (const b of ['-0.5', '-1', '-1.5', '0.5', '-0.2']) await set(page, 'b', b);
  await expect(page.getByText(/Settings tried: \d+/)).toBeVisible();
  await expect(page.getByText('The best any setting can manage is 3 of 4.')).toBeVisible();
  await expect(page.getByText(/best so far: [0-3] of 4/)).toBeVisible();
});

test('Experiment 03: two linear layers equal one, and ReLU solves XOR', async ({ page }) => {
  await page.goto('/#/level-1/experiment-03');
  await page.locator('[data-control="combine"]').click();
  await expect(page.getByText('One layer is enough.')).toBeVisible();
  await expect(page.getByText(/[0-3] of 4 correct/).first()).toBeVisible();
  await page.locator('[data-control="nonlinear:relu"]').check({ force: true });
  await expect(page.getByText('4 of 4 correct')).toBeVisible();
});

test('Experiment 04: trains through the engine, and the record steps both ways', async ({ page }) => {
  await page.goto('/#/level-1/experiment-04');
  await page.locator('[data-control="arch:units:0:8"]').check({ force: true });
  await expect(page.getByText('33 parameters')).toBeVisible();
  await page.locator('[data-control="arch:units:0:4"]').check({ force: true });
  await expect(page.getByText('17 parameters')).toBeVisible();
  await page.locator('[data-control="lr:compare"]').click();
  await expect(page.getByText('Learning rate 10', { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.locator('[data-control="train"]').click();
  await expect(page.getByText('The record of run 1')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Before the run')).toBeVisible();
  const where = page.locator('.lv-where');
  await page.locator('[data-control="trace:next"]').click();
  await page.locator('[data-control="trace:next"]').click();
  await expect(where).toContainText('Epoch 1 of 150');
  const first = await where.textContent();
  await page.locator('[data-control="trace:next"]').click();
  await expect(where).not.toHaveText(first!);
  await page.locator('[data-control="trace:back"]').click();
  await expect(where).toHaveText(first!);
  await page.locator('[data-control="trace:epoch"]').nth(9).click();
  await expect(page.getByText('Inside epoch 10 of 150')).toBeVisible();
  await page.locator('[data-control="trace:detail:operations"]').check({ force: true });
  await page.locator('[data-control="trace:size:operation"]').check({ force: true });
  for (let k = 0; k < 4; k++) await page.locator('[data-control="trace:next"]').click();
  await expect(page.getByText(/The recorded instruction #\d+/)).toBeVisible();
  // Pin, step through an update, and see the change.
  await page.getByText('Inspect and compare parameters').click();
  await page.locator('[data-control="trace:pin"]').click();
  await page.locator('[data-control="trace:size:batch"]').check({ force: true });
  await page.locator('[data-control="trace:next"]').click();
  await expect(page.getByText('Change (now − pinned)')).toBeVisible();
  await expect(page.locator('.lv-delta-up, .lv-delta-down').first()).toBeVisible();
  // Changing a setting marks the record as belonging to the earlier run.
  await page.locator('[data-control="train:lr:10"]').check({ force: true });
  await expect(page.getByText('You have changed the settings since this run.')).toBeVisible();
  await expect(page.locator('[data-question="m-live-run"] legend')).toContainText('run 1');
});

import { expect, type Page } from '@playwright/test';

/** Marks every experiment complete in localStorage, so tests can open any of them. */
export async function unlockAll(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const ids = [
      'single-neuron',
      'activations',
      'forward-propagation',
      'loss',
      'gradient-descent',
      'backpropagation',
      'xor-mlp',
      'cnn-mnist',
      'vanishing-gradients',
      'lr-pathology',
    ];
    localStorage.setItem(
      'dl-vizlab.progress.v1',
      JSON.stringify({ completed: ids, walkthrough: {}, answers: {} }),
    );
  });
}

/** Simple explanations hide the instruction's name; tests that read it switch to Detailed (Fix Round 2, §3.1). */
export async function detailed(page: Page): Promise<void> {
  await page.getByRole('radio', { name: 'Detailed' }).click();
}

export async function openExperiment(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`^\\S+\\. ${title}`) }).click();
  await expect(page.locator('.position[data-cursor="-1"]')).toBeVisible({ timeout: 60_000 });
}

/**
 * Level 3 (ADR-099): brings Experiment `n` (1–4) of `#/level-3/experiment-0n` to its trained state. Experiments 01–03:
 * the Part A comparison and a recorded run in Part B. Experiment 04: a recorded run with λ = 0.01 (Parts A and C) and
 * the Part B comparison.
 */
export async function trainLevel3(page: Page, n: number): Promise<void> {
  const a = page.locator(`section[aria-labelledby="l3-${n}a"]`);
  const b = page.locator(`section[aria-labelledby="l3-${n}b"]`);
  if (n === 4) {
    await a.locator('label:has([data-control="a:lambda:0.01"])').click();
    await a.locator('[data-control="a:train"]').click();
    await expect(page.locator('[data-value="regularized"]')).toBeVisible({ timeout: 90_000 });
    await b.locator('[data-control="b:compare"]').click();
    await expect(b.locator('tr[data-lambda]')).toHaveCount(4, { timeout: 120_000 });
  } else {
    await a.locator('[data-control="a:compare"]').click();
    await expect(a.locator('tr[data-lr], tr[data-run]').first()).toBeVisible({ timeout: 90_000 });
    await b.locator('[data-control="b:train"]').click();
    await expect(b.locator('[data-control="b:update"]')).toBeVisible({ timeout: 90_000 });
  }
}

export const LEVEL3_PAGES = [
  '/#/level-3',
  '/#/level-3/experiment-01',
  '/#/level-3/experiment-02',
  '/#/level-3/experiment-03',
  '/#/level-3/experiment-04',
];

/**
 * Level 4 (ADR-101–103): brings Experiment `n` (1–6) of `#/level-4/experiment-0n` to its explored or trained state:
 * Experiment 01 (engine probes, nothing to train) is stepped and reconfigured; the others train and record, and run
 * their comparison where the page has one.
 */
export async function trainLevel4(page: Page, n: number): Promise<void> {
  const sec = (p: string) => page.locator(`section[aria-labelledby="l4-${n}${p}"]`);
  const T = { timeout: 120_000 };
  switch (n) {
    case 1:
      await page.locator('[data-control="a:next"]').click();
      await page.locator('label:has([data-control="b:padding:1"])').click();
      await page.locator('label:has([data-control="d:pattern:corner"])').click();
      await expect(page.locator('[data-value="shape"]')).toHaveText('6×6');
      return;
    case 2:
      await page.locator('[data-control="a:train"]').click();
      await expect(page.locator('[data-value="prediction"]')).toBeVisible(T);
      await expect(page.locator('[data-value="delta"]')).toBeVisible(T);
      return;
    case 3:
      await page.locator('[data-control="a:train"]').click();
      await expect(page.locator('tr[data-row="h"]')).toBeVisible(T);
      await expect(page.locator('[data-prediction]')).toBeVisible(T);
      return;
    case 4:
      await page.locator('[data-control="a:train"]').click();
      await expect(page.locator('[data-value="dh"]')).toBeVisible(T);
      await sec('d').locator('[data-control="d:compare"]').click();
      await expect(page.locator('tr[data-window]')).toHaveCount(4, T);
      return;
    case 5:
      await page.locator('[data-control="a:train"]').click();
      await expect(page.locator('[data-lstm-step]')).toBeVisible(T);
      await sec('d').locator('[data-control="d:compare"]').click();
      await expect(page.locator('tr[data-kind="gru"] td').nth(1)).not.toHaveText('—', T);
      return;
    case 6:
      await page.locator('[data-control="a:train"]').click();
      await expect(page.locator('[data-value="distances"]')).toBeVisible(T);
      await expect(page.locator('[data-value="loss"]')).toBeVisible(T);
      await sec('e').locator('[data-control="e:compare"]').click();
      await expect(page.locator('tr[data-latent]')).toHaveCount(4, T);
      return;
  }
}

export const LEVEL4_PAGES = [
  '/#/level-4',
  '/#/level-4/experiment-01',
  '/#/level-4/experiment-02',
  '/#/level-4/experiment-03',
  '/#/level-4/experiment-04',
  '/#/level-4/experiment-05',
  '/#/level-4/experiment-06',
];

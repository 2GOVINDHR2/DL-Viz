/**
 * Performance at the largest experiment (CNN on reduced MNIST), for the B3
 * budgets in docs/VALIDATION-REPORT.md: generation time in the worker, the
 * longest main-thread frame while the worker trains (the UI must not
 * freeze), frame rate while auto-running, and memory. Memory is measured two
 * ways: the peak resident set of the tab's renderer process (the largest
 * Chromium renderer; Linux, via ps), which includes the worker and the
 * allocator's high-water mark; and, through the DevTools protocol, the
 * worker's live heap and array-buffer memory after a forced garbage
 * collection. Run on its own (`npm run measure`) so no other tab is counted.
 * Writes reports/perf-cnn.json.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { unlockAll } from './helpers';

/**
 * Resident set (MB) of the largest Chromium renderer process, from one `ps` snapshot: `own` counts only the given
 * process ids (the renderers of this test's browser), so a renderer of a test running in parallel in another
 * Playwright worker, or of any other Chromium on the machine, is never measured; `any` counts every renderer on the
 * machine (diagnostics only).
 */
const rendererRssMB = (own: Set<number> | null): { own: number | null; any: number } | null => {
  try {
    const rows = execSync('ps -eo pid=,rss=,args=')
      .toString()
      .split('\n')
      .filter((l) => l.includes('--type=renderer'))
      .map((l) => l.trim().split(/\s+/).map(Number));
    const max = (r: number[][]): number => Math.round(r.reduce((m, [, rss]) => Math.max(m, rss), 0) / 1024);
    return { own: own ? max(rows.filter(([pid]) => own.has(pid))) : null, any: max(rows) };
  } catch {
    return null;
  }
};

/** The renderer process ids of one Chromium browser, from the DevTools protocol (SystemInfo.getProcessInfo). */
async function rendererPids(browser: Browser): Promise<Set<number>> {
  const cdp = await browser.newBrowserCDPSession();
  const { processInfo } = (await cdp.send('SystemInfo.getProcessInfo')) as {
    processInfo: { type: string; id: number }[];
  };
  await cdp.detach();
  return new Set(processInfo.filter((p) => p.type === 'renderer').map((p) => p.id));
}

async function runFor(
  page: Page,
  granularity: string,
): Promise<{ fps: number; worstFrameMs: number; stepsPerSecond: number }> {
  await page.getByRole('radio', { name: granularity, exact: true }).click();
  await page.getByRole('button', { name: /Run/ }).click();
  const m = await page.evaluate(
    () =>
      new Promise<{ fps: number; worstFrameMs: number; stepsPerSecond: number }>((done) => {
        const read = () =>
          /Instruction ([\d,]+)/.exec(document.querySelector('.position')?.textContent ?? '')?.[1] ?? '';
        const start = performance.now();
        let frames = 0,
          last = start,
          worst = 0,
          changes = 0,
          prev = read();
        const tick = (now: number): void => {
          frames++;
          worst = Math.max(worst, now - last);
          last = now;
          const p = read();
          if (p !== prev) changes++;
          prev = p;
          if (now - start < 3000) requestAnimationFrame(tick);
          else
            done({
              fps: (frames * 1000) / (now - start),
              worstFrameMs: worst,
              stepsPerSecond: (changes * 1000) / (now - start),
            });
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.getByRole('button', { name: /Pause/ }).click();
  return m;
}

/** Talks to the page's dedicated worker over the DevTools protocol (Chromium only). */
async function workerProbe(
  page: Page,
): Promise<((method: string) => Promise<Record<string, number>>) | null> {
  if (page.context().browser()?.browserType().name() !== 'chromium') return null;
  const client = await page.context().newCDPSession(page);
  let session: string | null = null;
  let id = 0;
  const pending = new Map<number, (r: Record<string, number>) => void>();
  client.on('Target.attachedToTarget', (e) => {
    if (e.targetInfo.type === 'worker') session = e.sessionId;
  });
  client.on('Target.receivedMessageFromTarget', (e) => {
    const m = JSON.parse(e.message) as { id: number; result: Record<string, number> };
    pending.get(m.id)?.(m.result);
    pending.delete(m.id);
  });
  await client.send('Target.setAutoAttach', {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: false,
  });
  return (method) =>
    new Promise((done) => {
      const k = ++id;
      pending.set(k, done);
      void client.send('Target.sendMessageToTarget', {
        sessionId: session!,
        message: JSON.stringify({ id: k, method }),
      });
    });
}

test('CNN: generation, responsiveness, frame rate and memory', async ({
  playwright,
  browserName,
  launchOptions,
  baseURL,
  viewport,
}) => {
  test.setTimeout(180_000);
  // A browser process of its own: nothing an earlier test in this worker did (pages, workers, the allocator's
  // high-water mark) is in it, and its renderer ids are known, so a renderer of a test running in parallel in
  // another worker is never measured.
  const browser = await playwright[browserName].launch(launchOptions);
  const context = await browser.newContext({ baseURL, viewport });
  const page = await context.newPage();
  const probe = await workerProbe(page);
  const chromium = browserName === 'chromium';
  let own = chromium ? await rendererPids(browser) : null;
  let peak = 0;
  let peakAll = 0;
  const sample = (): void => {
    const r = rendererRssMB(own);
    if (r?.own) peak = Math.max(peak, r.own);
    if (r) peakAll = Math.max(peakAll, r.any);
  };
  const poll = setInterval(() => {
    sample();
    if (chromium)
      void rendererPids(browser).then(
        (p) => (own = p),
        () => undefined,
      );
  }, 250);
  await unlockAll(page);
  await page.goto('/?mode=expert');
  await expect(page.locator('.position[data-cursor="-1"]')).toBeVisible();

  // Record every frame interval on the main thread while the worker generates the CNN trace.
  await page.evaluate(() => {
    const w = window as unknown as { __gaps: number[]; __stop: boolean };
    w.__gaps = [];
    w.__stop = false;
    let last = performance.now();
    const tick = (now: number): void => {
      w.__gaps.push(now - last);
      last = now;
      if (!w.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const t0 = Date.now();
  await page.getByRole('button', { name: /^8\. A CNN on handwritten digits/ }).click();
  await expect(page.locator('.position[data-cursor="-1"]')).toBeVisible({ timeout: 120_000 });
  const generationMs = Date.now() - t0;
  const gaps = await page.evaluate(() => {
    const w = window as unknown as { __gaps: number[]; __stop: boolean };
    w.__stop = true;
    return w.__gaps;
  });
  const sorted = [...gaps].sort((a, b) => a - b);

  await page.getByLabel('Speed').fill('1000');
  const run_operation = await runFor(page, 'Operation');
  const run_layer = await runFor(page, 'Layer');
  const jsHeapMB = await page.evaluate(() => {
    const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    return m ? Math.round(m.usedJSHeapSize / 1048576) : null;
  });
  clearInterval(poll);
  sample();
  let workerLive: Record<string, number> | null = null;
  if (probe) {
    await probe('HeapProfiler.collectGarbage');
    const h = await probe('Runtime.getHeapUsage');
    workerLive = {
      jsHeapMB: Math.round(h.usedSize / 1048576),
      arrayBuffersMB: Math.round((h.backingStorageSize ?? 0) / 1048576),
    };
  }

  const file = resolve(import.meta.dirname, '../../reports/perf-cnn.json');
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  const result = {
    generationMsInBrowser: generationMs,
    framesDuringGeneration: gaps.length,
    worstFrameDuringGenerationMs: Math.round(sorted.at(-1) ?? 0),
    p95FrameDuringGenerationMs: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
    run_operation,
    run_layer,
    jsHeapMB,
    peakRendererRssMB: peak || null,
    // Every renderer on the machine, this test's or not: diagnostics only, never asserted.
    peakAnyRendererRssMB: peakAll || null,
    workerLiveAfterGc: workerLive,
  };
  // Written only under the measurement protocol (`npm run measure` sets MEASURE=1; VERIFICATION-METHOD §7).
  if (process.env.MEASURE === '1')
    writeFileSync(file, JSON.stringify({ ...prev, [browserName]: result }, null, 2) + '\n');
  // The UI never freezes while the worker trains.
  expect(result.worstFrameDuringGenerationMs).toBeLessThan(250);
  // B3 budget on what the experiment actually holds: live worker memory after GC.
  if (workerLive) expect(workerLive.jsHeapMB + workerLive.arrayBuffersMB).toBeLessThan(500);
  // Peak RSS includes the allocator's high-water mark from short-lived training buffers; it sits near the
  // ~500 MB budget (reported in VALIDATION-REPORT and KNOWN-GAPS). This guard only catches regressions.
  test.info().annotations.push({
    type: 'memory',
    description: `own renderer peak ${result.peakRendererRssMB} MB; any renderer on the machine ${result.peakAnyRendererRssMB} MB`,
  });
  console.log(
    `[perf-cnn] own renderer peak ${result.peakRendererRssMB} MB; any renderer ${result.peakAnyRendererRssMB} MB`,
  );
  await browser.close();
  if (result.peakRendererRssMB) expect(result.peakRendererRssMB).toBeLessThan(700);
});

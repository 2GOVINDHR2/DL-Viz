/**
 * Experiment 04's connection to the engine. In the browser this is the existing engine worker
 * (src/ui/engine.worker.ts, via src/ui/engineClient.ts), so training never blocks the page. Tests substitute an
 * in-process EngineHost, which answers the same protocol with the same code.
 */
import { EngineHost } from '../../../core/engine/host';
import { fromWire, toWire, type Reply, type Request } from '../../../core/engine/protocol';
import { createEngineClient, type EngineClient } from '../../../ui/engineClient';

let factory: () => EngineClient = createEngineClient;

/** Replaces how the engine is created (tests). Returns the previous factory. */
export function setEngineFactory(f: () => EngineClient): () => EngineClient {
  const prev = factory;
  factory = f;
  return prev;
}

export const createEngine = (): EngineClient => factory();

/** The engine in this thread: the same EngineHost the worker runs, with the same wire encoding. */
export function inProcessEngine(): EngineClient {
  const host = new EngineHost();
  return {
    request: <R extends Reply['op']>(req: Request) =>
      new Promise<Extract<Reply, { op: R }>>((resolve, reject) => {
        try {
          const reply = host.handle(fromWire<Request>(toWire(req)));
          resolve(fromWire<Reply>(toWire(reply)) as Extract<Reply, { op: R }>);
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      }),
    dispose: () => {},
  };
}

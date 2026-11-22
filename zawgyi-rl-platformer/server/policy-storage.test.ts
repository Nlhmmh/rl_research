import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { expect, it, vi } from 'vitest';
import {
  get,
  initializeBrowserSession,
  listRecords,
  set,
} from '../src/modules/reinforcement-learning/infrastructure/persistence/sqlite-client';
import { createPolicyApi } from './policy-storage';

it('isolates browser sessions and round-trips policy weights without overwriting imports', async () => {
  const db = new DatabaseSync(':memory:');
  const api = createPolicyApi(db);
  const browserA = { cookie: '' };
  const browserB = { cookie: '' };
  let browser = browserA;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const req = Object.assign(Readable.from(init?.body ? [Buffer.from(String(init.body))] : []), {
      url,
      method: init?.method ?? 'GET',
      headers: { ...Object.fromEntries(new Headers(init?.headers)), cookie: browser.cookie },
      socket: {},
    });
    let status = 500;
    let body = '';
    const res = {
      setHeader(name: string, value: string) {
        if (name === 'Set-Cookie') browser.cookie = value.split(';')[0];
      },
      writeHead(code: number) {
        status = code;
      },
      end(value: string) {
        body = value;
      },
    };
    await api(req as unknown as IncomingMessage, res as unknown as ServerResponse, () => {
      throw new Error('Unexpected route');
    });
    return new Response(body, { status });
  });

  try {
    const id = 'run-test/AI-1/best';
    const key = `zawgyi/checkpoint/${id}`;
    const metadata = { id, algorithm: 'dqn' };
    const weights = Uint8Array.of(0, 127, 255).buffer;
    await expect(get(key)).rejects.toThrow('Browser session is unavailable');
    await initializeBrowserSession();
    const originalCookie = browserA.cookie;
    await set(key, { metadata });
    await set(`${key}/model`, { weightData: [weights] });
    await set(key, { metadata: { id, algorithm: 'q-learning' } }, true);
    await initializeBrowserSession();
    expect(browserA.cookie).toBe(originalCookie);
    expect(await listRecords()).toEqual([metadata]);
    const model = await get<{ weightData: ArrayBuffer[] }>(`${key}/model`);
    expect(new Uint8Array(model!.weightData[0])).toEqual(new Uint8Array(weights));

    browser = browserB;
    await initializeBrowserSession();
    expect(browserB.cookie).not.toBe(originalCookie);
    expect(await listRecords()).toEqual([]);
    expect(await get(key)).toBeNull();
  } finally {
    vi.unstubAllGlobals();
    db.close();
  }
});

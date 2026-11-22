import { entries } from 'idb-keyval';
import { get, initializeBrowserSession, set } from './sqlite-client';

const IMPORTED = 'zawgyi/legacy-imported';

async function initialize() {
  await initializeBrowserSession();
  if (!globalThis.indexedDB || (await get<boolean>(IMPORTED))) return;

  const records = await entries<string, unknown>();
  for (const [key, value] of records) {
    if (typeof key === 'string' && key.startsWith('zawgyi/checkpoint/')) {
      await set(key, value, true);
    }
  }
  const manifest = records.find(([key]) => key === 'zawgyi/latest-manifest');
  if (manifest) await set(manifest[0], manifest[1], true);
  await set(IMPORTED, true);
}

export function initializePolicyStorage() {
  return navigator.locks
    ? navigator.locks.request('zawgyi-policy-storage', initialize)
    : initialize();
}

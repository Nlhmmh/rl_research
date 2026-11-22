import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Plugin } from 'vite';

const API = '/api/policies';
const COOKIE = 'zawgyi_browser';
const OFFLINE_SCOPE = 'offline-local';
const SESSION_LIFETIME_SECONDS = 365 * 24 * 60 * 60;
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const VALID_KEY =
  /^zawgyi\/(?:latest-manifest|legacy-imported|checkpoint\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*)$/;

function isLocalBrowser(req: IncomingMessage): boolean {
  return (
    /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.headers.host ?? '') &&
    ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '') &&
    !req.headers.forwarded &&
    !req.headers['x-forwarded-for'] &&
    !req.headers['x-forwarded-host']
  );
}

function reply(res: ServerResponse, status: number, body: string) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function readBody(req: IncomingMessage): Promise<string | undefined> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += bytes.byteLength;
    if (size > MAX_BODY_BYTES) {
      req.resume();
      return;
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function createPolicyApi(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS policy_records (
      browser_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL CHECK (json_valid(value)),
      PRIMARY KEY (browser_id, key)
    )
  `);
  const read = db.prepare('SELECT value FROM policy_records WHERE browser_id = ? AND key = ?');
  const insert = db.prepare('INSERT OR IGNORE INTO policy_records VALUES (?, ?, ?)');
  const write = db.prepare(`
    INSERT INTO policy_records VALUES (?, ?, ?)
    ON CONFLICT (browser_id, key) DO UPDATE SET value = excluded.value
  `);
  const list = db.prepare(`
    SELECT json_extract(value, '$.metadata') AS metadata FROM policy_records
    WHERE browser_id = ? AND key GLOB 'zawgyi/checkpoint/*'
      AND key = 'zawgyi/checkpoint/' || json_extract(value, '$.metadata.id')
  `);

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== API && url.pathname !== `${API}/session`) return next();

    try {
      const cookie = req.headers.cookie?.match(
        /(?:^|;\s*)zawgyi_browser=([a-f0-9-]{36})(?:;|$)/,
      )?.[1];
      if (
        url.pathname === `${API}/session` &&
        req.method === 'POST' &&
        req.headers['content-type'] === 'application/json'
      ) {
        const id = cookie ?? randomUUID();
        const secure = 'encrypted' in req.socket && req.socket.encrypted ? '; Secure' : '';
        res.setHeader(
          'Set-Cookie',
          `${COOKIE}=${id}; Path=${API}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_LIFETIME_SECONDS}${secure}`,
        );
        return reply(res, 200, '{}');
      }
      if (!cookie)
        return reply(res, 401, '{"error":"Browser session is unavailable. Refresh the page."}');
      const key = url.searchParams.get('key');
      if (url.pathname === API && req.method === 'GET') {
        const includeOffline = isLocalBrowser(req);
        if (key === null) {
          const rows = includeOffline
            ? [...list.all(OFFLINE_SCOPE), ...list.all(cookie)]
            : list.all(cookie);
          const policies = new Map<string, unknown>();
          for (const row of rows) {
            const metadata = JSON.parse(String(row.metadata));
            policies.set(metadata.id, metadata);
          }
          return reply(res, 200, JSON.stringify([...policies.values()]));
        }
        if (!VALID_KEY.test(key)) return reply(res, 400, '{"error":"Invalid checkpoint key"}');
        const record =
          read.get(cookie, key) ??
          (includeOffline && key.startsWith('zawgyi/checkpoint/')
            ? read.get(OFFLINE_SCOPE, key)
            : undefined);
        return reply(res, 200, record ? String(record.value) : 'null');
      }
      if (
        url.pathname === API &&
        req.method === 'PUT' &&
        req.headers['content-type'] === 'application/json' &&
        key &&
        VALID_KEY.test(key)
      ) {
        const body = await readBody(req);
        if (body === undefined) return reply(res, 413, '{"error":"Checkpoint is too large"}');
        try {
          JSON.parse(body);
        } catch {
          return reply(res, 400, '{"error":"Invalid checkpoint data"}');
        }
        (url.searchParams.has('import') ? insert : write).run(cookie, key, body);
        return reply(res, 200, '{}');
      }
      reply(res, 400, '{"error":"Invalid checkpoint request"}');
    } catch (error) {
      console.error('Policy storage request failed', error);
      reply(res, 500, '{"error":"SQLite policy storage failed"}');
    }
  };
}

export function policyStorage(): Plugin {
  function mount({
    middlewares,
    httpServer,
    config,
  }: {
    middlewares: { use: (handler: ReturnType<typeof createPolicyApi>) => void };
    httpServer: { once: (event: 'close', callback: () => void) => void } | null;
    config: { root: string; mode: string };
  }) {
    if (config.mode === 'test') return;
    const folder = join(config.root, '.data');
    mkdirSync(folder, { recursive: true });
    const db = new DatabaseSync(join(folder, 'policies.sqlite'));
    middlewares.use(createPolicyApi(db));
    httpServer?.once('close', () => db.close());
  }

  return {
    name: 'zawgyi-policy-storage',
    apply: 'serve',
    configureServer: mount,
    configurePreviewServer: mount,
  };
}

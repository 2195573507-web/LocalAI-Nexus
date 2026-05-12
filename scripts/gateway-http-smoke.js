import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const logsDir = path.join(root, '.codex-parallel', 'logs');
const resultsDir = path.join(root, '.codex-parallel', 'results');
const userDataDir = path.join(root, '.codex-parallel', 'gateway-http-user-data');
const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const electronLogPath = path.join(logsDir, `gateway-http-smoke-${stamp}.log`);
const resultPath = path.join(resultsDir, `gateway-http-smoke-${stamp}.json`);
const electronBin = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const electronMain = path.join(root, 'dist-electron', 'main', 'index.js');
const baseUrl = 'http://127.0.0.1:8317';

fs.mkdirSync(logsDir, { recursive: true });
fs.mkdirSync(resultsDir, { recursive: true });
fs.rmSync(userDataDir, { recursive: true, force: true });
fs.mkdirSync(userDataDir, { recursive: true });
fs.writeFileSync(electronLogPath, '', 'utf8');

function append(chunk) {
  fs.appendFileSync(electronLogPath, chunk.toString(), 'utf8');
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(method, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = http.request(`${baseUrl}${route}`, {
      method,
      headers: {
        ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}),
      },
      timeout: 5_000,
    }, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        raw += chunk;
      });
      res.on('end', () => {
        let parsed = raw;
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch {
          // Keep non-JSON payloads for diagnostics.
        }
        resolve({ route, method, statusCode: res.statusCode, body: parsed });
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error(`${method} ${route} timed out`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForGateway(timeoutMs = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const health = await request('GET', '/health');
      if (health.statusCode === 200 && health.body?.online === true) return health;
    } catch {
      // Gateway is still starting.
    }
    await wait(500);
  }
  throw new Error('Timed out waiting for LocalAI Nexus Gateway on 127.0.0.1:8317.');
}

function assertResult(result, predicate, message) {
  if (!predicate(result)) {
    throw new Error(`${message}. Got ${result.method} ${result.route} -> ${result.statusCode}: ${JSON.stringify(result.body).slice(0, 500)}`);
  }
}

async function main() {
  console.log('\nLocalAI Nexus - Gateway HTTP Smoke\n');
  if (!fs.existsSync(electronBin)) throw new Error(`Electron binary not found: ${electronBin}`);
  if (!fs.existsSync(electronMain)) throw new Error(`Electron main build not found: ${electronMain}. Run npm run build first.`);

  const electron = spawn(electronBin, [electronMain], {
    cwd: root,
    env: {
      ...process.env,
      AGENTFLOW_GATEWAY_HTTP_SMOKE: '1',
      AGENTFLOW_SKIP_DEVTOOLS: '1',
      AGENTFLOW_LOAD_DIST: '1',
      AGENTFLOW_USER_DATA_DIR: userDataDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    shell: false,
  });
  electron.stdout.on('data', append);
  electron.stderr.on('data', append);
  electron.on('exit', (code, signal) => append(`\n[exit code=${code} signal=${signal}]\n`));

  const results = [];
  try {
    const health = await waitForGateway();
    results.push(health);
    results.push(await request('GET', '/v1/models'));
    results.push(await request('POST', '/v1/chat/completions', {
      model: 'localai-nexus-diagnostic',
      messages: [{ role: 'user', content: 'ping' }],
    }));
    results.push(await request('POST', '/v1/responses', {
      model: 'localai-nexus-diagnostic',
      input: 'ping',
    }));
    results.push(await request('POST', '/responses', {
      model: 'localai-nexus-diagnostic',
      input: 'ping',
    }));
    results.push(await request('POST', '/v1/messages', {
      model: 'localai-nexus-diagnostic',
      messages: [{ role: 'user', content: 'ping' }],
    }));
    results.push(await request('POST', '/v1/embeddings', {
      model: 'localai-nexus-diagnostic',
      input: 'LocalAI Nexus',
    }));

    assertResult(results[0], (result) => result.statusCode === 200 && result.body.online === true, 'Gateway health check failed');
    assertResult(results[1], (result) => result.statusCode === 200 && Array.isArray(result.body.data), 'Gateway model list failed');
    for (const result of results.slice(2)) {
      assertResult(result, (entry) => entry.statusCode === 200, 'Gateway endpoint smoke failed');
    }
    assertResult(results[6], (result) => result.body.object === 'list' && Array.isArray(result.body.data), 'Gateway embeddings response shape failed');
    assertResult(results[4], (result) => result.body.compatibility?.supported?.includes('/v1/embeddings'), 'Gateway root /responses diagnostic missing compatibility data');

    const output = {
      ok: true,
      baseUrl,
      checkedAt: new Date().toISOString(),
      routes: results.map((result) => ({
        method: result.method,
        route: result.route,
        statusCode: result.statusCode,
        traceId: result.body?.nexus?.traceId,
        object: result.body?.object,
      })),
      logPath: electronLogPath,
    };
    fs.writeFileSync(resultPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`PASS Gateway HTTP smoke completed. Result: ${resultPath}`);
    console.log(`PASS Electron log: ${electronLogPath}\n`);
  } finally {
    if (electron.exitCode === null) {
      electron.kill();
      await wait(500);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exitCode = 1;
});

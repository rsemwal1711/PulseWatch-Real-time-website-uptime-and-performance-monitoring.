import { createServer as createHttpServer } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_DATA_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'monitors.json');
const ALLOWED_INTERVALS = new Set([60, 300, 600]);
const ALLOWED_TIMEOUTS = new Set([5, 10, 20]);
const MAX_CHECK_HISTORY = 5000;
const MAX_REDIRECTS = 5;
const ANALYTICS_RANGES = {
  '24h': { durationMs: 24 * 60 * 60 * 1000, buckets: 24 },
  '7d': { durationMs: 7 * 24 * 60 * 60 * 1000, buckets: 28 },
  '30d': { durationMs: 30 * 24 * 60 * 60 * 1000, buckets: 30 },
};

export function isPublicAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split('.').map(Number);
    const [a, b, c] = octets;
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168) && (b !== 0 || c <= 2)) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (version !== 6) return false;

  const normalized = address.toLowerCase().split('%')[0];
  const [first, second] = normalized.split(':');
  const firstGroup = Number.parseInt(first || '0', 16);
  const secondGroup = Number.parseInt(second || '0', 16);
  return firstGroup >= 0x2000 &&
    firstGroup <= 0x3fff &&
    !normalized.startsWith('2001:db8:') &&
    !(firstGroup === 0x2001 && secondGroup <= 0x01ff) &&
    firstGroup !== 0x2002 &&
    !(firstGroup === 0x3fff && secondGroup <= 0x000f);
}

async function resolvePublicAddresses(hostname, timeoutMs) {
  const resolvedHostname = hostname.replace(/^\[|\]$/g, '');
  const literalVersion = isIP(resolvedHostname);
  let addresses;
  if (literalVersion) {
    addresses = [{ address: resolvedHostname, family: literalVersion }];
  } else {
    let timer;
    try {
      addresses = await Promise.race([
        lookup(resolvedHostname, { all: true, verbatim: true }),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Request timed out.')), timeoutMs);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error('The URL resolves to a restricted network address.');
  }
  return addresses;
}

function requestOnce(url, method, timeoutMs, address) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    let settled = false;
    const req = transport(url, {
      method,
      agent: false,
      headers: { 'User-Agent': 'PulseWatch-Monitor/1.0', Accept: '*/*' },
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, (response) => {
      const result = {
        statusCode: response.statusCode || null,
        location: response.headers.location || null,
      };
      response.destroy();
      settled = true;
      resolve(result);
    });

    const timeout = setTimeout(() => {
      req.destroy(new Error('Request timed out.'));
    }, timeoutMs);
    req.once('error', (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    req.once('close', () => clearTimeout(timeout));
    req.end();
  });
}

async function checkUrl(target, method, timeoutSeconds) {
  let url;
  try {
    url = new URL(target);
  } catch {
    throw new Error('Enter a valid website URL.');
  }

  const deadline = Date.now() + timeoutSeconds * 1000;
  const remainingTime = () => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Request timed out.');
    return remaining;
  };
  const started = performance.now();
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Only credential-free HTTP and HTTPS URLs are supported.');
    }

    const addresses = await resolvePublicAddresses(url.hostname, remainingTime());
    const response = await requestOnce(url, method, remainingTime(), addresses[0]);
    const responseMs = Math.round(performance.now() - started);

    if (![301, 302, 303, 307, 308].includes(response.statusCode) || !response.location) {
      return { statusCode: response.statusCode, responseMs };
    }
    if (redirects === MAX_REDIRECTS) throw new Error('The URL redirected too many times.');
    url = new URL(response.location, url);
  }
  throw new Error('The URL redirected too many times.');
}

export function validateMonitorInput(input, current = {}) {
  const errors = {};
  const name = input.name === undefined ? current.name : String(input.name).trim();
  const target = input.url === undefined ? current.url : String(input.url).trim();
  const method = input.method === undefined ? current.method || 'GET' : String(input.method).toUpperCase();
  const intervalSeconds = input.intervalSeconds === undefined
    ? current.intervalSeconds || 60
    : Number(input.intervalSeconds);
  const timeoutSeconds = input.timeoutSeconds === undefined
    ? current.timeoutSeconds || 10
    : Number(input.timeoutSeconds);
  const expectedStatuses = input.expectedStatuses === undefined
    ? current.expectedStatuses || [200]
    : Array.isArray(input.expectedStatuses)
      ? input.expectedStatuses.map(Number)
      : String(input.expectedStatuses).split(',').map((code) => Number(code.trim()));

  if (!name || name.length > 100) errors.name = 'Name is required and must be 100 characters or fewer.';
  if (!target || target.length > 2048) {
    errors.url = 'URL is required and must be 2048 characters or fewer.';
  } else {
    try {
      const parsed = new URL(target);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        errors.url = 'Use a credential-free HTTP or HTTPS URL.';
      }
    } catch {
      errors.url = 'Enter a valid URL, including https://.';
    }
  }
  if (!['GET', 'HEAD', 'POST'].includes(method)) errors.method = 'Use GET, HEAD, or POST.';
  if (!ALLOWED_INTERVALS.has(intervalSeconds)) errors.intervalSeconds = 'Choose a 1, 5, or 10 minute interval.';
  if (!ALLOWED_TIMEOUTS.has(timeoutSeconds)) errors.timeoutSeconds = 'Choose a 5, 10, or 20 second timeout.';
  if (
    !expectedStatuses.length ||
    expectedStatuses.length > 20 ||
    expectedStatuses.some((code) => !Number.isInteger(code) || code < 100 || code > 599)
  ) {
    errors.expectedStatuses = 'Enter up to 20 HTTP status codes between 100 and 599.';
  }
  if (Object.keys(errors).length) return { errors };
  return {
    value: {
      name,
      url: target,
      method,
      intervalSeconds,
      timeoutSeconds,
      expectedStatuses: [...new Set(expectedStatuses)],
    },
  };
}

export function statusFromCheck(check, expectedStatuses) {
  if (check.error || !expectedStatuses.includes(check.statusCode)) return 'Down';
  return check.responseMs >= 1000 ? 'Degraded' : 'Operational';
}

export function buildIncidents(monitors, now = Date.now()) {
  const incidents = [];
  for (const monitor of monitors) {
    let activeIncident;
    const checks = [...monitor.checks].sort((left, right) =>
      Date.parse(left.checkedAt) - Date.parse(right.checkedAt));
    for (const check of checks) {
      const checkedAt = Date.parse(check.checkedAt);
      if (!Number.isFinite(checkedAt)) continue;
      const isDown = Boolean(check.error) || !monitor.expectedStatuses.includes(check.statusCode);
      if (isDown && !activeIncident) {
        activeIncident = {
          id: `${monitor.id}-${check.checkedAt}`,
          monitorId: monitor.id,
          website: monitor.name,
          url: monitor.url,
          status: 'Ongoing',
          startedAt: check.checkedAt,
          resolvedAt: null,
          durationMs: 0,
          detail: check.error || `Received HTTP ${check.statusCode}.`,
        };
      } else if (!isDown && activeIncident) {
        activeIncident.status = 'Resolved';
        activeIncident.resolvedAt = check.checkedAt;
        activeIncident.durationMs = Math.max(0, checkedAt - Date.parse(activeIncident.startedAt));
        incidents.push(activeIncident);
        activeIncident = null;
      }
    }
    if (activeIncident) {
      activeIncident.durationMs = Math.max(0, now - Date.parse(activeIncident.startedAt));
      incidents.push(activeIncident);
    }
  }
  return incidents.sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
}

export function summarizeAnalytics(monitors, range, now = Date.now()) {
  const configuration = ANALYTICS_RANGES[range];
  if (!configuration) throw new Error('Choose a range of 24h, 7d, or 30d.');
  const since = now - configuration.durationMs;
  const bucketMs = configuration.durationMs / configuration.buckets;
  const buckets = Array.from({ length: configuration.buckets }, (_, index) => ({
    timestamp: since + index * bucketMs,
    checks: 0,
    successfulChecks: 0,
    responseTotal: 0,
    responseCount: 0,
  }));
  let checksCount = 0;
  let successfulChecks = 0;
  let responseTotal = 0;
  let responseCount = 0;

  for (const monitor of monitors) {
    for (const check of monitor.checks) {
      const checkedAt = Date.parse(check.checkedAt);
      if (!Number.isFinite(checkedAt) || checkedAt < since || checkedAt > now) continue;
      const isSuccessful = !check.error && monitor.expectedStatuses.includes(check.statusCode);
      const index = Math.min(
        configuration.buckets - 1,
        Math.floor((checkedAt - since) / bucketMs),
      );
      const bucket = buckets[index];
      checksCount += 1;
      bucket.checks += 1;
      if (isSuccessful) {
        successfulChecks += 1;
        bucket.successfulChecks += 1;
        if (Number.isFinite(check.responseMs)) {
          responseTotal += check.responseMs;
          responseCount += 1;
          bucket.responseTotal += check.responseMs;
          bucket.responseCount += 1;
        }
      }
    }
  }

  const incidents = buildIncidents(monitors, now);
  const downtimeMs = incidents.reduce((total, incident) => {
    const start = Math.max(since, Date.parse(incident.startedAt));
    const end = Math.min(now, incident.resolvedAt ? Date.parse(incident.resolvedAt) : now);
    return total + Math.max(0, end - start);
  }, 0);

  return {
    range,
    generatedAt: new Date(now).toISOString(),
    checksCount,
    uptime: checksCount ? (successfulChecks / checksCount) * 100 : null,
    averageResponseMs: responseCount ? responseTotal / responseCount : null,
    estimatedDowntimeMs: downtimeMs,
    points: buckets.filter((bucket) => bucket.checks > 0).map((bucket) => ({
      timestamp: new Date(bucket.timestamp).toISOString(),
      uptime: (bucket.successfulChecks / bucket.checks) * 100,
      averageResponseMs: bucket.responseCount ? bucket.responseTotal / bucket.responseCount : null,
      checksCount: bucket.checks,
    })),
  };
}

function relativeTime(timestamp) {
  if (!timestamp) return 'Never';
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(timestamp)) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function serializeMonitor(monitor) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentChecks = monitor.checks.filter((check) => Date.parse(check.checkedAt) >= cutoff);
  const successfulChecks = recentChecks.filter((check) => monitor.expectedStatuses.includes(check.statusCode) && !check.error);
  const uptime = recentChecks.length
    ? `${((successfulChecks.length / recentChecks.length) * 100).toFixed(2)}%`
    : '—';
  const latest = monitor.checks.at(-1);
  return {
    id: monitor.id,
    name: monitor.name,
    url: monitor.url,
    method: monitor.method,
    intervalSeconds: monitor.intervalSeconds,
    timeoutSeconds: monitor.timeoutSeconds,
    expectedStatuses: monitor.expectedStatuses,
    status: monitor.status || 'Checking',
    response: latest?.responseMs ?? null,
    uptime,
    checked: relativeTime(latest?.checkedAt),
    lastError: latest?.error || null,
    checks: monitor.checks.slice(-50).reverse(),
  };
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 16_384) throw new Error('Request body is too large.');
  }
  try {
    const body = JSON.parse(raw || '{}');
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new Error('Request body must be a JSON object.');
    }
    return body;
  } catch {
    throw new Error('Request body must be a JSON object.');
  }
}

export async function createAppServer({
  dataFile = DEFAULT_DATA_FILE,
  check = checkUrl,
  runScheduler = true,
} = {}) {
  await mkdir(dirname(dataFile), { recursive: true });
  let monitors;
  try {
    const stored = JSON.parse(await readFile(dataFile, 'utf8'));
    if (!Array.isArray(stored)) throw new Error('Monitor data must be an array.');
    monitors = stored;
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Could not load monitor data: ${error.message}`);
    monitors = [];
  }

  let saving = Promise.resolve();
  const checkTasks = new WeakMap();
  const save = () => {
    saving = saving.catch(() => {}).then(async () => {
      const temporaryFile = `${dataFile}.tmp`;
      await writeFile(temporaryFile, JSON.stringify(monitors, null, 2), 'utf8');
      await rename(temporaryFile, dataFile);
    });
    return saving;
  };

  const checkMonitor = (monitor) => {
    const activeTask = checkTasks.get(monitor);
    if (activeTask) return activeTask;
    monitor.checking = true;
    const task = (async () => {
      try {
        const result = await check(monitor.url, monitor.method, monitor.timeoutSeconds);
        const checkResult = {
          checkedAt: new Date().toISOString(),
          statusCode: result.statusCode,
          responseMs: result.responseMs,
          error: null,
        };
        monitor.status = statusFromCheck(checkResult, monitor.expectedStatuses);
        monitor.checks.push(checkResult);
      } catch (error) {
        const message = error.message === 'Request timed out.'
          ? 'Request timed out.'
          : error.message.includes('restricted network')
            ? error.message
            : `Request failed${error.code ? ` (${error.code})` : ''}.`;
        monitor.status = 'Down';
        monitor.checks.push({
          checkedAt: new Date().toISOString(),
          statusCode: null,
          responseMs: null,
          error: message,
        });
      } finally {
        monitor.checks = monitor.checks.slice(-MAX_CHECK_HISTORY);
        monitor.nextCheckAt = Date.now() + monitor.intervalSeconds * 1000;
        try {
          await save();
        } finally {
          monitor.checking = false;
          checkTasks.delete(monitor);
        }
      }
    })();
    checkTasks.set(monitor, task);
    return task;
  };

  const handleRequest = async (request, response) => {
    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      response.end();
      return;
    }
    response.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || 'http://localhost:5173');

    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok' });
      return;
    }
    if (url.pathname === '/api/monitors' && request.method === 'GET') {
      sendJson(response, 200, { monitors: monitors.map(serializeMonitor) });
      return;
    }
    if (url.pathname === '/api/analytics' && request.method === 'GET') {
      const range = url.searchParams.get('range') || '24h';
      if (!ANALYTICS_RANGES[range]) {
        sendJson(response, 400, { error: 'Choose a range of 24h, 7d, or 30d.' });
        return;
      }
      sendJson(response, 200, { analytics: summarizeAnalytics(monitors, range) });
      return;
    }
    if (url.pathname === '/api/incidents' && request.method === 'GET') {
      sendJson(response, 200, { incidents: buildIncidents(monitors) });
      return;
    }
    if (url.pathname === '/api/monitors' && request.method === 'POST') {
      let input;
      try {
        input = await readJson(request);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
        return;
      }
      const validated = validateMonitorInput(input);
      if (validated.errors) {
        sendJson(response, 400, { error: 'Check the monitor details.', fields: validated.errors });
        return;
      }
      const monitor = {
        id: randomUUID(),
        ...validated.value,
        status: 'Checking',
        checks: [],
        nextCheckAt: 0,
      };
      monitors.push(monitor);
      await checkMonitor(monitor);
      sendJson(response, 201, { monitor: serializeMonitor(monitor) });
      return;
    }

    const match = url.pathname.match(/^\/api\/monitors\/([a-f\d-]+)$/i);
    if (!match) {
      sendJson(response, 404, { error: 'Route not found.' });
      return;
    }
    const index = monitors.findIndex((monitor) => monitor.id === match[1]);
    if (index < 0) {
      sendJson(response, 404, { error: 'Monitor not found.' });
      return;
    }
    if (request.method === 'DELETE') {
      monitors.splice(index, 1);
      await save();
      sendJson(response, 200, { deleted: true });
      return;
    }
    if (request.method === 'PUT') {
      let input;
      try {
        input = await readJson(request);
      } catch (error) {
        sendJson(response, 400, { error: error.message });
        return;
      }
      const monitor = monitors[index];
      const activeCheck = checkTasks.get(monitor);
      if (activeCheck) await activeCheck;
      const validated = validateMonitorInput(input, monitor);
      if (validated.errors) {
        sendJson(response, 400, { error: 'Check the monitor details.', fields: validated.errors });
        return;
      }
      const endpointChanged = validated.value.url !== monitor.url ||
        validated.value.method !== monitor.method ||
        JSON.stringify(validated.value.expectedStatuses) !== JSON.stringify(monitor.expectedStatuses);
      Object.assign(monitor, validated.value);
      if (endpointChanged) {
        monitor.checks = [];
        monitor.status = 'Checking';
        monitor.nextCheckAt = 0;
        await checkMonitor(monitor);
      } else {
        await save();
      }
      sendJson(response, 200, { monitor: serializeMonitor(monitor) });
      return;
    }
    sendJson(response, 405, { error: 'Method not allowed.' });
  };
  const server = createHttpServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      console.error('PulseWatch API request failed:', error);
      if (response.headersSent) response.destroy(error);
      else sendJson(response, 500, { error: 'Internal server error.' });
    });
  });

  const scheduler = runScheduler
    ? setInterval(() => {
      const now = Date.now();
      for (const monitor of monitors) {
        if (!monitor.checking && monitor.nextCheckAt <= now) {
          void checkMonitor(monitor).catch((error) => console.error('Scheduled monitor check failed:', error));
        }
      }
    }, 1000)
    : null;
  scheduler?.unref();
  server.once('close', () => {
    if (scheduler) clearInterval(scheduler);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createAppServer();
  const port = Number(process.env.PORT || 3001);
  const host = process.env.HOST || '127.0.0.1';
  server.listen(port, host, () => {
    console.log(`PulseWatch API listening on http://${host}:${port}`);
  });
}

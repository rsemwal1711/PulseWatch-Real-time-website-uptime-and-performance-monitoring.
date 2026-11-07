import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  buildIncidents,
  createAppServer,
  isPublicAddress,
  statusFromCheck,
  summarizeAnalytics,
  validateMonitorInput,
} from './server.js';

test('monitor input validates HTTP URLs and supported configuration', () => {
  const valid = validateMonitorInput({
    name: 'Production',
    url: 'https://example.com/health',
    method: 'HEAD',
    intervalSeconds: 300,
    timeoutSeconds: 5,
    expectedStatuses: [200, 204],
  });
  assert.equal(valid.errors, undefined);
  assert.deepEqual(valid.value.expectedStatuses, [200, 204]);

  const invalid = validateMonitorInput({
    name: 'Local endpoint',
    url: 'file:///etc/passwd',
    intervalSeconds: 30,
    expectedStatuses: [99],
  });
  assert.ok(invalid.errors.url);
  assert.ok(invalid.errors.intervalSeconds);
  assert.ok(invalid.errors.expectedStatuses);
});

test('URL checking rejects restricted IP ranges', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.20.1.1', '192.168.1.1', '169.254.169.254', '::1', 'fc00::1', '2002:7f00:1::1', '3fff::1']) {
    assert.equal(isPublicAddress(address), false, `${address} must be blocked`);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
    assert.equal(isPublicAddress(address), true, `${address} must be allowed`);
  }
});

test('check status derives from expected HTTP response and latency', () => {
  assert.equal(statusFromCheck({ statusCode: 200, responseMs: 200 }, [200]), 'Operational');
  assert.equal(statusFromCheck({ statusCode: 503, responseMs: 200 }, [200]), 'Down');
  assert.equal(statusFromCheck({ statusCode: 200, responseMs: 1200 }, [200]), 'Degraded');
  assert.equal(statusFromCheck({ error: 'Request failed.' }, [200]), 'Down');
});

test('analytics summarizes recorded checks and detected downtime', () => {
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  const monitors = [{
    id: 'monitor-1',
    name: 'Production',
    url: 'https://example.com',
    intervalSeconds: 60,
    expectedStatuses: [200],
    checks: [
      { checkedAt: new Date(now - 20 * 60_000).toISOString(), statusCode: 200, responseMs: 100, error: null },
      { checkedAt: new Date(now - 10 * 60_000).toISOString(), statusCode: 503, responseMs: 50, error: null },
      { checkedAt: new Date(now - 5 * 60_000).toISOString(), statusCode: 200, responseMs: 300, error: null },
      { checkedAt: new Date(now - 2 * 60_000).toISOString(), statusCode: null, responseMs: null, error: 'Request timed out.' },
    ],
  }];

  const analytics = summarizeAnalytics(monitors, '24h', now);
  assert.equal(analytics.checksCount, 4);
  assert.equal(analytics.uptime, 50);
  assert.equal(analytics.averageResponseMs, 200);
  assert.equal(analytics.estimatedDowntimeMs, 7 * 60_000);
  assert.equal(analytics.points.reduce((total, point) => total + point.checksCount, 0), 4);

  const incidents = buildIncidents(monitors, now);
  assert.equal(incidents.length, 2);
  assert.equal(incidents[0].status, 'Ongoing');
  assert.equal(incidents[0].durationMs, 2 * 60_000);
  assert.equal(incidents[1].status, 'Resolved');
  assert.equal(incidents[1].durationMs, 5 * 60_000);
});

test('analytics rejects unsupported ranges', () => {
  assert.throws(() => summarizeAnalytics([], '90d'), /24h, 7d, or 30d/);
});

test('API responds and rejects invalid monitor configuration', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pulsewatch-test-'));
  const server = await createAppServer({
    dataFile: join(directory, 'monitors.json'),
    runScheduler: false,
    check: async () => ({ statusCode: 200, responseMs: 10 }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const response = await fetch(`${baseUrl}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid', url: 'http://example.com', expectedStatuses: [99] }),
    });
    assert.equal(response.status, 400);
    assert.ok((await response.json()).fields.expectedStatuses);
  } finally {
    server.close();
    await once(server, 'close');
    await rm(directory, { recursive: true, force: true });
  }
});

test('API creates, updates, persists, and deletes monitors', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pulsewatch-test-'));
  const dataFile = join(directory, 'monitors.json');
  const server = await createAppServer({
    dataFile,
    runScheduler: false,
    check: async () => ({ statusCode: 200, responseMs: 42 }),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}/api/monitors`;
  try {
    const createdResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Production',
        url: 'https://example.com/health',
        method: 'GET',
        intervalSeconds: 60,
        timeoutSeconds: 10,
        expectedStatuses: [200],
      }),
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).monitor;
    assert.equal(created.status, 'Operational');
    assert.equal(created.response, 42);
    assert.equal(created.checks.length, 1);

    const updatedResponse = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Production website' }),
    });
    assert.equal((await updatedResponse.json()).monitor.name, 'Production website');

    const listResponse = await fetch(baseUrl);
    assert.equal((await listResponse.json()).monitors[0].name, 'Production website');

    const analyticsResponse = await fetch(`${baseUrl.replace('/monitors', '')}/analytics?range=24h`);
    const analytics = (await analyticsResponse.json()).analytics;
    assert.equal(analytics.checksCount, 1);
    assert.equal(analytics.uptime, 100);
    assert.equal(analytics.averageResponseMs, 42);

    const incidentsResponse = await fetch(`${baseUrl.replace('/monitors', '')}/incidents`);
    assert.deepEqual((await incidentsResponse.json()).incidents, []);

    const deletedResponse = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' });
    assert.equal(deletedResponse.status, 200);
    assert.deepEqual((await (await fetch(baseUrl)).json()).monitors, []);
  } finally {
    server.close();
    await once(server, 'close');
    await rm(directory, { recursive: true, force: true });
  }
});

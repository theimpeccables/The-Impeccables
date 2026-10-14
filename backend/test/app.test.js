import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

test('health endpoint reports a live API and request id', async (t) => {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.service, 'theimpeccables-api');
  assert.ok(response.headers.get('x-request-id'));
});

test('unknown API paths return the standard not-found envelope', async (t) => {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/does-not-exist`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('group, meeting and task write endpoints reject unauthenticated requests', async (t) => {
  const server = createServer(createApp());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const attempts = await Promise.all([
    fetch(`${origin}/api/groups`),
    fetch(`${origin}/api/groups`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Unauthorized group' }) }),
    fetch(`${origin}/api/meetings`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Unauthorized meeting' }) }),
    fetch(`${origin}/api/meetings/507f1f77bcf86cd799439011`),
    fetch(`${origin}/api/meetings/507f1f77bcf86cd799439011/agenda`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ agenda: 'No access' }) }),
    fetch(`${origin}/api/meetings/507f1f77bcf86cd799439011/conclusion`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ conclusion: 'No access' }) }),
    fetch(`${origin}/api/meetings/507f1f77bcf86cd799439011/attendance/507f1f77bcf86cd799439012`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'present' }) }),
    fetch(`${origin}/api/meetings/507f1f77bcf86cd799439011/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm: true }) }),
    fetch(`${origin}/api/tasks`),
    fetch(`${origin}/api/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Unauthorized task', dueAt: new Date().toISOString() }) }),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011`),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011/submissions/507f1f77bcf86cd799439012/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) }),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011/comments`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ body: 'No access' }) }),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011/remind`, { method: 'POST' }),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011`, { method: 'DELETE' }),
    fetch(`${origin}/api/tasks/507f1f77bcf86cd799439011/assignees`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userIds: ['507f1f77bcf86cd799439012'] }) }),
  ]);
  for (const response of attempts) {
    const body = await response.json();
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'AUTHENTICATION_REQUIRED');
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { persistInstallationCommand } from '../src/services/operationalCommands.js';

test('persists an installation transition and audit event', async () => {
  const calls = [];
  const pb = {
    collection(name) {
      return {
        async getFirstListItem() { return null; },
        async create(payload) { calls.push([name, 'create', payload]); return { id: 'new-1', ...payload }; },
        async update(id, payload) { calls.push([name, 'update', id, payload]); return { id, ...payload }; },
      };
    },
  };

  const result = await persistInstallationCommand(pb, {
    orderId: 'AMZ-1',
    from: 'Assigned',
    to: 'Accepted',
    actorId: 'tech-1',
    idempotencyKey: 'cmd-1',
  });

  assert.equal(result.status, 'Accepted');
  assert.equal(calls[0][0], 'installations');
  assert.equal(calls[1][0], 'audit_events');
});

test('rejects a stale installation transition', async () => {
  const pb = {
    collection() {
      return { async getFirstListItem() { return { id: 'installation-1', status: 'Completed', version: 2, last_command_id: 'other' }; } };
    },
  };

  await assert.rejects(
    persistInstallationCommand(pb, { orderId: 'AMZ-1', from: 'Assigned', to: 'Accepted', actorId: 'tech-1', idempotencyKey: 'cmd-2', version: 2 }),
    /version conflict/
  );
});

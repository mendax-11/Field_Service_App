import assert from 'node:assert/strict';
import test from 'node:test';

import { enqueueCommand, markCommandFailed, markCommandConflict } from '../src/domain/offlineQueue.js';

test('enqueues a pending command with an idempotency key', () => {
  const command = enqueueCommand([], { type: 'installation.transition', orderId: 'o1' }, 'cmd-1');
  assert.deepEqual(command[0], {
    type: 'installation.transition',
    orderId: 'o1',
    idempotencyKey: 'cmd-1',
    status: 'pending',
    retries: 0,
  });
});

test('moves a command to failed after retry limit', () => {
  const command = [{ idempotencyKey: 'cmd-1', status: 'pending', retries: 4 }];
  assert.equal(markCommandFailed(command, 'cmd-1', 'Network unavailable')[0].status, 'failed');
});

test('records conflicts without deleting the command', () => {
  const command = markCommandConflict([{ idempotencyKey: 'cmd-1', status: 'pending' }], 'cmd-1', 'Version mismatch');
  assert.equal(command[0].status, 'conflict');
  assert.equal(command[0].lastError, 'Version mismatch');
});

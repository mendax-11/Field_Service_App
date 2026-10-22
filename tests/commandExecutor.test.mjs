import assert from 'node:assert/strict';
import test from 'node:test';

import { executeInstallationCommand } from '../src/domain/commandExecutor.js';

test('executes a command once and returns the same result for duplicate delivery', () => {
  const calls = [];
  const command = {
    idempotencyKey: 'cmd-1',
    orderId: 'order-1',
    from: 'Assigned',
    to: 'Accepted',
    actorId: 'tech-1',
  };
  const first = executeInstallationCommand(command, {
    getOrder: () => ({ id: 'order-1', status: 'Assigned', assignedCarpenterId: 'tech-1' }),
    apply: next => calls.push(next),
    audit: event => calls.push(event),
  });
  const second = executeInstallationCommand(command, {
    getOrder: () => ({ id: 'order-1', status: 'Assigned', assignedCarpenterId: 'tech-1' }),
    apply: next => calls.push(next),
    audit: event => calls.push(event),
  });

  assert.equal(first, second);
  assert.equal(calls.length, 2);
});

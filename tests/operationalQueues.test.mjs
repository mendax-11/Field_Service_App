import assert from 'node:assert/strict';
import test from 'node:test';

import { getOperationalQueues } from '../src/domain/operationalQueues.js';

test('groups unassigned and replacement-held jobs into dispatcher queues', () => {
  const queues = getOperationalQueues([
    { id: 'a', status: 'Unassigned', promiseDate: '2026-10-23' },
    { id: 'b', status: 'Replacement Hold', promiseDate: '2026-10-30' },
  ], new Date('2026-10-22T10:00:00Z'));

  assert.deepEqual(queues.unassigned.map(order => order.id), ['a']);
  assert.deepEqual(queues.replacementHold.map(order => order.id), ['b']);
});

test('marks incomplete jobs due today or overdue as SLA risk', () => {
  const queues = getOperationalQueues([
    { id: 'today', status: 'Assigned', promiseDate: '2026-10-22' },
    { id: 'overdue', status: 'In Progress', promiseDate: '2026-10-21' },
    { id: 'future', status: 'Assigned', promiseDate: '2026-10-24' },
    { id: 'done', status: 'Completed', promiseDate: '2026-10-21' },
  ], new Date('2026-10-22T10:00:00Z'));

  assert.deepEqual(queues.slaRisk.map(order => order.id), ['today', 'overdue']);
});

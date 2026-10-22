import assert from 'node:assert/strict';
import test from 'node:test';

import { buildInstallationCommand, buildAssignmentCommand, buildReplacementCommand, buildPayoutCommand } from '../src/domain/commands.js';

test('builds an accepted command for the assigned carpenter', () => {
  assert.deepEqual(
    buildInstallationCommand(
      { id: 'order-1', status: 'Assigned', assignedCarpenterId: 'tech-1' },
      'Accepted',
      { id: 'tech-1', role: 'Carpenter' },
    ),
    {
      type: 'installation.transition',
      orderId: 'order-1',
      from: 'Assigned',
      to: 'Accepted',
      actorId: 'tech-1',
    },
  );
});

test('rejects a carpenter command for another carpenter\'s order', () => {
  assert.throws(
    () => buildInstallationCommand(
      { id: 'order-1', status: 'Assigned', assignedCarpenterId: 'tech-1' },
      'Accepted',
      { id: 'tech-2', role: 'Carpenter' },
    ),
    /not authorized/i,
  );
});

test('requires verification for a completion command', () => {
  assert.throws(
    () => buildInstallationCommand(
      { id: 'order-1', status: 'Awaiting Verification', assignedCarpenterId: 'tech-1' },
      'Completed',
      { id: 'tech-1', role: 'Carpenter' },
    ),
    /customer verification/i,
  );
});

test('builds a dispatcher assignment command for an unassigned job', () => {
  assert.deepEqual(
    buildAssignmentCommand({ id: 'order-2', status: 'Unassigned' }, 'tech-1', { id: 'dispatcher-1', role: 'Dispatcher' }),
    { type: 'installation.assignment', orderId: 'order-2', technicianId: 'tech-1', actorId: 'dispatcher-1' },
  );
});

test('builds a replacement dispatch command only from a pending request', () => {
  assert.deepEqual(
    buildReplacementCommand({ id: 'order-3', replacementStatus: 'Approved' }, { id: 'inventory-1', role: 'Inventory Manager' }),
    { type: 'replacement.dispatch', orderId: 'order-3', actorId: 'inventory-1' },
  );
});

test('builds a payout command only for completed unpaid jobs', () => {
  assert.deepEqual(
    buildPayoutCommand({ id: 'order-4', status: 'Completed', paymentStatus: 'Pending Payout' }, { id: 'admin-1', role: 'Super Admin' }),
    { type: 'payout.clear', orderId: 'order-4', actorId: 'admin-1' },
  );
});

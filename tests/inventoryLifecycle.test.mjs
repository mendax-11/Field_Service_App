import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransitionInventory, createInventoryMovement, validateInventoryTransition } from '../src/domain/inventoryLifecycle.js';

test('allows a reserved part to be dispatched and returned', () => {
  assert.equal(canTransitionInventory('Reserved', 'Dispatched'), true);
  assert.equal(canTransitionInventory('Dispatched', 'Returned'), true);
});

test('rejects dispatching an available part without reservation', () => {
  assert.throws(() => validateInventoryTransition('Available', 'Dispatched'), /Invalid inventory transition/);
});

test('creates an auditable inventory movement', () => {
  const movement = createInventoryMovement({ partId: 'PART-1', orderId: 'AMZ-1', from: 'Reserved', to: 'Dispatched', actorId: 'inventory-1', reason: 'Replacement dispatch' });
  assert.deepEqual(movement, { ...movement, partId: 'PART-1', orderId: 'AMZ-1', from: 'Reserved', to: 'Dispatched', quantity: 1, actorId: 'inventory-1', reason: 'Replacement dispatch' });
  assert.equal(typeof movement.timestamp, 'string');
});

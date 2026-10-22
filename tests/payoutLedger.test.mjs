import assert from 'node:assert/strict';
import test from 'node:test';

import { createPayoutEntry, createPayoutAdjustment, summarizeLedger } from '../src/domain/payoutLedger.js';

test('creates a payout entry only for a completed job', () => {
  assert.throws(() => createPayoutEntry({ id: 'o1', status: 'Assigned', payout: 500 }, 'admin'), /completed/i);
  assert.equal(createPayoutEntry({ id: 'o1', status: 'Completed', payout: 500 }, 'admin').amount, 500);
});

test('represents a correction as an adjustment instead of changing the original entry', () => {
  const original = createPayoutEntry({ id: 'o1', status: 'Completed', payout: 500 }, 'admin');
  const adjustment = createPayoutAdjustment(original, 100, 'Extra travel');
  assert.equal(original.amount, 500);
  assert.equal(adjustment.amount, 100);
  assert.equal(adjustment.type, 'Adjustment');
  assert.equal(summarizeLedger([original, adjustment]), 600);
});

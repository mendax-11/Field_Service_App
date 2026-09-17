import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeExpenseClaims } from '../src/utils/expenseClaims.js';
import { ensureOtp } from '../src/utils/otp.js';
import { ensureAccessPin } from '../src/utils/otp.js';

test('keeps locally submitted pending reimbursement claims when server claims are stale', () => {
  const localClaim = {
    id: 'ec_local_1',
    type: 'Extra Travel Distance',
    amount: 350,
    notes: 'Customer changed site entrance',
    status: 'Pending Approval',
    requestedBy: 'Asha',
    timestamp: '2026-09-12T09:00:00.000Z'
  };

  const merged = mergeExpenseClaims([localClaim], []);

  assert.deepEqual(merged, [localClaim]);
});

test('deduplicates the same reimbursement claim from structured and server payloads', () => {
  const localClaim = {
    id: 'ec_local_1',
    type: 'Hardware Purchased',
    amount: 540,
    notes: 'Bought screws',
    status: 'Pending Approval',
    timestamp: '2026-09-12T09:00:00.000Z'
  };
  const serverClaim = {
    id: 'ec_server_1',
    type: 'Hardware Purchased',
    amount: 540,
    notes: 'Bought screws',
    status: 'Pending Approval',
    timestamp: '2026-09-12T09:00:00.000Z'
  };

  const merged = mergeExpenseClaims([localClaim], [serverClaim]);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], serverClaim);
});

test('preserves an existing OTP, including the legacy 1234 value', () => {
  assert.equal(ensureOtp('1234', () => '9876'), '1234');
});

test('generates an OTP only when the stored value is missing', () => {
  assert.equal(ensureOtp('', () => '9876'), '9876');
});

test('generates a four digit access PIN only when the stored PIN is missing', () => {
  assert.equal(ensureAccessPin('', () => '4821'), '4821');
  assert.equal(ensureAccessPin('1234', () => '4821'), '1234');
});

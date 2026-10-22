import assert from 'node:assert/strict';
import test from 'node:test';

import { canUseDemoAuthentication, getSessionUser } from '../src/auth/session.js';

test('does not trust a locally cached user when there is no PocketBase session', () => {
  assert.equal(getSessionUser({ isValid: false, model: null }, { role: 'Super Admin' }), null);
});

test('returns the PocketBase user when the auth session is valid', () => {
  const model = { id: 'u1', role: 'Dispatcher', name: 'Dispatcher' };
  assert.deepEqual(getSessionUser({ isValid: true, model }, { role: 'Super Admin' }), model);
});

test('demo authentication is disabled outside development', () => {
  assert.equal(canUseDemoAuthentication({ DEV: false }), false);
  assert.equal(canUseDemoAuthentication({ DEV: true }), true);
});

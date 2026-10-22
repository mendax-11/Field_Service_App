import assert from 'node:assert/strict';
import test from 'node:test';

import { canTransitionReplacement } from '../src/domain/replacementWorkflow.js';

test('allows dispatch only from a pending replacement request', () => {
  assert.equal(canTransitionReplacement('Pending', 'Dispatched'), true);
  assert.equal(canTransitionReplacement('Approved', 'Dispatched'), true);
  assert.equal(canTransitionReplacement('Dispatched', 'Dispatched'), false);
});

test('does not allow a rejected or completed replacement to be dispatched', () => {
  assert.equal(canTransitionReplacement('Rejected', 'Dispatched'), false);
  assert.equal(canTransitionReplacement('Completed', 'Dispatched'), false);
});

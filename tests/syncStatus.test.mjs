import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeSyncQueue } from '../src/domain/syncStatus.js';

test('summarizes pending, failed, and conflicted sync operations', () => {
  assert.deepEqual(
    summarizeSyncQueue([
      { status: 'pending' },
      { status: 'failed' },
      { status: 'conflict' },
      { status: 'done' },
    ]),
    { pending: 1, failed: 1, conflicts: 1, completed: 1 },
  );
});

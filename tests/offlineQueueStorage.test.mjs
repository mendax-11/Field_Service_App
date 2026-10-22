import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryQueueStorage } from '../src/utils/offlineQueueStorage.js';

test('memory queue storage persists and replaces commands', async () => {
  const storage = createMemoryQueueStorage();
  await storage.replace([{ idempotencyKey: 'cmd-1', status: 'pending' }]);
  assert.deepEqual(await storage.list(), [{ idempotencyKey: 'cmd-1', status: 'pending' }]);
});

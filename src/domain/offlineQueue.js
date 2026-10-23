const MAX_RETRIES = 5;

export function isSyncConflict(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('version conflict')
    || message.includes('invalid installation transition')
    || message.includes('customer verification is required');
}

export function enqueueCommand(queue, command, idempotencyKey) {
  if (!idempotencyKey) throw new Error('An idempotency key is required');
  if (queue.some(item => item.idempotencyKey === idempotencyKey)) return queue;
  return [...queue, { ...command, idempotencyKey, status: 'pending', retries: 0 }];
}

export function markCommandFailed(queue, idempotencyKey, error) {
  return queue.map(command => command.idempotencyKey !== idempotencyKey
    ? command
    : {
      ...command,
      retries: (command.retries || 0) + 1,
      status: (command.retries || 0) + 1 >= MAX_RETRIES ? 'failed' : 'pending',
      lastError: error,
    });
}

export function markCommandConflict(queue, idempotencyKey, error) {
  return queue.map(command => command.idempotencyKey !== idempotencyKey
    ? command
    : { ...command, status: 'conflict', lastError: error });
}

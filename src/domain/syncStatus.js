export function summarizeSyncQueue(queue = []) {
  return queue.reduce((summary, operation) => {
    if (operation.status === 'pending') summary.pending += 1;
    else if (operation.status === 'failed') summary.failed += 1;
    else if (operation.status === 'conflict') summary.conflicts += 1;
    else if (operation.status === 'done') summary.completed += 1;
    return summary;
  }, { pending: 0, failed: 0, conflicts: 0, completed: 0 });
}

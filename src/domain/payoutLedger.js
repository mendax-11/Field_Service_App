export function createPayoutEntry(order, actor) {
  const status = order.jobStatus || order.status;
  if (status !== 'Completed') throw new Error('Only completed jobs can create a payout entry');

  return {
    id: `payout_${order.id || order.orderId || order.order_id}_${Date.now()}`,
    orderId: order.id || order.orderId || order.order_id,
    type: 'Payout',
    amount: Number(order.payout || order.assembly_payout || 0),
    actor,
    createdAt: new Date().toISOString(),
  };
}

export function createPayoutAdjustment(entry, amount, reason) {
  if (!entry?.id || !reason?.trim()) throw new Error('A payout entry and reason are required');
  return {
    id: `adjustment_${entry.orderId}_${Date.now()}`,
    orderId: entry.orderId,
    type: 'Adjustment',
    amount: Number(amount),
    reason: reason.trim(),
    actor: entry.actor,
    createdAt: new Date().toISOString(),
    parentEntryId: entry.id,
  };
}

export function summarizeLedger(entries = []) {
  return entries.reduce((total, entry) => total + Number(entry.amount || 0), 0);
}

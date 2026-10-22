const CLOSED_STATES = new Set(['Completed', 'Cancelled']);

function dateOnly(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getOperationalQueues(orders = [], now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const queues = {
    unassigned: [],
    slaRisk: [],
    rejected: [],
    replacementHold: [],
    paymentPending: [],
  };

  for (const order of orders) {
    const status = order.jobStatus || order.status || 'Unassigned';
    const paymentStatus = order.paymentStatus || order.payment_status || '';
    const replacement = order.damageReport || order.damage_report || order.replacementRequest || order.replacement_request;
    const promiseDate = dateOnly(order.promiseDate || order.promise_date);

    if (status === 'Unassigned') queues.unassigned.push(order);
    if (status === 'Rejected') queues.rejected.push(order);
    if (status === 'Replacement Hold' || replacement?.status === 'Pending' || replacement?.status === 'Requested') queues.replacementHold.push(order);
    if (!CLOSED_STATES.has(status) && promiseDate && promiseDate <= today) queues.slaRisk.push(order);
    if (status === 'Completed' && paymentStatus && !['Paid', 'Collected on-site'].includes(paymentStatus)) queues.paymentPending.push(order);
  }

  return queues;
}

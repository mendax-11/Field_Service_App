export const NOTIFICATION_EVENTS = Object.freeze({
  ASSIGNED: 'installation.assigned',
  TRANSIT_STARTED: 'installation.transit_started',
  SLA_BREACH: 'installation.sla_breach',
  PARTS_DISPATCHED: 'replacement.parts_dispatched',
  COMPLETED: 'installation.completed',
  PAYOUT_PENDING: 'payout.pending',
  SYNC_CONFLICT: 'sync.conflict',
});

const EVENT_DEFAULTS = {
  [NOTIFICATION_EVENTS.ASSIGNED]: { severity: 'info', audience: ['technician', 'dispatcher'], title: 'New installation assigned' },
  [NOTIFICATION_EVENTS.TRANSIT_STARTED]: { severity: 'info', audience: ['customer', 'dispatcher'], title: 'Technician is on the way' },
  [NOTIFICATION_EVENTS.SLA_BREACH]: { severity: 'critical', audience: ['dispatcher', 'support'], title: 'SLA breach requires attention' },
  [NOTIFICATION_EVENTS.PARTS_DISPATCHED]: { severity: 'warning', audience: ['technician', 'dispatcher'], title: 'Replacement parts dispatched' },
  [NOTIFICATION_EVENTS.COMPLETED]: { severity: 'success', audience: ['customer', 'dispatcher'], title: 'Installation completed' },
  [NOTIFICATION_EVENTS.PAYOUT_PENDING]: { severity: 'info', audience: ['technician', 'finance'], title: 'Payout is pending' },
  [NOTIFICATION_EVENTS.SYNC_CONFLICT]: { severity: 'critical', audience: ['dispatcher', 'support'], title: 'Offline sync conflict' },
};

export function createNotificationEvent(type, data = {}) {
  const defaults = EVENT_DEFAULTS[type];
  if (!defaults) throw new Error(`Unknown notification event: ${type}`);
  if (!data.orderId) throw new Error('Notification events require an order ID');
  return {
    id: `${type}_${data.orderId}_${Date.now()}`,
    type,
    ...defaults,
    orderId: data.orderId,
    message: data.message || defaults.title,
    metadata: data.metadata || {},
    createdAt: new Date().toISOString(),
    read: false,
  };
}

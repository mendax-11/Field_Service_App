import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotificationEvent, NOTIFICATION_EVENTS } from '../src/domain/notificationEvents.js';

test('creates a typed critical SLA notification', () => {
  const event = createNotificationEvent(NOTIFICATION_EVENTS.SLA_BREACH, { orderId: 'AMZ-1', message: 'Order is overdue' });
  assert.equal(event.type, 'installation.sla_breach');
  assert.equal(event.severity, 'critical');
  assert.deepEqual(event.audience, ['dispatcher', 'support']);
  assert.equal(event.read, false);
});

test('rejects unknown notification types and missing orders', () => {
  assert.throws(() => createNotificationEvent('unknown', { orderId: 'AMZ-1' }), /Unknown notification event/);
  assert.throws(() => createNotificationEvent(NOTIFICATION_EVENTS.COMPLETED), /order ID/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { filterOrders, getActiveOrderFilters } from '../src/domain/orderFilters.js';

const orders = [
  { id: 'a', deliveryStatus: 'Pending', paymentStatus: 'Unpaid', jobStatus: 'Assigned', city: 'Mumbai', pincode: '400001', promiseDate: '2026-10-23' },
  { id: 'b', deliveryStatus: 'Delivered', paymentStatus: 'Paid', jobStatus: 'Completed', city: 'Delhi', pincode: '110001', promiseDate: '2026-10-20' },
  { id: 'c', deliveryStatus: 'Pending', paymentStatus: 'Pending Payout', jobStatus: 'In Progress', city: 'Mumbai', pincode: '400002', deliveryDate: '2026-10-22' },
];

test('filters by delivery, payment, and location', () => {
  assert.deepEqual(filterOrders(orders, { deliveryStatus: 'Pending', paymentStatus: 'Unpaid', location: '400001' }, new Date('2026-10-22')), [orders[0]]);
});

test('filters SLA risk while excluding completed jobs', () => {
  assert.deepEqual(filterOrders(orders, { slaBucket: 'due_today' }, new Date('2026-10-22')).map(order => order.id), ['c']);
});

test('returns active filter labels', () => {
  assert.deepEqual(getActiveOrderFilters({ deliveryStatus: 'Pending', paymentStatus: 'All', location: 'Mumbai' }), [
    { key: 'deliveryStatus', label: 'Delivery: Pending' },
    { key: 'location', label: 'Location: Mumbai' },
  ]);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOrderQueryFilter, getOrderQueryOptions } from '../src/domain/orderQuery.js';

test('builds an escaped server filter for operational order fields', () => {
  assert.equal(
    buildOrderQueryFilter({
      platform: 'Amazon',
      jobStatus: 'Assigned',
      deliveryStatus: 'Pending',
      paymentStatus: 'Unpaid',
      carpenter: 'Unassigned',
      location: 'Mumbai',
      search: 'AMZ-1001'
    }),
    'platform="Amazon" && assembly_status="Assigned" && delivery_status="Pending" && payment_status="Unpaid" && (assigned_carpenter="" || assigned_carpenter=null) && (city~"Mumbai" || pincode~"Mumbai") && (order_id~"AMZ-1001" || customer_name~"AMZ-1001" || customer_phone~"AMZ-1001" || product_sku~"AMZ-1001") && (archived=false || archived=null)'
  );
});

test('escapes filter input and omits the archive clause when requested', () => {
  const filter = buildOrderQueryFilter({ search: 'x" || id~"' , showArchived: true });
  assert.equal(filter, '(order_id~"x\\\" || id~\\\"" || customer_name~"x\\\" || id~\\\"" || customer_phone~"x\\\" || id~\\\"" || product_sku~"x\\\" || id~\\\"")');
});

test('returns query options with a stable default sort', () => {
  assert.deepEqual(getOrderQueryOptions({}), { filter: '(archived=false || archived=null)', sort: '-created' });
});

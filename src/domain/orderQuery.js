const escapeFilterValue = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const equals = (field, value) => `${field}="${escapeFilterValue(value)}"`;

export function buildOrderQueryFilter(filters = {}) {
  const clauses = [];
  const addEquals = (field, value) => {
    if (value && value !== 'All') clauses.push(equals(field, value));
  };

  addEquals('platform', filters.platform);
  addEquals('assembly_status', filters.jobStatus);
  addEquals('delivery_status', filters.deliveryStatus);
  addEquals('payment_status', filters.paymentStatus);
  addEquals('payment_type', filters.paymentType);

  if (filters.carpenter && filters.carpenter !== 'All') {
    if (filters.carpenter === 'Unassigned') {
      clauses.push('(assigned_carpenter="" || assigned_carpenter=null)');
    } else {
      clauses.push(equals('assigned_carpenter_name', filters.carpenter));
    }
  }

  if (filters.location) {
    const location = escapeFilterValue(filters.location);
    clauses.push(`(city~"${location}" || pincode~"${location}")`);
  }

  if (filters.search) {
    const search = escapeFilterValue(filters.search);
    clauses.push(`(order_id~"${search}" || customer_name~"${search}" || customer_phone~"${search}" || product_sku~"${search}")`);
  }

  if (filters.showArchived !== true) {
    clauses.push('(archived=false || archived=null)');
  }

  return clauses.length ? clauses.join(' && ') : '';
}

export function getOrderQueryOptions(filters = {}) {
  return {
    filter: buildOrderQueryFilter(filters),
    sort: filters.sort || '-created'
  };
}

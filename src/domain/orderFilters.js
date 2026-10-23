const CLOSED_STATES = new Set(['Completed', 'Cancelled']);

function dateOnly(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function matchesDateBucket(order, bucket, today) {
  if (bucket === 'All') return true;
  const date = dateOnly(order.promiseDate || order.promise_date || order.deliveryDate || order.delivery_date);
  if (!date) return false;
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 7);
  if (bucket === 'today') return date.getTime() === today.getTime();
  if (bucket === 'next_7_days') return date >= today && date <= end;
  if (bucket === 'overdue') return date < today;
  return true;
}

function matchesSla(order, bucket, today) {
  if (bucket === 'All') return true;
  const status = order.jobStatus || order.status || '';
  if (CLOSED_STATES.has(status)) return false;
  const date = dateOnly(order.promiseDate || order.promise_date || order.deliveryDate || order.delivery_date);
  if (!date) return false;
  if (bucket === 'overdue') return date < today;
  if (bucket === 'due_today') return date.getTime() === today.getTime();
  if (bucket === 'due_this_week') {
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + 7);
    return date >= today && date <= end;
  }
  return true;
}

export function filterOrders(orders, filters = {}, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const search = String(filters.search || '').toLowerCase();
  return orders.filter(order => {
    const searchable = [order.orderId, order.customerName, order.customerPhone, order.sku, order.city, order.pincode].filter(Boolean).join(' ').toLowerCase();
    return (!search || searchable.includes(search))
      && (!filters.platform || filters.platform === 'All' || order.platform === filters.platform)
      && (!filters.jobStatus || filters.jobStatus === 'All' || order.jobStatus === filters.jobStatus)
      && (!filters.carpenter || filters.carpenter === 'All' || (filters.carpenter === 'Unassigned' ? !order.assignedCarpenter : order.assignedCarpenter === filters.carpenter))
      && (!filters.paymentType || filters.paymentType === 'All' || order.paymentType === filters.paymentType)
      && (!filters.deliveryStatus || filters.deliveryStatus === 'All' || order.deliveryStatus === filters.deliveryStatus)
      && (!filters.paymentStatus || filters.paymentStatus === 'All' || order.paymentStatus === filters.paymentStatus)
      && (!filters.location || `${order.city || ''} ${order.pincode || ''}`.toLowerCase().includes(String(filters.location).toLowerCase()))
      && matchesSla(order, filters.slaBucket || 'All', today)
      && matchesDateBucket(order, filters.dateBucket || 'All', today);
  });
}

export function getActiveOrderFilters(filters = {}) {
  const labels = [];
  if (filters.search) labels.push({ key: 'search', label: `Search: ${filters.search}` });
  if (filters.platform && filters.platform !== 'All') labels.push({ key: 'platform', label: `Platform: ${filters.platform}` });
  if (filters.jobStatus && filters.jobStatus !== 'All') labels.push({ key: 'jobStatus', label: `Job: ${filters.jobStatus}` });
  if (filters.carpenter && filters.carpenter !== 'All') labels.push({ key: 'carpenter', label: `Carpenter: ${filters.carpenter}` });
  if (filters.paymentType && filters.paymentType !== 'All') labels.push({ key: 'paymentType', label: `Type: ${filters.paymentType}` });
  if (filters.deliveryStatus && filters.deliveryStatus !== 'All') labels.push({ key: 'deliveryStatus', label: `Delivery: ${filters.deliveryStatus}` });
  if (filters.paymentStatus && filters.paymentStatus !== 'All') labels.push({ key: 'paymentStatus', label: `Payment: ${filters.paymentStatus}` });
  if (filters.slaBucket && filters.slaBucket !== 'All') labels.push({ key: 'slaBucket', label: `SLA: ${filters.slaBucket.replaceAll('_', ' ')}` });
  if (filters.dateBucket && filters.dateBucket !== 'All') labels.push({ key: 'dateBucket', label: `Date: ${filters.dateBucket.replaceAll('_', ' ')}` });
  if (filters.location) labels.push({ key: 'location', label: `Location: ${filters.location}` });
  return labels;
}

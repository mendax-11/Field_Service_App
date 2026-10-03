const DAY_MS = 24 * 60 * 60 * 1000;

const pluralizeDays = (days) => `${days} day${days === 1 ? '' : 's'}`;

export function getDeliveryTiming(deliveryStatus, deliveryDate, now = new Date()) {
  if (!deliveryDate) {
    return { label: 'Delivery date unavailable', className: 'delivery-timing-unknown' };
  }

  const dueDate = new Date(deliveryDate);
  if (Number.isNaN(dueDate.getTime())) {
    return { label: 'Delivery date unavailable', className: 'delivery-timing-unknown' };
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const dayDifference = Math.round((dueStart - todayStart) / DAY_MS);
  const isDelivered = String(deliveryStatus || '').toLowerCase() === 'delivered';

  if (isDelivered) {
    if (dayDifference < 0) {
      const days = Math.abs(dayDifference);
      return { label: `Delivered ${pluralizeDays(days)} ago`, className: 'delivery-timing-complete' };
    }
    if (dayDifference === 0) {
      return { label: 'Delivered today', className: 'delivery-timing-complete' };
    }
    return { label: `Delivered in ${pluralizeDays(dayDifference)}`, className: 'delivery-timing-complete' };
  }

  if (dayDifference < 0) {
    const days = Math.abs(dayDifference);
    return { label: `${pluralizeDays(days)} overdue`, className: 'delivery-timing-overdue' };
  }
  if (dayDifference === 0) {
    return { label: 'Due today', className: 'delivery-timing-today' };
  }
  return { label: `Due in ${pluralizeDays(dayDifference)}`, className: 'delivery-timing-upcoming' };
}

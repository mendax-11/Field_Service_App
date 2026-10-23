import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fsaQueries, normalizeOrder, stateManager } from '../utils/stateManager';

export function useOrders({ page = 1, perPage = 25, filters = {}, paginated = false } = {}) {
  const query = useQuery(
    paginated
      ? fsaQueries.orders.search(page, perPage, filters)
      : fsaQueries.orders.all(page, perPage, filters.filter || '')
  );

  const orders = useMemo(() => {
    const serverOrders = (query.data?.items || []).map(normalizeOrder).filter(Boolean);
    const localOrders = stateManager.getOrders().map(normalizeOrder).filter(Boolean);
    const merged = new Map(serverOrders.map(order => [order.orderId, order]));

    localOrders.forEach(order => {
      if (merged.has(order.orderId)) merged.set(order.orderId, { ...merged.get(order.orderId), ...order });
    });

    return serverOrders.length > 0 ? Array.from(merged.values()) : localOrders;
  }, [query.data]);

  return { ...query, orders, totalItems: query.data?.totalItems || orders.length, totalPages: query.data?.totalPages || 1 };
}

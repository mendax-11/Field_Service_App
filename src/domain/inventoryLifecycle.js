export const INVENTORY_STATES = Object.freeze(['Available', 'Reserved', 'Dispatched', 'Returned', 'Damaged']);

const TRANSITIONS = {
  Available: ['Reserved', 'Damaged'],
  Reserved: ['Available', 'Dispatched', 'Damaged'],
  Dispatched: ['Returned', 'Damaged'],
  Returned: ['Available', 'Damaged'],
  Damaged: [],
};

export function canTransitionInventory(from, to) {
  return INVENTORY_STATES.includes(from) && INVENTORY_STATES.includes(to) && TRANSITIONS[from].includes(to);
}

export function validateInventoryTransition(from, to) {
  if (!canTransitionInventory(from, to)) throw new Error(`Invalid inventory transition: ${from} -> ${to}`);
  return true;
}

export function createInventoryMovement({ partId, orderId, from, to, quantity = 1, actorId, reason = '' }) {
  validateInventoryTransition(from, to);
  if (!partId || !orderId) throw new Error('Part and order are required for inventory movement');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Inventory quantity must be a positive integer');
  return { partId, orderId, from, to, quantity, actorId, reason, timestamp: new Date().toISOString() };
}

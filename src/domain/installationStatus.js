export const INSTALLATION_STATES = Object.freeze([
  'Unassigned',
  'Assigned',
  'Accepted',
  'Rejected',
  'In Progress',
  'Awaiting Verification',
  'Replacement Hold',
  'Completed',
  'Cancelled',
]);

const TRANSITIONS = {
  Unassigned: ['Assigned', 'Cancelled'],
  Assigned: ['Accepted', 'Rejected', 'Cancelled'],
  Accepted: ['In Progress', 'Rejected', 'Cancelled'],
  Rejected: ['Assigned', 'Cancelled'],
  'In Progress': ['Awaiting Verification', 'Replacement Hold', 'Cancelled'],
  'Awaiting Verification': ['Completed', 'Replacement Hold'],
  'Replacement Hold': ['In Progress', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export function canTransitionInstallation(from, to) {
  return INSTALLATION_STATES.includes(from)
    && INSTALLATION_STATES.includes(to)
    && TRANSITIONS[from]?.includes(to) === true;
}

export function validateInstallationTransition(from, to, context = {}) {
  if (!canTransitionInstallation(from, to)) {
    throw new Error(`Invalid installation transition: ${from} -> ${to}`);
  }

  if (to === 'Completed' && context.otpVerified !== true) {
    throw new Error('Customer verification is required before completion');
  }

  return true;
}

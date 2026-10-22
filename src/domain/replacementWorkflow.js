const REPLACEMENT_TRANSITIONS = {
  Pending: ['Approved', 'Rejected', 'Dispatched'],
  Approved: ['Dispatched', 'Rejected'],
  Rejected: [],
  Dispatched: ['Completed'],
  Completed: [],
};

export function canTransitionReplacement(from, to) {
  return REPLACEMENT_TRANSITIONS[from]?.includes(to) === true;
}

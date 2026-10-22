const ROLE_CAPABILITIES = {
  'Super Admin': ['*'],
  Dispatcher: ['installation.assign', 'installation.reject', 'installation.cancel'],
  'Inventory Manager': ['replacement.approve', 'inventory.manage'],
  'Customer Support': ['customer.view', 'customer.comment'],
  Carpenter: ['installation.accept', 'installation.reject', 'installation.start', 'installation.complete'],
};

export function can(user, capability, resource = {}) {
  if (!user?.id || !user.role) return false;

  const capabilities = ROLE_CAPABILITIES[user.role] || [];
  if (!capabilities.includes('*') && !capabilities.includes(capability)) return false;

  if (user.role === 'Carpenter' && resource.assignedTechnicianId !== user.id) return false;
  return true;
}

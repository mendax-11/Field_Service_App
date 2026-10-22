import { validateInstallationTransition } from './installationStatus.js';
import { can } from './permissions.js';

export function buildInstallationCommand(order, nextStatus, actor) {
  const currentStatus = order.jobStatus || order.status || 'Unassigned';
  const assignedTechnicianId = order.assignedCarpenterId || order.assigned_carpenter || '';
  const capability = nextStatus === 'Accepted'
    ? 'installation.accept'
    : nextStatus === 'Rejected'
      ? 'installation.reject'
      : nextStatus === 'In Progress'
        ? 'installation.start'
        : nextStatus === 'Completed'
          ? 'installation.complete'
          : 'installation.cancel';

  if (!can(actor, capability, { assignedTechnicianId })) {
    throw new Error('Actor is not authorized for this installation');
  }

  validateInstallationTransition(currentStatus, nextStatus, {
    otpVerified: order.otpVerified === true || order.otp_verified === true,
  });

  return {
    type: 'installation.transition',
    orderId: order.id || order.orderId || order.order_id,
    from: currentStatus,
    to: nextStatus,
    actorId: actor.id,
  };
}

export function buildAssignmentCommand(order, technicianId, actor) {
  const currentStatus = order.jobStatus || order.status || 'Unassigned';
  if (currentStatus !== 'Unassigned') throw new Error('Only unassigned installations can be assigned');
  if (!can(actor, 'installation.assign', {})) throw new Error('Actor is not authorized to assign installations');
  if (!technicianId) throw new Error('A technician is required');
  return { type: 'installation.assignment', orderId: order.id || order.orderId || order.order_id, technicianId, actorId: actor.id };
}

export function buildReplacementCommand(order, actor) {
  const status = order.replacementStatus || order.damageReport?.status || order.damage_report?.status || 'Pending';
  if (!['Pending', 'Approved'].includes(status)) throw new Error('Replacement is not ready for dispatch');
  if (!can(actor, 'replacement.approve', {})) throw new Error('Actor is not authorized to dispatch replacement parts');
  return { type: 'replacement.dispatch', orderId: order.id || order.orderId || order.order_id, actorId: actor.id };
}

export function buildPayoutCommand(order, actor) {
  const paymentStatus = order.paymentStatus || order.payment_status;
  if ((order.jobStatus || order.status) !== 'Completed') throw new Error('Only completed jobs can be paid');
  if (!['Unpaid', 'Pending Payout'].includes(paymentStatus)) throw new Error('Payout is already cleared');
  if (!can(actor, 'payout.clear', {})) throw new Error('Actor is not authorized to clear payouts');
  return { type: 'payout.clear', orderId: order.id || order.orderId || order.order_id, actorId: actor.id };
}

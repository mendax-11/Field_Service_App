import { canTransitionInstallation, validateInstallationTransition } from './installationStatus.js';

const completedCommands = new Map();

export function executeInstallationCommand(command, adapters) {
  if (!command?.idempotencyKey) throw new Error('An idempotency key is required');
  if (completedCommands.has(command.idempotencyKey)) return completedCommands.get(command.idempotencyKey);
  if (!adapters?.getOrder || !adapters?.apply || !adapters?.audit) throw new Error('Command adapters are required');

  const order = adapters.getOrder(command.orderId);
  if (!order) throw new Error('Installation not found');
  const currentStatus = order.jobStatus || order.status || 'Unassigned';
  if (currentStatus !== command.from || !canTransitionInstallation(command.from, command.to)) {
    throw new Error(`Stale or invalid installation command: ${command.from} -> ${command.to}`);
  }

  validateInstallationTransition(command.from, command.to, {
    otpVerified: order.otpVerified === true || order.otp_verified === true,
  });

  const result = {
    orderId: command.orderId,
    status: command.to,
    idempotencyKey: command.idempotencyKey,
  };
  adapters.apply({ status: command.to, jobStatus: command.to });
  adapters.audit({
    orderId: command.orderId,
    action: `Status Changed to ${command.to}`,
    user: command.actorId,
    idempotencyKey: command.idempotencyKey,
  });
  completedCommands.set(command.idempotencyKey, result);
  return result;
}

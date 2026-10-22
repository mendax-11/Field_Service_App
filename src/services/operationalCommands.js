function escapeFilter(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

export async function persistInstallationCommand(pb, command) {
  if (!pb?.collection) throw new Error('PocketBase client is required');
  if (!command?.orderId || !command?.idempotencyKey) throw new Error('Order ID and idempotency key are required');

  const installations = pb.collection('installations');
  let existing = null;
  try {
    existing = await installations.getFirstListItem(`order_id="${escapeFilter(command.orderId)}"`, { $autoCancel: false });
  } catch (error) {
    if (error?.status !== 404) throw error;
  }

  const payload = {
    order_id: command.orderId,
    status: command.to,
    version: Number(command.version || 0) + 1,
    last_command_id: command.idempotencyKey,
  };
  const installation = existing
    ? await installations.update(existing.id, payload, { $autoCancel: false })
    : await installations.create(payload, { $autoCancel: false });

  await pb.collection('audit_events').create({
    aggregate_id: command.orderId,
    action: `Status Changed to ${command.to}`,
    actor_id: command.actorId,
    metadata: { idempotencyKey: command.idempotencyKey, installationId: installation.id },
  }, { $autoCancel: false });

  return { installation, status: command.to, idempotencyKey: command.idempotencyKey };
}

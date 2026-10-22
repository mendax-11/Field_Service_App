/// <reference path="../pb_data/types.d.ts" />

const authenticatedStaff = '@request.auth.id != "" && (@request.auth.role = "Super Admin" || @request.auth.role = "Dispatcher" || @request.auth.role = "Inventory Manager" || @request.auth.role = "Customer Support" || @request.auth.role = "Carpenter")';

function createOperationalCollection(app, name, fields) {
  const collection = new Collection({
    type: 'base',
    name,
    fields,
    listRule: authenticatedStaff,
    viewRule: authenticatedStaff,
    createRule: authenticatedStaff,
    updateRule: authenticatedStaff,
    deleteRule: '@request.auth.role = "Super Admin"',
  });
  app.save(collection);
}

migrate((app) => {
  createOperationalCollection(app, 'installations', [
    new TextField({ name: 'order_id', required: true }),
    new TextField({ name: 'status', required: true }),
    new TextField({ name: 'assigned_technician_id' }),
    new TextField({ name: 'scheduled_date' }),
    new NumberField({ name: 'version' }),
  ]);

  createOperationalCollection(app, 'assignments', [
    new TextField({ name: 'installation_id', required: true }),
    new TextField({ name: 'technician_id', required: true }),
    new TextField({ name: 'status', required: true }),
    new TextField({ name: 'reason' }),
  ]);

  createOperationalCollection(app, 'audit_events', [
    new TextField({ name: 'aggregate_id', required: true }),
    new TextField({ name: 'action', required: true }),
    new TextField({ name: 'actor_id', required: true }),
    new JSONField({ name: 'metadata' }),
  ]);

  createOperationalCollection(app, 'payout_ledger', [
    new TextField({ name: 'order_id', required: true }),
    new TextField({ name: 'technician_id' }),
    new TextField({ name: 'entry_type', required: true }),
    new NumberField({ name: 'amount', required: true }),
    new TextField({ name: 'reason' }),
    new TextField({ name: 'settlement_reference' }),
  ]);
}, (app) => {
  for (const name of ['installations', 'assignments', 'audit_events', 'payout_ledger']) {
    const collection = app.findCollectionByNameOrId(name);
    if (collection) app.delete(collection);
  }
});

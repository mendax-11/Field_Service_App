/// <reference path="../pb_data/types.d.ts" />

// Security baseline: authenticated users may only access the operational data
// required by their role. This migration intentionally does not change field
// visibility; it narrows collection-level access first.
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders");
  const authenticated = '@request.auth.id != ""';
  const staff = '(@request.auth.role = "Super Admin" || @request.auth.role = "Dispatcher" || @request.auth.role = "Inventory Manager" || @request.auth.role = "Customer Support")';
  const carpenter = '(@request.auth.role = "Carpenter" && assigned_carpenter = @request.auth.id)';

  orders.listRule = `${authenticated} && (${staff} || ${carpenter})`;
  orders.viewRule = `${authenticated} && (${staff} || ${carpenter})`;
  orders.createRule = `${authenticated} && (@request.auth.role = "Super Admin" || @request.auth.role = "Dispatcher")`;
  orders.updateRule = `${authenticated} && (${staff} || ${carpenter})`;
  orders.deleteRule = `${authenticated} && @request.auth.role = "Super Admin"`;
  app.save(orders);

  const users = app.findCollectionByNameOrId("users");
  const userStaff = `${authenticated} && (${staff})`;
  users.listRule = userStaff;
  users.viewRule = `${userStaff} || (@request.auth.id = id)`;
  users.createRule = `${authenticated} && @request.auth.role = "Super Admin"`;
  users.updateRule = `${authenticated} && (@request.auth.role = "Super Admin" || @request.auth.id = id)`;
  users.deleteRule = `${authenticated} && @request.auth.role = "Super Admin"`;
  app.save(users);
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.listRule = '@request.auth.id != "" && (@request.auth.role != "Carpenter" || assigned_carpenter = @request.auth.id)';
  orders.viewRule = '@request.auth.id != "" && (@request.auth.role != "Carpenter" || assigned_carpenter = @request.auth.id)';
  orders.createRule = null;
  orders.updateRule = '@request.auth.id != "" && (@request.auth.role != "Carpenter" || assigned_carpenter = @request.auth.id)';
  orders.deleteRule = null;
  app.save(orders);

  const users = app.findCollectionByNameOrId("users");
  users.listRule = 'id = @request.auth.id || role != "Carpenter"';
  users.viewRule = 'id = @request.auth.id || role != "Carpenter"';
  users.createRule = '';
  users.updateRule = 'id = @request.auth.id';
  users.deleteRule = 'id = @request.auth.id';
  app.save(users);
});

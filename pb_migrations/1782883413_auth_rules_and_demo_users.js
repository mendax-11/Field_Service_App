/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Update orders collection API rules
  const orders = app.findCollectionByNameOrId("orders");
  const ordersRule = "@request.auth.id != '' && (@request.auth.role != 'Carpenter' || assigned_carpenter = @request.auth.id)";
  orders.listRule = ordersRule;
  orders.viewRule = ordersRule;
  orders.updateRule = ordersRule;
  app.save(orders);

  // Update users collection API rules
  const users = app.findCollectionByNameOrId("users");
  const usersRule = "@request.auth.id != '' && (@request.auth.role != 'Carpenter' || id = @request.auth.id)";
  users.listRule = usersRule;
  users.viewRule = usersRule;
  users.updateRule = usersRule;
  app.save(users);

  // Demo users to insert
  const demoUsers = [
    {
      phone: "+91-80000-00001",
      email: "superadmin@service.com",
      password: "admin123",
      role: "Super Admin",
      name: "Super Admin"
    },
    {
      phone: "+91-80000-00002",
      email: "dispatcher@service.com",
      password: "admin123",
      role: "Dispatcher",
      name: "Dispatcher Manager"
    },
    {
      phone: "+91-80000-00003",
      email: "inventory@service.com",
      password: "admin123",
      role: "Inventory Manager",
      name: "Logistics Supervisor"
    },
    {
      phone: "+91-80000-00004",
      email: "support@service.com",
      password: "admin123",
      role: "Customer Support",
      name: "Support Executive"
    }
  ];

  for (const data of demoUsers) {
    try {
      // Check if user already exists
      app.findFirstRecordByData("users", "email", data.email);
    } catch (e) {
      // Create new user if not found
      const record = new Record(users);
      record.set("phone", data.phone);
      record.set("email", data.email);
      record.set("emailVisibility", true);
      record.set("verified", true);
      record.setPassword(data.password);
      record.set("role", data.role);
      record.set("name", data.name);
      app.save(record);
    }
  }

}, (app) => {
  const orders = app.findCollectionByNameOrId("orders");
  orders.listRule = null;
  orders.viewRule = null;
  orders.updateRule = null;
  app.save(orders);

  const users = app.findCollectionByNameOrId("users");
  users.listRule = "id = @request.auth.id || role != 'Carpenter'";
  users.viewRule = "id = @request.auth.id || role != 'Carpenter'";
  users.updateRule = "id = @request.auth.id";
  app.save(users);

  const emails = [
    "superadmin@service.com",
    "dispatcher@service.com",
    "inventory@service.com",
    "support@service.com"
  ];

  for (const email of emails) {
    try {
      const record = app.findFirstRecordByData("users", "email", email);
      if (record) {
        app.delete(record);
      }
    } catch (e) {
      // Ignore if not found
    }
  }
});

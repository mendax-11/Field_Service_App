/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  collection.fields.add({
    id: "fldotp123456",
    name: "otp",
    type: "text",
    required: false
  });

  collection.fields.add({
    id: "fldotpsent123",
    name: "otp_sent",
    type: "bool",
    required: false
  });

  collection.fields.add({
    id: "fldotpverified1",
    name: "otp_verified",
    type: "bool",
    required: false
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  collection.fields.removeById("fldotp123456");
  collection.fields.removeById("fldotpsent123");
  collection.fields.removeById("fldotpverified1");
  return app.save(collection);
});

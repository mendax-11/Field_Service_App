/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  collection.fields.add({
    id: "fldextracharges",
    name: "extra_charges",
    type: "json",
    required: false
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  collection.fields.removeById("fldextracharges");
  return app.save(collection);
});

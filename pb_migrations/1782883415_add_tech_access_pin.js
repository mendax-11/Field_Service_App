/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  collection.fields.add({
    id: "fldtechaccesspin",
    name: "tech_access_pin",
    type: "text",
    required: false,
    max: 4
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("orders");
  collection.fields.removeById("fldtechaccesspin");
  return app.save(collection);
});

/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const installations = app.findCollectionByNameOrId('installations');
  installations.fields.add(new TextField({ name: 'last_command_id' }));
  installations.fields.add(new TextField({ name: 'updated_by' }));
  app.save(installations);
}, (app) => {
  const installations = app.findCollectionByNameOrId('installations');
  installations.fields.removeByName('last_command_id');
  installations.fields.removeByName('updated_by');
  app.save(installations);
});

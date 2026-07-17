const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase('https://assembly.vikifurniture.com');
pb.collection('users').getFullList().then(r => console.log(JSON.stringify(r.map(u => u.name)))).catch(e => console.log(JSON.stringify(e.response)));

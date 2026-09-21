# TimberFlow Order API

## Base URL

```text
https://assembly.vikifurniture.com:8090/api
```

## Authentication

Use a Dispatcher or Super Admin PocketBase account:

```http
POST /api/collections/users/auth-with-password
Content-Type: application/json
```

```json
{
  "identity": "dispatcher@service.com",
  "password": "YOUR_PASSWORD"
}
```

Use the returned token on protected requests:

```http
Authorization: Bearer PB_AUTH_TOKEN
```

## Get Orders

```http
GET /api/collections/orders/records?perPage=500
Authorization: Bearer PB_AUTH_TOKEN
```

Get one order:

```http
GET /api/collections/orders/records/RECORD_ID
Authorization: Bearer PB_AUTH_TOKEN
```

Find by business order ID:

```http
GET /api/collections/orders/records?filter=order_id='AMZ-10001'
Authorization: Bearer PB_AUTH_TOKEN
```

## Create Order

```http
POST /api/collections/orders/records
Authorization: Bearer PB_AUTH_TOKEN
Content-Type: application/json
```

```json
{
  "order_id": "AMZ-10001",
  "platform": "Amazon",
  "customer_name": "Customer Name",
  "customer_phone": "9876543210",
  "customer_address": "Full address",
  "city": "Mumbai",
  "state": "MH",
  "pincode": "400001",
  "product_sku": "SKU-123",
  "assembly_payout": 500,
  "status": "Unassigned",
  "assembly_status": "Unassigned",
  "payment_status": "Unpaid",
  "payment_type": "Company Pay",
  "delivery_status": "Pending",
  "delivery_date": "2026-09-25",
  "promise_date": "2026-09-25"
}
```

## Update Order Status

```http
PATCH /api/collections/orders/RECORD_ID
Authorization: Bearer PB_AUTH_TOKEN
Content-Type: application/json
```

```json
{
  "status": "Completed",
  "assembly_status": "Completed",
  "delivery_status": "Delivered"
}
```

## Live Updates

The external app can subscribe to PocketBase Realtime events for the `orders` collection. It will receive `create`, `update`, and `delete` events.

```javascript
import PocketBase from 'pocketbase';

const pb = new PocketBase(
  'https://assembly.vikifurniture.com:8090'
);

await pb.collection('users').authWithPassword(
  'dispatcher@service.com',
  'YOUR_PASSWORD'
);

await pb.collection('orders').subscribe('*', (event) => {
  console.log(event.action);
  console.log(event.record);

  // Synchronize event.record into the other app.
});

// Stop listening when needed:
// await pb.collection('orders').unsubscribe('*');
```

Recommended synchronization flow:

1. Authenticate.
2. Download all orders.
3. Store orders using `order_id` as the external key.
4. Subscribe to order changes.
5. Apply create, update, and delete events.
6. Re-fetch an order if an event is missed.

## Important Fields

| Field | Purpose |
| --- | --- |
| `order_id` | Unique business order ID |
| `status` | Job status |
| `assembly_status` | Assembly job status |
| `assigned_carpenter_name` | Assigned carpenter |
| `assigned_carpenter` | Carpenter user record ID |
| `payment_status` | Payment state |
| `delivery_status` | Delivery state |
| `assembly_payout` | Carpenter payout |
| `checklist` | Assembly checklist |
| `comments` | Order comments |
| `audit_logs` | Order history |
| `photos` | Before/after photos |
| `damage_report` | Damage or replacement details |
| `tech_access_pin` | Carpenter access PIN |

## Integration Notes

- Use `order_id` to match records between applications.
- Use PocketBase's internal `id` for direct record updates.
- Use a dedicated integration user instead of sharing a personal account.
- Reading and updating orders require authenticated access under the configured PocketBase rules.
- The website must be online and connected to PocketBase for its changes to reach the external app.

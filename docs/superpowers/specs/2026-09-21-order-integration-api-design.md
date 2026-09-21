# Order Integration API Design

## Goal

Provide a stable, authenticated integration API for trusted external applications that need to create orders, read order data, update operational fields, and receive order changes without importing CSV files.

PocketBase remains the source of truth. The new integration layer owns the external contract and translates between that contract and the existing PocketBase order schema.

## Scope

### Included

- Versioned order API under `/api/v1`.
- Dedicated integration credentials.
- Order list and single-order reads.
- Idempotent order creation using `order_id`.
- Partial order updates using `order_id`.
- Validation and normalization of external payloads.
- Change events for create, update, status change, completion, and deletion.
- Retry-safe event delivery and replay/reconciliation support.
- API documentation and integration examples.

### Not included in the first release

- A separate order database.
- Replacing the existing browser/local cache behavior.
- Public unauthenticated order creation.
- Binary photo upload through the integration API.
- Full bidirectional synchronization of every internal audit field.

## Proposed Architecture

```text
External App
    |
    | HTTPS + integration token
    v
Integration API (/api/v1)
    |
    | validated canonical order model
    v
PocketBase orders collection
    |
    +--> event dispatcher --> external webhook subscribers
```

The API should be a small Node-compatible server deployed alongside the existing PocketBase service. It should use the PocketBase SDK or REST API with a server-side service credential and must never expose that credential to the browser.

## Authentication and Authorization

- Each external application receives its own integration credential.
- Credentials are stored as hashed secrets or managed environment secrets, never committed to the repository.
- Requests authenticate with `Authorization: Bearer <integration-token>`.
- The API identifies the integration client and records it in audit logs.
- Default permission is order read/create/update only.
- Delete access is disabled by default and can be enabled per integration.
- Integration clients cannot update internal-only fields such as PocketBase record IDs or system timestamps.
- All requests use HTTPS in deployed environments.

## API Contract

### `GET /api/v1/orders`

Returns paginated orders.

Supported query parameters:

- `page`
- `per_page`
- `updated_since`
- `order_id`
- `status`
- `delivery_status`
- `assigned_carpenter`

Response shape:

```json
{
  "items": [],
  "page": 1,
  "per_page": 100,
  "total_items": 0,
  "has_more": false
}
```

### `GET /api/v1/orders/{order_id}`

Returns one canonical order. The external `order_id` is used instead of requiring callers to know the PocketBase record ID.

### `POST /api/v1/orders`

Creates an order. `order_id` is required and must be unique.

Repeated requests with the same `order_id` and equivalent payload should return the existing order instead of creating a duplicate. An optional `Idempotency-Key` header may be supported for transport-level retries.

### `PATCH /api/v1/orders/{order_id}`

Partially updates allowed fields. Missing fields remain unchanged. Status updates must write both the canonical API field and the PocketBase compatibility fields:

- `job_status` maps to `status` and `assembly_status`.
- `delivery_status` maps to `delivery_status`.
- `payment_status` maps to `payment_status`.

When a job becomes `Completed`, the existing application rules may set delivery state to `Delivered`; the API must document and consistently apply that rule.

### Error responses

All errors use a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "fields": {
      "order_id": "This value is required"
    },
    "request_id": "req_123"
  }
}
```

Expected status codes: `400` validation, `401` missing/invalid credentials, `403` insufficient permission, `404` missing order, `409` duplicate/conflicting request, `429` rate limit, and `5xx` server or upstream failure.

## Canonical Order Fields

The public contract uses stable camelCase or explicitly documented snake_case consistently. The first implementation should use snake_case at the HTTP boundary to match the existing database contract:

- `order_id`
- `platform`
- `customer_name`
- `customer_phone`
- `customer_address`
- `city`
- `state`
- `pincode`
- `product_sku`
- `assembly_payout`
- `status`
- `assembly_status`
- `payment_status`
- `payment_type`
- `delivery_status`
- `delivery_date`
- `promise_date`
- `assigned_carpenter_name`
- `assigned_date`

Checklist, comments, audit logs, photos, damage reports, OTP, and access PINs should be returned only when the integration is explicitly granted those scopes.

## Events and Synchronization

The first release should use signed webhooks for external application notifications. PocketBase Realtime may remain available for internal clients, but webhooks provide a stable integration boundary.

Event names:

- `order.created`
- `order.updated`
- `order.status_changed`
- `order.completed`
- `order.deleted`

Event envelope:

```json
{
  "id": "evt_123",
  "type": "order.status_changed",
  "occurred_at": "2026-09-21T10:00:00.000Z",
  "order_id": "AMZ-10001",
  "version": 1,
  "data": {
    "status": "Completed",
    "delivery_status": "Delivered"
  }
}
```

Delivery behavior:

- Sign each webhook using an integration-specific secret.
- Retry failed deliveries with exponential backoff.
- Treat any `2xx` response as acknowledged.
- Deduplicate using the event ID.
- Keep delivery attempts and final status in an event log.
- Provide `GET /api/v1/events?since=...` or an equivalent reconciliation endpoint for recovery after missed events.

External applications must still run periodic reconciliation using `updated_since`; webhooks are notifications, not the sole source of truth.

## Data Consistency and Audit

- The API writes through the same normalization rules used by the website.
- Every API mutation records the integration client, request ID, changed fields, and timestamp.
- Updates use optimistic concurrency where practical, with an optional `updated_at` or version precondition to prevent lost updates.
- PocketBase sync failures return an error to the API caller and must not be reported as successful mutations.
- The API should not silently overwrite fields omitted from a PATCH request.

## Deployment

- Run the integration API as a separate server process from the Vite frontend.
- Keep PocketBase private to the server network where possible.
- Route public traffic through HTTPS and a reverse proxy.
- Configure allowed origins only for browser-based clients; server-to-server clients should use token authentication.
- Add health checks for the API process and PocketBase dependency.
- Store integration secrets and webhook secrets in deployment environment variables.

## Migration Plan

1. Extract and document the canonical order mapping from `normalizeOrder`.
2. Build the API in read-only mode and validate responses against the current PocketBase records.
3. Add authenticated create and PATCH operations.
4. Add audit records and request IDs.
5. Add signed webhook delivery and retries.
6. Run an initial external-app backfill using paginated reads.
7. Enable incremental reconciliation and event processing.
8. Keep CSV for manual bulk operations.

## Acceptance Criteria

- An authenticated external app can retrieve all authorized orders with pagination.
- Creating the same `order_id` twice does not create duplicate orders.
- A PATCH to delivery or job status is visible in the website and PocketBase.
- Completing an assembly produces a corresponding event for the external app.
- Failed webhook deliveries retry and are observable.
- A missed event can be recovered through reconciliation.
- Unauthorized clients cannot read or modify orders.
- API secrets are not present in frontend bundles or source control.
- The API contract and example requests are documented alongside the application.

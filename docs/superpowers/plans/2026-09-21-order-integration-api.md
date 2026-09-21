# Order Integration API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a lean authenticated `/api/v1` order integration service so a trusted external application can read, create, update, and synchronize orders through PocketBase.

**Architecture:** Add a small Node HTTP server under `server/` that owns the external API contract and uses the existing PocketBase SDK as its persistence adapter. Keep the React/Vite app and current browser synchronization unchanged; the API will normalize order payloads, enforce integration tokens, and emit a simple change notification path that can later become signed webhooks.

**Tech Stack:** Node.js built-in `http`, existing `pocketbase` package, `node:test`, JSON over HTTPS/reverse proxy in deployment.

**Spec:** `docs/superpowers/specs/2026-09-21-order-integration-api-design.md`

## Global Constraints

- PocketBase remains the source of truth.
- Use `order_id` as the external business key.
- Do not expose PocketBase service credentials in the frontend bundle.
- PATCH requests must preserve fields omitted from the request.
- API errors use a consistent `{ error: { code, message, fields, request_id } }` shape.
- Phase 1 does not add a second database, public unauthenticated writes, binary photo upload, or full internal audit-field synchronization.
- Keep CSV for manual admin bulk updates.

## Review Focus

- Duplicate create requests must return the existing order instead of creating a second record; covered in Task 3.
- A PATCH containing only `delivery_status` must preserve customer, payout, assignment, and other fields; covered in Task 4.
- Invalid or missing bearer tokens must be rejected before PocketBase access; covered in Task 2.
- PocketBase validation and not-found errors must map to stable API errors without leaking raw credentials or stack traces; covered in Task 5.
- External synchronization must receive order changes without treating a missed event as permanent data loss; covered in Task 6.

### Task 1: Add Server Runtime and Shared API Types

**Files:**
- Create: `server/config.js`
- Create: `server/orderMapper.js`
- Create: `server/httpResponse.js`
- Test: `tests/orderIntegrationMapper.test.mjs`
- Modify: `package.json`

**Interfaces:**
- `server/config.js` exports `getApiConfig()` returning `{ port, pocketbaseUrl, integrationTokens }` from `PORT`, `VITE_POCKETBASE_URL`/`POCKETBASE_URL`, and `INTEGRATION_API_TOKENS`.
- `server/orderMapper.js` exports `toApiOrder(record)`, `toPocketBaseCreate(payload)`, and `toPocketBasePatch(payload)`.
- `server/httpResponse.js` exports `sendJson(response, status, body)` and `sendApiError(response, status, code, message, fields, requestId)`.

- [ ] **Step 1: Write the failing mapper tests**

  Add `node:test` cases proving that a PocketBase record maps to the public order shape, that create payloads map `job_status` to both `status` and `assembly_status`, and that PATCH mapping excludes fields that were not supplied.

- [ ] **Step 2: Run the mapper tests to verify they fail**

  Run: `node --test tests/orderIntegrationMapper.test.mjs`

  Expected: FAIL because the server modules do not exist yet.

- [ ] **Step 3: Implement the shared runtime modules**

  Keep mapping explicit and limited to Phase 1 fields: order identity, customer data, product, payout, job/payment/delivery status, dates, assignment, and platform. Reject empty `order_id`, negative payout, and invalid status values in the mapper validation path.

- [ ] **Step 4: Add the API start script**

  Add this package script without changing the existing Vite commands:

  ```json
  "api": "node server/index.js"
  ```

- [ ] **Step 5: Run the mapper tests to verify they pass**

  Run: `node --test tests/orderIntegrationMapper.test.mjs`

  Expected: PASS.

- [ ] **Step 6: Commit the shared contract**

  ```bash
  git add server/config.js server/orderMapper.js server/httpResponse.js tests/orderIntegrationMapper.test.mjs package.json
  git commit -m "Add order integration API contract"
  ```

### Task 2: Add Token Authentication and Request Routing

**Files:**
- Create: `server/auth.js`
- Create: `server/router.js`
- Create: `tests/orderIntegrationAuth.test.mjs`

**Interfaces:**
- `server/auth.js` exports `authenticateRequest(request, config)` returning `{ clientId }` or an API error descriptor.
- `server/router.js` exports `routeRequest(request, context)` and matches only `/api/v1/orders` and `/api/v1/orders/{order_id}`.

- [ ] **Step 1: Write failing authentication and routing tests**

  Test that a missing token returns `401`, an unknown token returns `401`, a valid configured token returns its client identity, and unsupported paths return `404`.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/orderIntegrationAuth.test.mjs`

  Expected: FAIL because auth and routing modules do not exist.

- [ ] **Step 3: Implement bearer-token authentication**

  Parse only the `Authorization: Bearer ...` header. Load tokens from an environment variable in the format `client-a=secret-a,client-b=secret-b`; never log token values. Return a request ID generated at the boundary for tracing.

- [ ] **Step 4: Implement strict route matching**

  Route the four Phase 1 operations: list, get, create, and patch. Return JSON `404` for every other path and `405` for unsupported methods on a known path.

- [ ] **Step 5: Run the tests to verify they pass**

  Run: `node --test tests/orderIntegrationAuth.test.mjs`

  Expected: PASS.

- [ ] **Step 6: Commit authentication and routing**

  ```bash
  git add server/auth.js server/router.js tests/orderIntegrationAuth.test.mjs
  git commit -m "Add integration API authentication and routing"
  ```

### Task 3: Implement Order Reads and Idempotent Creates

**Files:**
- Create: `server/orderRepository.js`
- Modify: `server/router.js`
- Create: `tests/orderIntegrationOrders.test.mjs`

**Interfaces:**
- `server/orderRepository.js` exports `createOrder(pb, payload)`, `findOrder(pb, orderId)`, and `listOrders(pb, query)`.
- Repository methods return normalized API orders or throw typed errors with `code`, `status`, and optional `fields`.

- [ ] **Step 1: Write failing repository tests**

  Use a small in-memory fake PocketBase collection passed into the repository. Test list pagination, lookup by `order_id`, successful create, and duplicate `order_id` returning the existing record instead of creating a duplicate.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/orderIntegrationOrders.test.mjs`

  Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement PocketBase repository operations**

  Use `pb.collection('orders').getList(...)`, `getFirstListItem(...)`, and `create(...)`. Apply the shared mapper before writes and after reads. Use escaped filters for `order_id`.

- [ ] **Step 4: Connect `GET` and `POST` routes**

  Parse `page`, `per_page`, `updated_since`, `order_id`, `status`, and `delivery_status`. Cap `per_page` at `500`. Return `201` for a new create and `200` for an idempotent duplicate response.

- [ ] **Step 5: Run the tests to verify they pass**

  Run: `node --test tests/orderIntegrationOrders.test.mjs`

  Expected: PASS.

- [ ] **Step 6: Commit order reads and creates**

  ```bash
  git add server/orderRepository.js server/router.js tests/orderIntegrationOrders.test.mjs
  git commit -m "Add integration order reads and creates"
  ```

### Task 4: Implement Partial Order Updates

**Files:**
- Modify: `server/orderRepository.js`
- Modify: `server/router.js`
- Modify: `tests/orderIntegrationOrders.test.mjs`

- [ ] **Step 1: Add failing PATCH tests**

  Test that `PATCH /api/v1/orders/AMZ-10001` with only `{ "delivery_status": "Delivered" }` updates that field while preserving the other fields, and that `{ "status": "Completed" }` updates both `status` and `assembly_status`.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `node --test tests/orderIntegrationOrders.test.mjs`

  Expected: FAIL because PATCH handling is not implemented.

- [ ] **Step 3: Implement partial update behavior**

  Fetch the existing record by `order_id`, map only supplied fields, call PocketBase `update(record.id, patch)`, and return the normalized updated order. Do not send default values for omitted fields.

- [ ] **Step 4: Add not-found and validation errors**

  Return `404 ORDER_NOT_FOUND` when the business ID is missing and `400 VALIDATION_ERROR` for invalid status or payout values.

- [ ] **Step 5: Run the focused tests to verify they pass**

  Run: `node --test tests/orderIntegrationOrders.test.mjs`

  Expected: PASS.

- [ ] **Step 6: Commit partial updates**

  ```bash
  git add server/orderRepository.js server/router.js tests/orderIntegrationOrders.test.mjs
  git commit -m "Add partial order updates to integration API"
  ```

### Task 5: Add HTTP Server, Errors, and Operational Checks

**Files:**
- Create: `server/index.js`
- Modify: `server/router.js`
- Create: `tests/orderIntegrationHttp.test.mjs`
- Modify: `README.md`
- Modify: `ORDER_API.md`

- [ ] **Step 1: Write failing HTTP tests**

  Start the server against a fake repository and test JSON content type, `401` responses, consistent request IDs, malformed JSON returning `400`, and successful `GET`, `POST`, and `PATCH` response codes.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/orderIntegrationHttp.test.mjs`

  Expected: FAIL because `server/index.js` does not exist.

- [ ] **Step 3: Implement the Node HTTP server**

  Bind to `PORT` (default `8092`), parse bounded JSON request bodies, instantiate PocketBase with the configured URL, dispatch through the router, and catch errors without returning stack traces.

- [ ] **Step 4: Add health endpoint**

  Add `GET /health` returning `{ "status": "ok" }` without exposing credentials. Add a dependency check only if it can be performed without making health checks mutate data.

- [ ] **Step 5: Document local startup and environment variables**

  Document `PORT`, `POCKETBASE_URL`, and `INTEGRATION_API_TOKENS`, plus `npm run api`, in `README.md` and update `ORDER_API.md` to describe the Phase 1 boundary and exact error behavior.

- [ ] **Step 6: Run all available tests and checks**

  Run: `node --test tests/orderIntegration*.test.mjs`

  Run: `npm run lint`

  Run: `npm run build`

  Expected: all integration tests pass, lint exits `0`, and the frontend build exits `0`.

- [ ] **Step 7: Commit the runnable API**

  ```bash
  git add server/index.js server/router.js tests/orderIntegrationHttp.test.mjs README.md ORDER_API.md
  git commit -m "Run lean order integration API service"
  ```

### Task 6: Add Phase 1 Change Synchronization

**Files:**
- Create: `server/orderEvents.js`
- Modify: `server/orderRepository.js`
- Modify: `server/index.js`
- Create: `tests/orderIntegrationEvents.test.mjs`

- [ ] **Step 1: Write failing event tests**

  Test that a successful create or update emits one event containing `event_id`, `type`, `occurred_at`, `order_id`, and the changed order data, and that failed writes emit nothing.

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `node --test tests/orderIntegrationEvents.test.mjs`

  Expected: FAIL because the event module does not exist.

- [ ] **Step 3: Implement a simple Phase 1 notification adapter**

  Define `createOrderEvent(type, order, changedFields)` and an in-process subscriber adapter. Publish after PocketBase confirms the write. Keep the adapter boundary explicit so Phase 2 can replace it with signed webhooks without changing repository behavior.

- [ ] **Step 4: Add a documented realtime option**

  Document that the first external client can use PocketBase Realtime for live updates while the API event adapter is being hardened. Require periodic `updated_since` reconciliation in the client.

- [ ] **Step 5: Run event tests and the complete check set**

  Run: `node --test tests/orderIntegration*.test.mjs`

  Run: `npm run lint`

  Run: `npm run build`

  Expected: all commands exit successfully.

- [ ] **Step 6: Commit Phase 1 synchronization**

  ```bash
  git add server/orderEvents.js server/orderRepository.js server/index.js tests/orderIntegrationEvents.test.mjs ORDER_API.md
  git commit -m "Add order integration change notifications"
  ```

## Final Verification

- Start PocketBase locally on port `8091`.
- Start the integration API on port `8092` with a non-production test token.
- Authenticate a test client and run list, get, create, duplicate-create, and PATCH requests.
- Confirm the website sees a PATCHed delivery status after PocketBase sync.
- Confirm an invalid token cannot read or mutate orders.
- Confirm no integration token appears in the Vite build output.
- Run `node --test tests/orderIntegration*.test.mjs`, `npm run lint`, and `npm run build`.

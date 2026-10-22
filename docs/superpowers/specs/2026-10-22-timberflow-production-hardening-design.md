# TimberFlow Production Hardening Design

## Goal

Turn TimberFlow from a browser-trusted prototype into a reliable field-service system while preserving the existing React, PocketBase, and PWA stack.

The migration is incremental. Existing screens remain usable while business-critical operations move behind authenticated, server-validated commands.

## Non-goals

- Rewriting the frontend framework.
- Introducing a second backend during this migration.
- Building route optimization, payroll integrations, or multi-tenant billing before the core workflow is trustworthy.
- Replacing every existing screen before backend correctness is established.

## Target architecture

PocketBase is the source of truth. React Query provides server cache and invalidation. IndexedDB stores an offline read cache and a queue of idempotent commands. `localStorage` is limited to harmless UI preferences such as theme and column visibility.

Components do not directly mutate arbitrary order objects. They call domain actions such as `assignInstallation`, `startVisit`, `submitEvidence`, `verifyCustomer`, `completeInstallation`, `requestReplacement`, and `approvePayout`.

Each action validates authentication, authorization, current state, required fields, idempotency, and concurrency version before changing data. Every successful transition writes an append-only audit event.

## Domain boundary

The first migration keeps the existing `orders` collection as the commercial parent record and adds focused operational records:

- `installations`: assembly workflow and current state.
- `assignments`: technician assignment history and acceptance/rejection.
- `visit_events`: arrival, start, pause, resume, and departure timestamps.
- `media_assets`: uploaded evidence metadata and protected file references.
- `replacement_requests`: part/damage workflow independent of the order status.
- `payout_ledger`: immutable earnings and adjustment entries.
- `audit_events`: append-only actor/action/before/after records.

Existing embedded fields remain readable during migration, but new writes use the focused records first.

## Security boundary

- Remove production use of frontend demo credentials and local role fallback.
- Use PocketBase auth state as the only session authority.
- Enforce permissions in PocketBase rules and server-side transition handlers.
- Scope records to the authenticated organization and technician where applicable.
- Never expose raw OTPs after issuance; verification is server-side, expiring, and rate-limited.
- Store signatures and photos as protected media records, not durable base64 blobs in browser storage.

## Migration phases

### Phase 1: Safety baseline

Inventory all mutation paths, remove duplicate state-manager behavior, define canonical status values, add validation helpers, and add regression tests around permissions and transitions.

Acceptance: one documented mutation path per critical action; existing build/lint/tests remain green.

### Phase 2: Authentication and authorization

Remove local-auth fallback from production, centralize session handling, define capability permissions, tighten PocketBase rules, and add protected-route behavior.

Acceptance: changing browser storage cannot grant a role or access another technician’s jobs.

### Phase 3: Workflow state machine

Add explicit installation states and server-validated transition commands. Migrate assignment, start, completion, rejection, replacement hold, and payout eligibility.

Acceptance: illegal transitions are rejected and every legal transition produces an audit event.

### Phase 4: Reliable synchronization

Replace arbitrary local object saves with versioned commands, idempotency keys, conflict detection, retry states, and an operator-visible sync status.

Acceptance: concurrent edits do not silently overwrite each other; failed commands are retryable and diagnosable.

### Phase 5: Evidence and offline technician workflow

Move photos/signatures to protected media uploads, add upload state and retry, and use IndexedDB only for offline cache/commands.

Acceptance: a technician can complete a job offline, see pending sync state, and recover after reconnect without losing evidence.

### Phase 6: Payout ledger

Create immutable payout entries, approval states, adjustment entries, and settlement references. Remove direct payout mutation from order editing.

Acceptance: a settled payout cannot be edited; corrections create a traceable adjustment.

### Phase 7: Operational consoles

Improve dispatcher exception queues, technician availability, customer tracking security, inventory movements, support audit views, and sync diagnostics.

Acceptance: dispatchers can manage exceptions without inspecting raw records or browser state.

### Phase 8: Production verification

Add integration tests for PocketBase rules and commands, end-to-end tests for critical workflows, backups/restore checks, observability, and deployment runbooks.

Acceptance: release checklist passes for security, data recovery, workflow integrity, and offline recovery.

## Testing strategy

Tests are written before each behavior change. Unit tests cover normalization, permissions, status transitions, payout calculations, and idempotency. Integration tests exercise PocketBase rules and command handlers. End-to-end tests cover assignment through completion, replacement, and payout approval.

## Rollout strategy

1. Introduce new records and commands behind feature flags.
2. Dual-read legacy and new records while comparing results.
3. Switch writes to commands for one workflow at a time.
4. Monitor conflicts and rejected transitions.
5. Remove legacy write paths only after migration checks pass.


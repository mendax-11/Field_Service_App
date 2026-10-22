# TimberFlow Production Completion Phase

This phase covers the remaining gaps after the demo-hardening work.

## Workstreams

1. **Command-based mutations**
   - Route assignment, acceptance, start, replacement, completion, and payout through explicit commands.
   - Require actor, idempotency key, expected version, and audit metadata.
   - Remove direct workflow field mutation from components.

2. **Backend operational model**
   - Add PocketBase collections for installations, assignments, visits, media assets, replacement requests, payout ledger entries, and audit events.
   - Add rules and indexes.
   - Keep legacy order fields readable during migration.

3. **Reliable offline synchronization**
   - Move command queue from localStorage to IndexedDB.
   - Add retry, dead-letter, conflict, and replay behavior.
   - Add visible sync state to technician and dispatcher screens.

4. **Evidence and media**
   - Replace durable base64 evidence with protected media records.
   - Add upload lifecycle, compression, thumbnails, and retry.

5. **Scheduling and inventory**
   - Add technician availability, appointment windows, skill matching, part reservations, stock movements, and technician consumption.

6. **Verification and operations**
   - Add end-to-end tests, PocketBase rule tests, backup/restore checks, observability, deployment, and rollback runbooks.

## Execution order

Command-based mutations → backend model → sync → media → scheduling/inventory → operational verification.

## First deliverable

Implement a local command executor with idempotency and audit behavior. It will be used by the demo immediately and later replaced by the PocketBase command endpoint without changing UI callers.


# TimberFlow Production Hardening Implementation Plan

## Constraints

- Preserve the current React/Vite/PocketBase stack.
- Do not add a second backend.
- Keep the current UI functional during migration.
- No production behavior changes without a failing regression test first.
- Do not use localStorage as authority for identity, permissions, or business state.

## File map

Create focused modules under `src/domain/` for status values, transition validation, permissions, and command payloads. Create `src/api/` for authenticated PocketBase commands. Keep `src/utils/stateManager.js` as a temporary compatibility facade, but move critical writes behind the new modules. Add PocketBase migrations under `pb_migrations/` for new collections and rules. Add tests under `tests/` by behavior, not by component.

## Phase 1 — Safety baseline

1. Add failing tests for canonical installation states, valid/invalid transitions, technician ownership, and payout eligibility.
2. Add `src/domain/installationStatus.js` with the canonical state list and transition table.
3. Add `src/domain/permissions.js` with capability checks that accept an authenticated user and resource context.
4. Add `src/domain/commands.js` to validate command payload shape and require an idempotency key.
5. Make the existing state manager call the domain validators before assignment, completion, replacement, and payout mutations.
6. Remove or quarantine `src/services/stateManager.js` so there is only one active implementation path.
7. Run build, lint, and the full test suite.

## Phase 2 — Authentication and authorization

1. Add failing tests proving a forged local role cannot authorize a protected operation.
2. Centralize auth in `src/auth/session.js`; read identity from `pb.authStore` only.
3. Remove production fallback to `fsa_logged_in_user` and hard-coded demo credential authentication. Keep demo fixtures behind an explicit development-only flag.
4. Replace component role checks for mutations with capability checks using the authenticated PocketBase user.
5. Tighten PocketBase rules for orders, users, and new operational collections.
6. Add session-expiry and logout tests.

## Phase 3 — Workflow state machine

1. Add migration for `installations`, `assignments`, `visit_events`, and `audit_events`.
2. Add authenticated command functions: `assignInstallation`, `acceptAssignment`, `rejectAssignment`, `startVisit`, `submitEvidence`, `requestReplacement`, `verifyCustomer`, `completeInstallation`, and `approvePayout`.
3. Each command checks current version, actor capability, transition legality, required evidence, and idempotency.
4. Update the dispatcher and technician flows to call commands instead of mutating whole orders.
5. Add integration tests for the complete happy path and rejected transitions.

## Phase 4 — Synchronization

1. Add failing tests for duplicate command delivery, stale versions, retryable failures, and conflict reporting.
2. Replace arbitrary order saves with a command queue stored in IndexedDB.
3. Add command IDs, aggregate versions, retry count, last error, and dead-letter state.
4. Make PocketBase updates conditional on the expected version.
5. Surface pending, failed, and conflicted operations in the UI.
6. Retain localStorage only for UI preferences and migration flags.

## Phase 5 — Evidence and offline workflow

1. Add `media_assets` migration and protected file rules.
2. Add upload metadata and lifecycle states: pending, uploading, confirmed, failed.
3. Replace durable base64 evidence with compressed uploads and references.
4. Add offline technician flow tests for job completion, reconnect, retry, and duplicate uploads.
5. Keep a small local thumbnail/cache only after server confirmation.

## Phase 6 — Payout ledger

1. Add `payout_ledger` migration and immutable entry rules.
2. Add rate-card and payout calculation tests in `src/domain/payouts.js`.
3. Replace `processPayout` order mutation with ledger-entry creation and approval commands.
4. Add settlement references and adjustment entries.
5. Update wallet and admin payout views to read the ledger.

## Phase 7 — Operational consoles

1. Add dispatcher queues for unassigned, SLA-risk, technician-rejected, replacement-held, and sync-conflicted jobs.
2. Add technician availability and appointment-window fields.
3. Secure customer tracking links with expiring signed tokens rather than raw order IDs.
4. Add inventory stock movement records and technician consumption.
5. Add support audit and synchronization diagnostics.

## Phase 8 — Verification and rollout

1. Add end-to-end tests for assignment through payout.
2. Add PocketBase rule tests and backup/restore validation.
3. Add release checklist and rollback runbook under `docs/operations/`.
4. Enable new command writes behind a feature flag, compare legacy/new reads, then remove legacy writes.
5. Run build, lint, unit, integration, and end-to-end checks before declaring production readiness.

## Review focus

- No client-side role or localStorage value can grant access.
- Illegal workflow transitions are rejected server-side.
- Duplicate commands are safe.
- Stale edits produce conflicts instead of overwrites.
- Evidence cannot be lost during offline recovery.
- Settled payouts are immutable.
- Legacy writes are removed only after new command paths are verified.


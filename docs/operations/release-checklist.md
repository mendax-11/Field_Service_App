# TimberFlow Release Checklist

## Before release

- Confirm the PocketBase instance is backed up.
- Review pending files under `pb_migrations/`.
- Apply migrations to staging first.
- Verify the `installations`, `assignments`, `audit_events`, and `payout_ledger` collections exist.
- Confirm the frontend can authenticate with a real PocketBase session.
- Confirm demo credentials are only available in development builds.

## Automated checks

```bash
node --test tests/*.test.mjs
npm run lint
npm run build
```

All three commands must pass before packaging.

## Workflow smoke test

1. Sign in as Dispatcher.
2. Assign an unassigned order to a carpenter.
3. Sign in as the carpenter.
4. Start transit and confirm the order reaches `In Progress`.
5. Request and verify the customer OTP.
6. Complete the job with evidence and signature.
7. Confirm a payout appears as pending.
8. Sign in as Super Admin and clear the payout.
9. Confirm the payout ledger entry is recorded.
10. Create a replacement request, dispatch it, and confirm the job resumes.

## Offline smoke test

1. Disconnect the browser from the backend.
2. Perform a technician workflow action.
3. Confirm the sync pill shows a pending operation.
4. Reconnect and confirm the operation clears.
5. Force five failed retries and confirm the operation becomes failed.

## Rollback

- Stop the frontend deployment.
- Restore the previous frontend artifact.
- If a migration caused a regression, run its rollback function through PocketBase migration tooling.
- Restore the latest verified PocketBase backup only if data integrity is affected.
- Do not delete operational collections manually before preserving the database backup.


# Lean Order Filter Bar Design

## Intent

Make the Orders screen fast for daily dispatcher work without introducing a large filtering framework.

## Scope

Extend the existing `OrderGrid` filter bar with:

- delivery status;
- payment status;
- SLA bucket: all, overdue, due today, due this week;
- date range: all, today, next 7 days, overdue;
- city/pincode search;
- active filter chips;
- clear-all action;
- filtered result count and filtered CSV export.

Existing search, platform, job status, carpenter, payment type, sorting, pagination, archive toggle, and column visibility remain unchanged.

## Design calls

- Keep filtering client-side because this application currently uses a small sample dataset.
- Use single-select controls to keep the UI compact and predictable.
- Use promise date as the SLA/date source, falling back to delivery date when promise date is absent.
- Completed and cancelled jobs are excluded from SLA-risk buckets.
- Do not add saved views, URL state, multi-select controls, or a shared cross-dashboard filter framework in this slice.

## Acceptance criteria

- Every filter narrows the visible order list correctly.
- Active filters are visible and individually removable.
- Clear-all restores the default view.
- Filtering resets pagination to page one.
- Existing exports contain exactly the filtered rows.
- Existing tests, lint, and production build remain green.


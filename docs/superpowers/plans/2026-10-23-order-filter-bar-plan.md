# Lean Order Filter Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add practical operational filters to the existing Orders screen without introducing a new filtering framework.

**Architecture:** Keep filtering client-side and colocated with `OrderGrid`. Extract pure filter logic into a small domain helper so behavior is testable independently of React.

**Tech Stack:** React, Vite, JavaScript, Node test runner, vanilla CSS.

**Spec:** `docs/superpowers/specs/2026-10-23-order-filter-bar-design.md`

## Global Constraints

- Keep filtering client-side for the sample dataset.
- Use promise date, falling back to delivery date, for SLA/date filtering.
- Completed and cancelled jobs are excluded from SLA-risk buckets.
- Do not add saved views, URL state, or multi-select controls in this slice.

## Review Focus

- Missing promise dates must fall back to delivery dates.
- Completed/cancelled jobs must not appear in SLA-risk results.
- Empty search/location values must not exclude all records.
- Clear-all must restore defaults and page one.
- Active filter chips must remove only their own filter.

### Task 1: Pure order filtering

**Files:**
- Create: `src/domain/orderFilters.js`
- Test: `tests/orderFilters.test.mjs`

- [ ] Write tests for delivery status, payment status, SLA buckets, date range, and location matching.
- [ ] Run the test and verify it fails because the helper is missing.
- [ ] Implement `filterOrders(orders, filters, now)` and `getActiveOrderFilters(filters)`.
- [ ] Run the focused and full test suites.

### Task 2: OrderGrid controls

**Files:**
- Modify: `src/components/OrderGrid.jsx`

- [ ] Add filter state, controls, chips, and clear-all behavior.
- [ ] Replace inline filtering with `filterOrders`.
- [ ] Reset pagination whenever filters change.
- [ ] Run lint, tests, and production build.


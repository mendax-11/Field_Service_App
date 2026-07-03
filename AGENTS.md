# AGENTS.md

This file provides guidance to AI coding assistants and developers when working with code in this repository.

## Project Overview

**TimberFlow** is a premium, modern Field Service Management (FSM) application designed for modular furniture manufacturers, dispatchers, logistics managers, and assembly technicians. It features multi-role Role-Based Access Control (RBAC), location-aware technician scheduling, automated parts dispatch, and a simulated mobile-first carpenter portal.

All development work happens in the root folder of this repository.

## Development Commands

Run these commands from the root directory:

```bash
npm install      # Install dependencies
npm run dev      # Start Vite dev server at http://localhost:5173
npm run build    # Production build check (compiles cleanly)
npm run lint     # Lint check
```

## Architecture

### Stack
- **Frontend**: React 19, Vite 8, Lucide React icons
- **Styling**: Vanilla CSS (maximum control, HSL variables, dark mode slate, glassmorphism)
- **State & Database**: Client-side persistent engine in `src/utils/stateManager.js` utilizing `localStorage`

### Key Directories
- `src/components/` — UI components and sub-dashboards
- `src/utils/` — Core database adapter, seeding arrays, and allocation logic
- `src/assets/` — Static assets and image links

### Core Component Map
| File | Role & Purpose |
|------|-----------------|
| [AdminPortal.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/AdminPortal.jsx) | Desktop tab router (Orders, Logistics, Support, Technicians, Payouts) |
| [OrderGrid.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/OrderGrid.jsx) | Paginated desktop list table with search, sorting, and filters |
| [OrderDetailsModal.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/OrderDetailsModal.jsx) | Carpenter manual dispatcher panel with pincode area validators |
| [TechniciansDashboard.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/TechniciansDashboard.jsx) | Real-time technician tags manager to edit served pincodes |
| [CarpenterPortal.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/CarpenterPortal.jsx) | Simulated mobile screen app with checkout codes, checks, and photos |
| [InventoryDashboard.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/InventoryDashboard.jsx) | Logistics replacement part dispatch center |
| [SupportPortal.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/SupportPortal.jsx) | Support timelines and audit logger |
| [SignatureCanvas.jsx](file:///d:/Anti%20Gravity/Field_Service_App/src/components/SignatureCanvas.jsx) | Digital signature canvas signing pad |

---

## 🛠️ Code Conventions & Design Rules

### 1. Currency & formatting
- **Currency**: All payout figures, outstanding totals, cash alerts, and earnings summaries must be written in **Indian Rupees (₹)**. Do not use the dollar sign (`$`) for pricing.
- **Workloads**: Carpenter workloads are computed dynamically by counting active, incomplete orders assigned to their name.

### 2. Styling Constraints
- **No Tailwind CSS**: Do not install or import Tailwind CSS rules.
- **Glassmorphism**: Layouts must use the dark HSL design tokens declared in `src/index.css`.
- **Smartphone Frame**: Carpenter portal components must render inside the simulated mobile smartphone frame (`.mobile-phone-frame`).

### 3. Database Normalization Adapter
- When reading or updating database fields, pass them through the `normalizeOrder` adapter in `stateManager.js`. This guarantees that both snake_case database schema fields (`order_id`, `assembly_payout`, `delivery_status`) and camelCase UI variables (`orderId`, `payout`, `deliveryStatus`) remain bound and functional.
- Platform brand metadata is auto-detected dynamically from prefix signatures if omitted (`AMZ` $\rightarrow$ `Amazon`, `FLP` $\rightarrow$ `Flipkart`, `WOO`/`WEB` $\rightarrow$ `WooCommerce`).

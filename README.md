# TimberFlow - Carpenter Field Service Application

TimberFlow is a premium, modern Field Service Management (FSM) application designed for modular furniture manufacturers, dispatchers, logistics managers, and assembly technicians. It features multi-role Role-Based Access Control (RBAC), location-aware technician scheduling, automated parts dispatch, and a simulated mobile-first carpenter portal with OTP verification and hand-drawn customer sign-offs.

---

## 💾 Database Architecture

### Client-Side Persistent Database (`localStorage`)
The application operates on a client-side persistent database using the browser's `localStorage` (keys prefixed with `fsa_`). This ensures that orders, carpenter workload states, notifications, and settings are preserved across page refreshes.

### Core Data Models
Our state engine (managed in `src/utils/stateManager.js`) uses a **dual-property mapping adapter** (`normalizeOrder` decorator) to maintain full compatibility between:
1. **Database Schema Columns (snake_case)**:
   - `order_id`, `product_sku`, `assembly_payout`, `delivery_status`, `payment_status`, `payment_type`, `assigned_carpenter`
2. **Frontend UI Components (camelCase)**:
   - `orderId`, `sku`, `payout`, `deliveryStatus`, `paymentStatus`, `paymentType`, `assignedCarpenter`

This wrapper auto-heals corrupted records and dynamically maps retail platform prefixes (like `AMZ-` or `FLP-`) to populate missing properties automatically.

---

## 🛠️ Key Features

### 1. Pincode Location Mapping & Warnings
- **Technician Coverage**: Carpenters are mapped to lists of served pincodes. If a technician does not cover a specific area, the system warns the dispatcher.
- **Manual Assignment Feedback**: Selecting an out-of-area technician displays a red **Warning Banner** in the assignment modal. Selecting a serving technician displays a green **Success Banner**.
- **Pincode Manager**: The **Technicians** tab allows admins to add or remove served pincodes for any carpenter in real-time.

### 2. Smart Auto-Allocation Engine
- Runs a load-balancing dispatcher algorithm that filters carpenters serving the customer's pincode first.
- Auto-assigns the job to the technician with the lowest active workload (number of incomplete orders).

### 3. CSV Order Importer
- Supports batch importing of retail customer orders using custom schemas for **Amazon**, **Flipkart**, and **WooCommerce**.
- Performs client-side duplicate checking on the `orderId` to prevent importing existing jobs.

### 4. Advanced Order Grid
- Real-time search by Customer Name, Order ID, Phone, or SKU.
- Multi-dimensional filters (Platform, Job Status, Assigned Carpenter, Payment Type).
- Column sorting (Date, Payout Amount, SLA urgency) and customizable pagination.

### 5. Payout Ledger (Super Admin Only)
- Audits carpenter earnings. All payouts and balances are calculated and cleared globally in Rupees (`₹`).
- Highlights cash collection alerts for **Customer Pay** orders so carpenters can collect funds directly on-site.

### 6. Logistics & Parts Dispatch
- Inventory dashboard tracking jobs placed **On Hold** due to damaged components.
- Allows logistics managers to review defective part photos uploaded by technicians and approve replacements.

### 7. Carpenter Mobile Portal (Simulated Smartphone)
- Logs in as a carpenter to display a simulated mobile phone frame.
- **Job Isolation**: Carpenters only see their own assigned work.
- **Installation Checklist**: Interactive, step-by-step progress checklist.
- **Verification & Sign-off**: Requires checklist completion, before/after photo uploads, verification via client OTP, and captures client signatures using an **HTML5 Digital Signature Canvas**.

---

## 📂 Project Structure

```text
Field_Service_App/
├── src/
│   ├── components/
│   │   ├── AdminPortal.jsx           # Desktop admin console tabs & logic
│   │   ├── AdminPortal.css           # Styling for desktop panels & grids
│   │   ├── OrderGrid.jsx             # Filterable and sortable order list table
│   │   ├── OrderDetailsModal.jsx     # Carpenter assignment modal & pincode checks
│   │   ├── TechniciansDashboard.jsx  # Pincode administration & workload tags
│   │   ├── CarpenterPortal.jsx       # Mobile phone frame simulator & technician app
│   │   ├── CarpenterPortal.css       # Mobile smartphone responsive CSS
│   │   ├── InventoryDashboard.jsx    # Logistics parts dispatch console
│   │   ├── SupportPortal.jsx         # Customer lookup desk & audit trail timeline
│   │   └── SignatureCanvas.jsx       # HTML5 canvas signature capture pad
│   ├── utils/
│   │   └── stateManager.js           # Core database engine, seed records, and local storage state
│   ├── App.jsx                       # Main workspace switcher & logout utility
│   ├── index.css                     # Premium global styles, HSL dark mode, and glassmorphism cards
│   └── main.jsx                      # App entry point
├── package.json
└── vite.config.js
```

---

## 🚀 Getting Started

### Installation
1. Clone or copy the project files to your local environment.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the Vite development server:
   ```bash
   npm run dev
   ```
Open `http://localhost:5173` in your browser to access the app sandbox.

### Presets & Roles (Sandbox Testing)
Use the global role-selector dropdown in the top header to instantly switch contexts:
- **Super Admin**: Access all tabs including payouts and order deletions.
- **Dispatcher**: Run auto-allocations and parse retail CSV lists.
- **Inventory Manager**: Dispatch replacement parts for On-Hold jobs.
- **Customer Support**: Read-only lookup of order grids, timeline events, and comments.
- **Carpenter (John/Mark)**: Switch to the mobile technician view inside the smartphone simulator.

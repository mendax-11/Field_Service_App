import PocketBase from 'pocketbase';

// Connect to local or remote PocketBase instance.
let POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Dynamic runtime override for remote clients (avoids hardcoded localhost from .env during Vite build)
if (typeof window !== 'undefined' && window.location) {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    // Caddy routes /api/* and /_* directly to PocketBase — no /pb prefix needed.
    // For HTTP deployments, PocketBase may be on port 8090 directly.
    if (protocol === 'https:') {
      POCKETBASE_URL = `${protocol}//${hostname}`;
    } else {
      POCKETBASE_URL = `${protocol}//${hostname}:8090`;
    }
  }
}

console.log('[PocketBase Engine] Connecting to:', POCKETBASE_URL);
export const pb = new PocketBase(POCKETBASE_URL);


const STORAGE_KEYS = {
  ORDERS: 'fsa_orders',
  CARPENTERS: 'fsa_carpenters',
  USER_ROLE: 'fsa_user_role',
  NOTIFICATIONS: 'fsa_notifications',
  LOGGED_IN_USER: 'fsa_logged_in_user', // Active session role/user
  SYNC_QUEUE: 'fsa_sync_queue'          // Offline operation retry queue
};

const getRelativeDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
};

const DEFAULT_ORDERS = [
  {
    order_id: 'AMZ-9023',
    customer_name: 'Robert Downey',
    product_sku: 'SKU-BED-QUEEN-01',
    assembly_payout: 120,
    customer_phone: '+1-555-0199',
    customer_address: '123 Malibu Cliff Drive',
    city: 'Malibu',
    state: 'CA',
    pincode: '90265',
    status: 'Unassigned',
    payment_status: 'Unpaid',
    payment_type: 'Company Pay',
    assigned_carpenter: '',
    assigned_date: '',
    product_image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://pdf.lowes.com/useandcareguides/091238491023_use.pdf',
    seller_reviewer: 'Amazon Quality Reviewer',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-1), // Delivered yesterday (SLA active!)
    promise_date: getRelativeDate(1),
    checklist: [
      { id: 1, label: 'Unbox components & verify hardware inventory', checked: false },
      { id: 2, label: 'Assemble main bed frame boundary', checked: false },
      { id: 3, label: 'Install middle support beam and brackets', checked: false },
      { id: 4, label: 'Lay down support slats and secure screw terminals', checked: false },
      { id: 5, label: 'Inspect leg levelers & clean wood surfaces', checked: false }
    ],
    comments: [],
    auditLogs: [
      { timestamp: getRelativeDate(-2), action: 'Order Created', user: 'System', comments: 'Imported via Amazon CSV' },
      { timestamp: getRelativeDate(-1), action: 'Delivered to Customer', user: 'Logistics', comments: 'Delivery status changed to Delivered. Carpenter SLA begins.' }
    ]
  },
  {
    order_id: 'FLP-4421',
    customer_name: 'Scarlett Johansson',
    product_sku: 'SKU-TABLE-STUDY-02',
    assembly_payout: 85,
    customer_phone: '+1-555-0148',
    customer_address: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    pincode: '62704',
    status: 'Assigned',
    payment_status: 'Unpaid',
    payment_type: 'Customer Pay', // Customer Pay: collected directly from customer
    assigned_carpenter: 'John Carpenter',
    assigned_date: getRelativeDate(0),
    product_image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/tables/study-desk-assembly.pdf',
    seller_reviewer: 'Flipkart Auditor Team',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(0), // Delivered today
    promise_date: getRelativeDate(2),
    checklist: [
      { id: 1, label: 'Unbox components & lay parts out by size', checked: true },
      { id: 2, label: 'Assemble outer structure and rear backboard panel', checked: true },
      { id: 3, label: 'Install internal divider rails and drawer runners', checked: false },
      { id: 4, label: 'Build drawer boxes and mount front wood facings', checked: false },
      { id: 5, label: 'Adjust drawer alignment and anchor table', checked: false }
    ],
    comments: [
      { timestamp: getRelativeDate(0), author: 'John Carpenter', text: 'Checked in at site. Initiating assembly of study table.' }
    ],
    auditLogs: [
      { timestamp: getRelativeDate(-1), action: 'Order Created', user: 'System', comments: 'Imported via Flipkart CSV' },
      { timestamp: getRelativeDate(0), action: 'Carpenter Assigned', user: 'Dispatcher', comments: 'Assigned to John Carpenter' }
    ]
  },
  {
    order_id: 'WEB-5523',
    customer_name: 'Chris Evans',
    product_sku: 'SKU-WARD-DOUBLE-03',
    assembly_payout: 150,
    customer_phone: '+1-555-0177',
    customer_address: '569 Brooklyn Heights',
    city: 'New York',
    state: 'NY',
    pincode: '11201',
    status: 'In Progress',
    payment_status: 'Unpaid',
    payment_type: 'Company Pay',
    assigned_carpenter: 'Mark Carpenter',
    assigned_date: getRelativeDate(-1),
    product_image: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/wardrobes/double-wardrobe.pdf',
    seller_reviewer: 'Webstore Logistics',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-1), // Delivered yesterday
    promise_date: getRelativeDate(1),
    checklist: [
      { id: 1, label: 'Unbox components & verify shelves & hardware', checked: true },
      { id: 2, label: 'Assemble upright side panels with stability braces', checked: true },
      { id: 3, label: 'Mount drawer runners and slide tracks', checked: false },
      { id: 4, label: 'Secure back panel and level cabinet feet', checked: false }
    ],
    comments: [
      { timestamp: getRelativeDate(-1) + 'T15:20:00.000Z', author: 'Mark Carpenter', text: 'The wood panels are heavy, will require carefully placing mats on floor.' }
    ],
    auditLogs: [
      { timestamp: getRelativeDate(-2), action: 'Order Created', user: 'System', comments: 'WooCommerce Sync' },
      { timestamp: getRelativeDate(-1), action: 'Carpenter Assigned', user: 'System (Auto)', comments: 'Assigned to Mark Carpenter' },
      { timestamp: getRelativeDate(-1), action: 'Status Changed to In Progress', user: 'Mark Carpenter', comments: 'Began assembly work' }
    ]
  },
  {
    order_id: 'AMZ-1049',
    customer_name: 'Tom Holland',
    product_sku: 'SKU-CHAIR-ERGO-04',
    assembly_payout: 50,
    customer_phone: '+1-555-0121',
    customer_address: '20 Ingram Street',
    city: 'Queens',
    state: 'NY',
    pincode: '11375',
    status: 'On Hold - Parts Requested',
    payment_status: 'Unpaid',
    payment_type: 'Customer Pay',
    assigned_carpenter: 'John Carpenter',
    assigned_date: getRelativeDate(-2),
    product_image: 'https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/chairs/ergo-chair.pdf',
    seller_reviewer: 'Amazon Quality Reviewer',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-2),
    promise_date: getRelativeDate(0),
    checklist: [
      { id: 1, label: 'Unbox parts and verify gas lift / wheel inventory', checked: true },
      { id: 2, label: 'Fit wheels into base and set cylinder', checked: true },
      { id: 3, label: 'Discover gas cylinder height adjuster split', checked: true }
    ],
    damageReport: {
      partName: 'Gas Lift Cylinder M8',
      notes: 'The hydraulic lift cylinder is completely leaking pressure and cracked on arrival.',
      photo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23c0392b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">Damaged Cylinder</text></svg>'
    },
    comments: [
      { timestamp: getRelativeDate(-2), author: 'John Carpenter', text: 'Submitted replacement request. Table/Chair gas lift is busted.' },
      { timestamp: getRelativeDate(-1), author: 'Dispatcher', text: 'Parts department notified. Shipping direct replacement part to client.' }
    ],
    auditLogs: [
      { timestamp: getRelativeDate(-3), action: 'Order Created', user: 'System', comments: 'Imported via Amazon CSV' },
      { timestamp: getRelativeDate(-2), action: 'Carpenter Assigned', user: 'Dispatcher', comments: 'Assigned to John Carpenter' },
      { timestamp: getRelativeDate(-2), action: 'Status Changed to On Hold', user: 'John Carpenter', comments: 'Parts requested due to damage' }
    ]
  },
  {
    order_id: 'FLP-9022',
    customer_name: 'Benedict Cumberbatch',
    product_sku: 'SKU-SOFA-SEATER-05',
    assembly_payout: 110,
    customer_phone: '+1-555-0155',
    customer_address: '221B Baker Street',
    city: 'Cincinnati',
    state: 'OH',
    pincode: '45202',
    status: 'Completed',
    payment_status: 'Paid', // Super Admin processed this payout
    payment_type: 'Company Pay',
    assigned_carpenter: 'Mark Carpenter',
    assigned_date: getRelativeDate(-3),
    product_image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/sofas/seater-sofa.pdf',
    seller_reviewer: 'Flipkart Auditor Team',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-3),
    promise_date: getRelativeDate(-1),
    checklist: [
      { id: 1, label: 'Unpack frame & attach 4 wooden legs', checked: true },
      { id: 2, label: 'Position back support cushions and align locks', checked: true }
    ],
    photos: {
      before: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%232c3e50"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">Before Photo</text></svg>',
      after: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%2327ae60"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">After Photo</text></svg>'
    },
    signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><path d="M 10 80 Q 52.5 10, 95 80" fill="none" stroke="black" stroke-width="3"/></svg>',
    comments: [],
    auditLogs: [
      { timestamp: getRelativeDate(-4), action: 'Order Created', user: 'System', comments: 'Flipkart Sync' },
      { timestamp: getRelativeDate(-3), action: 'Carpenter Assigned', user: 'Dispatcher', comments: 'Assigned to Mark Carpenter' },
      { timestamp: getRelativeDate(-3), action: 'Job Completed', user: 'Mark Carpenter', comments: 'Signature and proof photos uploaded.' },
      { timestamp: getRelativeDate(-2), action: 'Payout Cleared', user: 'Super Admin', comments: 'Outstanding payout of ₹110 disbursed.' }
    ]
  },
  {
    order_id: 'WEB-3310',
    customer_name: 'Elizabeth Olsen',
    product_sku: 'SKU-SHELF-WOOD-06',
    assembly_payout: 75,
    customer_phone: '+1-555-0112',
    customer_address: '2800 West Alameda Avenue',
    city: 'Burbank',
    state: 'CA',
    pincode: '91505',
    status: 'Unassigned',
    payment_status: 'Unpaid',
    payment_type: 'Company Pay',
    assigned_carpenter: '',
    assigned_date: '',
    product_image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/bookshelves/wooden-shelf.pdf',
    seller_reviewer: 'Webstore Logistics',
    delivery_status: 'Pending', // Awaiting delivery: SLA is inactive
    delivery_date: '',
    promise_date: getRelativeDate(3),
    checklist: [
      { id: 1, label: 'Unbox shelves and check side frames', checked: false },
      { id: 2, label: 'Mount 4 structural supports and screw braces', checked: false }
    ],
    comments: [],
    auditLogs: [
      { timestamp: getRelativeDate(-1), action: 'Order Created', user: 'System', comments: 'Webstore Order Sync' }
    ]
  }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'n1', text: 'New order WEB-3310 is pending auto-allocation.', timestamp: getRelativeDate(0), read: false },
  { id: 'n2', text: 'Parts requested for order AMZ-1049 by John Carpenter.', timestamp: getRelativeDate(-2), read: false }
];

// Normalize an order object to present both snake_case and camelCase aliases 
// to prevent breaking any component layouts that depend on either format.
export function normalizeOrder(o) {
  if (!o) return null;

  const orderId = o.orderId || o.order_id || o.id || '';
  const sku = o.sku || o.product_sku || '';
  const productName = o.productName || o.product_name || o.product_sku || '';
  const payout = Number(o.payout || o.assembly_payout || o.payoutAmount || o.assembly_amount || 0);
  const customerName = o.customerName || o.customer_name || '';
  const customerPhone = o.customerPhone || o.customer_phone || o.customer_number || o.customer_phone_number || '';
  const customerAddress = o.customerAddress || o.customer_address || o.address || '';
  const jobStatus = o.jobStatus || o.status || o.assembly_status || o.assemblyStatus || 'Unassigned';
  const paymentStatus = o.paymentStatus || o.payment_status || 'Unpaid';
  
  let platform = o.platform;
  if (!platform) {
    if (orderId.startsWith('AMZ')) platform = 'Amazon';
    else if (orderId.startsWith('FLP')) platform = 'Flipkart';
    else if (orderId.startsWith('WEB') || orderId.startsWith('WOO')) platform = 'WooCommerce';
    else platform = 'Amazon';
  }
  
  let paymentType = o.paymentType || o.payment_type || o.payment_source || 'Company Pay';
  if (paymentType === 'Company') paymentType = 'Company Pay';
  if (paymentType === 'Customer') paymentType = 'Customer Pay';

  let assignedCarpenter = o.assignedCarpenter || o.assignedCarpenterName || o.assigned_carpenter_name || '';
  let assignedCarpenterId = o.assignedCarpenterId || o.assigned_carpenter_id || '';

  // If assigned_carpenter contains the ID
  if (o.assigned_carpenter && o.assigned_carpenter.length > 10) {
    assignedCarpenterId = o.assigned_carpenter;
  } else if (o.assigned_carpenter) {
    assignedCarpenter = o.assigned_carpenter;
  }
  const assignedDate = o.assignedDate || o.assigned_date || '';
  const productImage = o.productImage || o.product_image || o.product_image_url || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80';
  const productRefLink = o.productRefLink || o.product_ref_link || o.product_review_link || 'https://manuals.service.com/assembly-guide.pdf';
  const sellerReviewer = o.sellerReviewer || o.seller_reviewer || o.seller_review_link || 'System';
  const deliveryStatus = o.deliveryStatus || o.delivery_status || 'Pending';
  const deliveryDate = o.deliveryDate || o.delivery_date || '';
  const promiseDate = o.promiseDate || o.promise_date || o['promise date'] || '';
  
  const checklist = o.checklist || [
    { id: 1, label: 'Unbox components & verify hardware inventory', checked: false },
    { id: 2, label: 'Assemble main frame structure', checked: false },
    { id: 3, label: 'Install internal shelves/drawers', checked: false },
    { id: 4, label: 'Inspect leg alignment and secure joints', checked: false },
    { id: 5, label: 'Clean surfaces and request client sign-off', checked: false }
  ];

  const damageReport = o.damageReport || o.damage_report || o.replacement_request || null;
  const photos = o.photos || { before: null, after: null };
  const otp = o.otp || '1234';
  const otpSent = o.otpSent !== undefined ? o.otpSent : (o.otp_sent !== undefined ? o.otp_sent : false);
  const otpVerified = o.otpVerified !== undefined ? o.otpVerified : (o.otp_verified !== undefined ? o.otp_verified : false);
  const signature = o.signature || o.customer_signature || null;
  const comments = o.comments || [];
  const auditLogs = o.auditLogs || o.audit_logs || [];
  const archived = o.archived !== undefined ? o.archived : (o.is_archived !== undefined ? o.is_archived : false);
  const extraCharges = o.extraCharges || o.extra_charges || [];

  return {
    // Database schema snake_case fields
    order_id: orderId,
    platform,
    customer_name: customerName,
    product_sku: sku,
    assembly_payout: payout,
    customer_phone: customerPhone,
    customer_address: customerAddress,
    city: o.city || 'Springfield',
    state: o.state || 'IL',
    pincode: o.pincode || '62704',
    status: jobStatus,
    payment_status: paymentStatus,
    payment_type: paymentType,
    assigned_carpenter: assignedCarpenterId || assignedCarpenter || null,
    assigned_carpenter_name: assignedCarpenter,
    assigned_date: assignedDate,
    product_image: productImage,
    product_ref_link: productRefLink,
    seller_reviewer: sellerReviewer,
    delivery_status: deliveryStatus,
    delivery_date: deliveryDate,
    promise_date: promiseDate,
    
    // React component camelCase fields for seamless compatibility
    orderId,
    id: orderId,
    customerName,
    sku,
    productName,
    payout,
    payoutAmount: payout,
    customerPhone,
    customerAddress,
    address: customerAddress,
    jobStatus,
    paymentStatus,
    paymentType,
    assignedCarpenter,
    assignedCarpenterId,
    assignedDate,
    productImage,
    productRefLink,
    sellerReviewer,
    deliveryStatus,
    deliveryDate,
    promiseDate,

    // New requested fields mapping
    assembly_amount: payout,
    customer_number: customerPhone,
    payment_source: paymentType,
    product_image_url: productImage,
    product_review_link: productRefLink,
    seller_review_link: sellerReviewer,
    'promise date': promiseDate,
    assembly_status: jobStatus,
    
    subCarpenterName: o.subCarpenterName || o.sub_carpenter_name || '',
    subCarpenterPhone: o.subCarpenterPhone || o.sub_carpenter_phone || '',
    sub_carpenter_name: o.subCarpenterName || o.sub_carpenter_name || '',
    sub_carpenter_phone: o.subCarpenterPhone || o.sub_carpenter_phone || '',
    
    // Nested objects
    checklist,
    damageReport,
    damage_report: damageReport,
    replacement_request: damageReport,
    photos,
    otp,
    otpSent,
    otp_sent: otpSent,
    otpVerified,
    otp_verified: otpVerified,
    signature,
    customer_signature: signature,
    comments,
    auditLogs,
    audit_logs: auditLogs,
    archived,
    is_archived: archived,
    extraCharges,
    extra_charges: extraCharges
  };
}

// ─────────────────────────────────────────────
// INDEXEDDB ENGINE & IN-MEMORY CACHE
// ─────────────────────────────────────────────
const DB_NAME = 'timberflow_db';
const DB_VERSION = 1;
const STORES = {
  ORDERS: 'orders',
  CARPENTERS: 'carpenters'
};

function getDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        db.createObjectStore(STORES.ORDERS, { keyPath: 'orderId' });
      }
      if (!db.objectStoreNames.contains(STORES.CARPENTERS)) {
        db.createObjectStore(STORES.CARPENTERS, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function idbSave(storeName, data) {
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    // Clear existing records before saving the new state representation
    store.clear();
    data.forEach(item => {
      store.put(item);
    });
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error(`[IndexedDB] Save failed on store ${storeName}:`, e);
  }
}

async function idbGetAll(storeName) {
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error(`[IndexedDB] Read failed on store ${storeName}:`, e);
    return [];
  }
}

// Memory caches to avoid synchronous I/O blocks on React render cycles
let memoryOrders = null;
let memoryCarpenters = null;

// Initialize Storage (boots synchronously with localStorage fallback, then loads IndexedDB asynchronously)
export const initializeStorage = async () => {
  // Sync initialization of localstorage fallbacks first
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(DEFAULT_ORDERS.map(normalizeOrder)));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CARPENTERS)) {
    localStorage.setItem(STORAGE_KEYS.CARPENTERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USER_ROLE)) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'Super Admin'); // Default role
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }

  // Load from IndexedDB
  try {
    const dbOrders = await idbGetAll(STORES.ORDERS);
    const dbCarpenters = await idbGetAll(STORES.CARPENTERS);
    
    let needsUpdate = false;
    if (dbOrders.length > 0) {
      memoryOrders = dbOrders.map(normalizeOrder);
      needsUpdate = true;
    } else {
      memoryOrders = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]').map(normalizeOrder);
      await idbSave(STORES.ORDERS, memoryOrders);
    }
    
    if (dbCarpenters.length > 0) {
      memoryCarpenters = dbCarpenters;
      needsUpdate = true;
    } else {
      memoryCarpenters = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARPENTERS) || '[]');
      await idbSave(STORES.CARPENTERS, memoryCarpenters);
    }
    
    if (needsUpdate) {
      window.dispatchEvent(new Event('fsa_storage_update'));
    }
  } catch (e) {
    console.warn('Failed to bootstrap IndexedDB, falling back to localStorage:', e);
  }
};

// Bootstrap storage async on load
initializeStorage();

export const MAX_ACTIVE_JOBS = 3;

export const getActiveWorkload = (carpName) => {
  if (!carpName) return 0;
  const orders = getOrders();
  return orders.filter(o => o.assignedCarpenter === carpName && o.jobStatus !== 'Completed').length;
};

// Orders
export const getOrders = () => {
  if (memoryOrders && memoryOrders.length > 0) {
    return memoryOrders;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS)) || [];
    memoryOrders = raw.map(normalizeOrder);
    return memoryOrders;
  } catch (e) {
    memoryOrders = DEFAULT_ORDERS.map(normalizeOrder);
    return memoryOrders;
  }
};

export const saveOrders = (orders) => {
  const normalized = orders.map(normalizeOrder);
  memoryOrders = normalized;
  
  // Asynchronously save to localStorage fallback to keep thread unblocked
  setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(normalized));
    } catch (e) {
      console.warn('[Storage] LocalStorage quota exceeded, caching in IndexedDB only.');
    }
  }, 0);

  // Persist to IndexedDB
  idbSave(STORES.ORDERS, normalized);

  window.dispatchEvent(new Event('fsa_storage_update'));
  
  // Background sync orders to PocketBase
  normalized.forEach(o => {
    syncOrderToPocketBase(o.orderId, o);
  });
};

export const rejectJob = (orderId, carpenterName, reason) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index !== -1) {
    const order = orders[index];
    const newStatus = 'Unassigned';
    
    // Update order
    orders[index] = { 
      ...order, 
      assignedCarpenter: '', 
      assignedCarpenterId: '',
      jobStatus: newStatus,
      status: newStatus
    };
    
    saveOrders(orders);
    
    // Add comment
    addComment(
      orderId,
      `Carpenter ${carpenterName} rejected/skipped the order. Reason: ${reason}`,
      'System'
    );
    
    // Add audit log manually since we updated the order already
    const updatedOrders = getOrders();
    const updatedIndex = updatedOrders.findIndex(o => o.orderId === orderId);
    if (updatedIndex !== -1) {
      if (!updatedOrders[updatedIndex].auditLogs) updatedOrders[updatedIndex].auditLogs = [];
      updatedOrders[updatedIndex].auditLogs.push({
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Job Rejected',
        comments: `Carpenter ${carpenterName} skipped order: ${reason}`
      });
      saveOrders(updatedOrders);
    }
  }
};

export const updateOrder = (orderId, updatedFields) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.orderId === orderId);
  if (index !== -1) {
    const oldStatus = orders[index].jobStatus || orders[index].status || 'Unassigned';
    const newStatus = updatedFields.jobStatus || updatedFields.status;

    orders[index] = { ...orders[index], ...updatedFields };
    saveOrders(orders);
    const updated = normalizeOrder(orders[index]);

    // Check status transition
    if (newStatus && newStatus !== oldStatus) {
      if (newStatus === 'Completed') {
        triggerN8nWebhook('job_completed', {
          orderId: updated.orderId,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone || '',
          carpenterName: updated.assignedCarpenter || '',
          completionPhotoUrl: updated.photos?.after || '',
          signatureUrl: updated.secureSignatureUrl || ''
        });
      } else if (newStatus === 'In Progress') {
        const trackLink = `${window.location.origin}${window.location.pathname}?track=${updated.orderId}`;
        triggerN8nWebhook('transit_started', {
          orderId: updated.orderId,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone || '',
          carpenterName: updated.assignedCarpenter || '',
          etaMinutes: 25,
          trackingUrl: trackLink
        });
      } else if (newStatus === 'Assigned') {
        const directLink = `${window.location.origin}${window.location.pathname}?job=${updated.orderId}`;
        triggerN8nWebhook('job_assigned', {
          orderId: updated.orderId,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone || '',
          customerAddress: updated.customerAddress || '',
          pincode: updated.pincode || '',
          carpenterName: updated.assignedCarpenter || '',
          payout: updated.payout || 0,
          jobLink: directLink
        });
      }
    }

    return updated;
  }
  return null;
};

export const deleteOrder = (orderId) => {
  const orders = getOrders();
  const target = orders.find(o => o.orderId === orderId);
  if (target && (target.paymentStatus === 'Paid' || target.jobStatus === 'Completed' || target.status === 'Completed')) {
    addNotification(`Deletion blocked: Order ${orderId} is paid or completed.`, '', 'Admin');
    return;
  }
  const filtered = orders.filter(o => o.orderId !== orderId);
  saveOrders(filtered);
  
  // Sync delete to PocketBase in the background
  (async () => {
    try {
      const record = await pb.collection('orders').getFirstListItem(`order_id="${orderId}"`);
      if (record) {
        await pb.collection('orders').delete(record.id);
      }
    } catch (e) {}
  })();

  addNotification(`Order ${orderId} has been deleted.`);
};

export const addOrder = (orderObj) => {
  const orders = getOrders();
  const orderId = orderObj.orderId || `MAN-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder = normalizeOrder({
    orderId,
    platform: orderObj.platform || 'Amazon',
    customerName: orderObj.customerName || '',
    customerPhone: orderObj.customerPhone || '',
    customerAddress: orderObj.customerAddress || '',
    city: orderObj.city || '',
    state: orderObj.state || '',
    pincode: orderObj.pincode || '',
    jobStatus: 'Unassigned',
    paymentStatus: 'Unpaid',
    paymentType: orderObj.paymentType || 'Company Pay',
    payout: Number(orderObj.payout || 100),
    deliveryStatus: 'Pending',
    deliveryDate: orderObj.deliveryDate || new Date(Date.now() + 3*24*60*60*1000).toISOString(),
    promiseDate: orderObj.promiseDate || '',
    product_image_url: orderObj.productImageUrl || '',
    product_review_link: orderObj.productReviewLink || '',
    seller_review_link: orderObj.sellerReviewLink || '',
    sku: orderObj.sku || '',
    orderDate: new Date().toISOString(),
    comments: [],
    auditLogs: [
      {
        timestamp: new Date().toISOString(),
        action: 'Order Created',
        user: getUserRole(),
        comments: 'Manually created order inside dispatcher dashboard.'
      }
    ]
  });
  
  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
};

export const addCarpenter = (carpObj) => {
  const carpenters = getCarpenters();
  const id = `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const cleanPhone = (carpObj.phone || '').replace(/[^0-9]/g, '');
  const generatedEmail = carpObj.email || (cleanPhone ? `${cleanPhone}@timberflow.in` : `carp_${Date.now()}@timberflow.in`);
  const newCarp = {
    id,
    name: carpObj.name,
    phone: carpObj.phone || '',
    email: generatedEmail,
    rank: carpObj.rank || 'Expert',
    activeJobs: 0,
    maxActiveJobs: Number(carpObj.maxActiveJobs || carpObj.max_active_jobs || 3),
    pincodes: carpObj.pincodes || []
  };
  carpenters.push(newCarp);
  saveCarpenters(carpenters);
  
  // Sync to PocketBase in the background
  (async () => {
    try {
      const tempPass = `Tmp_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      const payload = {
        username: cleanPhone || `carp_${Date.now()}`,
        email: generatedEmail,
        password: tempPass,
        passwordConfirm: tempPass,
        name: carpObj.name,
        phone: carpObj.phone || '',
        role: 'Carpenter',
        rank: carpObj.rank || 'Expert',
        max_active_jobs: Number(carpObj.maxActiveJobs || carpObj.max_active_jobs || 3),
        pincodes: carpObj.pincodes || []
      };
      const created = await pb.collection('users').create(payload);
      console.log("[PocketBase] Successfully created carpenter user record:", created);
    } catch (e) {
      console.error("[PocketBase] Failed to create carpenter user record:", e);
    }
  })();

  return newCarp;
};

export const updateCarpenter = (carpId, updatedFields) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpId);
  if (index !== -1) {
    carpenters[index] = { ...carpenters[index], ...updatedFields };
    saveCarpenters(carpenters);
    return carpenters[index];
  }
  return null;
};

export const deleteCarpenter = (carpId) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpId);
  if (index !== -1) {
    const phone = carpenters[index].phone;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const filtered = carpenters.filter(c => c.id !== carpId);
    saveCarpenters(filtered);
    
    // Sync delete to PocketBase in the background
    (async () => {
      try {
        let record = null;
        if (cleanPhone) {
          try {
            record = await pb.collection('users').getFirstListItem(`username="${cleanPhone}"`);
          } catch (e) {
            record = await pb.collection('users').getFirstListItem(`phone="${phone}"`);
          }
        }
        if (!record && carpenters[index].email) {
          try {
            record = await pb.collection('users').getFirstListItem(`email="${carpenters[index].email}"`);
          } catch (e) {}
        }
        if (record) {
          await pb.collection('users').delete(record.id);
        }
      } catch (e) {}
    })();
    return true;
  }
  return false;
};
// Carpenters
export const getCarpenters = () => {
  if (memoryCarpenters && memoryCarpenters.length > 0) {
    return memoryCarpenters;
  }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.CARPENTERS)) || [];
    memoryCarpenters = raw;
    return memoryCarpenters;
  } catch (e) {
    memoryCarpenters = [];
    return memoryCarpenters;
  }
};

export const saveCarpenters = (carpenters) => {
  memoryCarpenters = carpenters;

  // Asynchronously save to localStorage fallback to keep thread unblocked
  setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARPENTERS, JSON.stringify(carpenters));
    } catch (e) {
      console.warn('[Storage] LocalStorage quota exceeded, caching in IndexedDB only.');
    }
  }, 0);

  // Persist to IndexedDB
  idbSave(STORES.CARPENTERS, carpenters);

  window.dispatchEvent(new Event('fsa_storage_update'));
  
  // Background sync carpenters served pincodes to PocketBase
  carpenters.forEach(c => {
    syncCarpenterPincodesToPocketBase(c.id, c.pincodes);
  });
};
function saveOrdersLocalOnly(orders) {
  const normalized = orders.map(normalizeOrder);
  memoryOrders = normalized;
  setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(normalized));
    } catch (e) {}
  }, 0);
  idbSave(STORES.ORDERS, normalized);
  window.dispatchEvent(new Event('fsa_storage_update'));
}

function saveCarpentersLocalOnly(carpenters) {
  memoryCarpenters = carpenters;
  setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARPENTERS, JSON.stringify(carpenters));
    } catch (e) {}
  }, 0);
  idbSave(STORES.CARPENTERS, carpenters);
  window.dispatchEvent(new Event('fsa_storage_update'));
}

export const addCarpenterPincode = (carpenterId, pincode) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpenterId);
  if (index !== -1) {
    const carp = carpenters[index];
    if (!carp.pincodes) carp.pincodes = [];
    if (!carp.pincodes.includes(pincode)) {
      carp.pincodes.push(pincode);
      saveCarpenters(carpenters);
      return true;
    }
  }
  return false;
};

export const removeCarpenterPincode = (carpenterId, pincode) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpenterId);
  if (index !== -1) {
    const carp = carpenters[index];
    if (carp.pincodes) {
      carp.pincodes = carp.pincodes.filter(p => p !== pincode);
      saveCarpenters(carpenters);
      return true;
    }
  }
  return false;
};

// Bulk-add an array of pincodes to a carpenter (deduplicates automatically)
export const addCarpenterPincodes = (carpenterId, newPincodes = []) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpenterId);
  if (index !== -1) {
    const existing = new Set(carpenters[index].pincodes || []);
    newPincodes.forEach(p => { if (p) existing.add(p.trim()); });
    carpenters[index].pincodes = [...existing];
    saveCarpenters(carpenters);
    return carpenters[index].pincodes.length;
  }
  return 0;
};

// Replace entire pincode list for a carpenter atomically
export const replaceCarpenterPincodes = (carpenterId, pincodes = []) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpenterId);
  if (index !== -1) {
    const cleaned = [...new Set(pincodes.map(p => p.trim()).filter(p => p && /^[a-zA-Z0-9\-\s]+$/.test(p)))];
    carpenters[index].pincodes = cleaned;
    saveCarpenters(carpenters);
    return cleaned.length;
  }
  return 0;
};

// Clear all pincodes for a carpenter
export const clearCarpenterPincodes = (carpenterId) => {
  const carpenters = getCarpenters();
  const index = carpenters.findIndex(c => c.id === carpenterId);
  if (index !== -1) {
    carpenters[index].pincodes = [];
    saveCarpenters(carpenters);
    return true;
  }
  return false;
};

// ─────────────────────────────────────────────
// CSV EXPORT UTILITIES
// ─────────────────────────────────────────────

// Escape a single CSV cell value
const csvCell = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Trigger a browser download of a CSV string
const downloadCSV = (csvString, filename) => {
  const BOM = '\uFEFF'; // UTF-8 BOM so Excel opens it correctly
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const exportOrdersCSV = () => {
  const orders = getOrders();
  const headers = [
    'Order ID', 'Platform', 'Customer Name', 'Customer Phone', 'Customer Address',
    'City', 'State', 'Pincode', 'Product SKU', 'Assembly Payout (INR)',
    'Job Status', 'Payment Status', 'Payment Type',
    'Assigned Carpenter', 'Assigned Date',
    'Delivery Status', 'Delivery Date', 'Promise Date',
    'Seller Reviewer'
  ];

  const rows = orders.map(o => [
    csvCell(o.order_id),
    csvCell(o.platform),
    csvCell(o.customer_name),
    csvCell(o.customer_phone),
    csvCell(o.customer_address),
    csvCell(o.city),
    csvCell(o.state),
    csvCell(o.pincode),
    csvCell(o.product_sku),
    csvCell(o.assembly_payout),
    csvCell(o.status),
    csvCell(o.payment_status),
    csvCell(o.payment_type),
    csvCell(o.assigned_carpenter),
    csvCell(o.assigned_date),
    csvCell(o.delivery_status),
    csvCell(o.delivery_date),
    csvCell(o.promise_date),
    csvCell(o.seller_reviewer)
  ].join(','));

  const today = new Date().toISOString().split('T')[0];
  const csv = [headers.join(','), ...rows].join('\n');
  downloadCSV(csv, `orders_export_${today}.csv`);
  return orders.length;
};

export const exportCarpentersCSV = () => {
  const carpenters = getCarpenters();
  const headers = ['Name', 'Phone', 'Email', 'Rank', 'Pincodes', 'Active Jobs'];

  const rows = carpenters.map(c => [
    csvCell(c.name),
    csvCell(c.phone || c.id),
    csvCell(c.email),
    csvCell(c.rank),
    csvCell((c.pincodes || []).join(';')),
    csvCell(c.activeJobs || 0)
  ].join(','));

  const today = new Date().toISOString().split('T')[0];
  const csv = [headers.join(','), ...rows].join('\n');
  downloadCSV(csv, `technicians_export_${today}.csv`);
  return carpenters.length;
};

// User Role (Admin context)
export const getUserRole = () => {
  return localStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'Super Admin';
};

export const setUserRole = (role) => {
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
  window.dispatchEvent(new Event('fsa_storage_update'));
};

// Active Session User (Auth Context)
export const getActiveUser = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGGED_IN_USER)) || { role: 'Super Admin', email: 'admin@service.com', name: 'Super Admin' };
  } catch (e) {
    return { role: 'Super Admin', email: 'admin@service.com', name: 'Super Admin' };
  }
};

export const setActiveUser = (userObj) => {
  localStorage.setItem(STORAGE_KEYS.LOGGED_IN_USER, JSON.stringify(userObj));
  window.dispatchEvent(new Event('fsa_storage_update'));
};

// Notifications
export const getNotifications = (roleOrEmail) => {
  try {
    const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) || [];
    if (!roleOrEmail) return notifications;
    
    const lowerVal = roleOrEmail.toLowerCase();
    return notifications.filter(n => 
      (n.recipientEmail && n.recipientEmail.toLowerCase() === lowerVal) ||
      (n.recipientRole && n.recipientRole.toLowerCase() === lowerVal) ||
      (!n.recipientEmail && !n.recipientRole) // global notifications
    );
  } catch (e) {
    return [];
  }
};

export const saveNotifications = (notifications) => {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  window.dispatchEvent(new Event('fsa_storage_update'));
};

export const addNotification = (text, recipientEmail = '', recipientRole = '') => {
  const notifications = getNotifications();
  const newNotif = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    text,
    recipientEmail,
    recipientRole,
    timestamp: new Date().toISOString(),
    read: false
  };
  notifications.unshift(newNotif);
  saveNotifications(notifications);
};

export const clearNotifications = () => {
  saveNotifications([]);
};

// Comments
export const addComment = (orderId, commentText, author) => {
  const orders = getOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    if (!order.comments) order.comments = [];
    const timestamp = new Date().toISOString();
    order.comments.push({ timestamp, author, text: commentText });
    
    // Add audit log automatically
    if (!order.auditLogs) order.auditLogs = [];
    order.auditLogs.push({
      timestamp,
      action: 'Comment Added',
      user: author,
      comments: `New comment: "${commentText.substring(0, 30)}${commentText.length > 30 ? '...' : ''}"`
    });

    saveOrders(orders);
    addNotification(`New comment added to order ${orderId} by ${author}.`, 'admin@service.com', 'Admin');
    return order;
  }
  return null;
};

// Audit Logs
export const addAuditLog = (orderId, action, user, comments) => {
  const orders = getOrders();
  const order = orders.find(o => o.orderId === orderId);
  if (order) {
    if (!order.auditLogs) order.auditLogs = [];
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      action,
      user,
      comments
    });
    saveOrders(orders);
    return order;
  }
  return null;
};

// Smart Auto-Allocation Engine
export const autoAllocateOrders = () => {
  const orders = getOrders();
  const carpenters = getCarpenters();
  let allocatedCount = 0;
  const todayStr = new Date().toISOString();

  // Helper to count active jobs for a carpenter
  const getActiveWorkload = (carpenterName) => {
    return orders.filter(o => o.assignedCarpenter === carpenterName && o.jobStatus !== 'Completed').length;
  };

  const updatedOrders = orders.map(order => {
    if (order.jobStatus === 'Unassigned' || !order.assignedCarpenter) {
      const orderPincode = order.pincode || '';
      
      // Filter carpenters serving this pincode
      let matchingCarpenters = carpenters.filter(c => c.pincodes && c.pincodes.includes(orderPincode));
      
      // Fallback if no matching pincode carpenters
      if (matchingCarpenters.length === 0) {
        matchingCarpenters = carpenters;
      }

      // Rank-to-complexity: Expert handles high-payout jobs, Apprentice handles any
      const RANK_SCORE = { 'Expert': 3, 'Intermediate': 2, 'Apprentice': 1 };
      const orderPayout = order.payout || order.assembly_payout || 0;
      // Industry Standard Payout Thresholds: Expert (₹1000+), Intermediate (₹600+), Apprentice (under ₹600)
      const minRankNeeded = orderPayout >= 1000 ? 'Expert' : orderPayout >= 600 ? 'Intermediate' : 'Apprentice';
      const minScore = RANK_SCORE[minRankNeeded] || 1;
      
      // Filter by skill eligibility first
      const eligibleCarpenters = matchingCarpenters.filter(c => (RANK_SCORE[c.rank] || 1) >= minScore);
      const candidatePool = eligibleCarpenters.length > 0 ? eligibleCarpenters : matchingCarpenters;

      // Filter out carpenters who are at or above their capacity limit (custom maxActiveJobs or fallback to MAX_ACTIVE_JOBS)
      const underCapacityCarpenters = candidatePool.filter(c => {
        const limit = Number(c.maxActiveJobs || c.max_active_jobs || MAX_ACTIVE_JOBS);
        return getActiveWorkload(c.name) < limit;
      });

      // Sort by workload (ascending) within the under-capacity pool
      const sortedCarpenters = [...underCapacityCarpenters].sort((a, b) => {
        return getActiveWorkload(a.name) - getActiveWorkload(b.name);
      });

      const bestCarpenter = sortedCarpenters[0];
      if (bestCarpenter) {
        allocatedCount++;
        return {
          ...order,
          assignedCarpenter: bestCarpenter.name,
          jobStatus: 'Assigned',
          assignedDate: todayStr,
          auditLogs: [
            ...(order.auditLogs || []),
            {
              timestamp: todayStr,
              action: 'Carpenter Assigned (Auto)',
              user: 'Auto-Allocation Engine',
              comments: `Automatically assigned to ${bestCarpenter.name} based on skill match (${bestCarpenter.rank} required for ₹${order.payout || 0} job), workload, and pincode match.`
            }
          ]
        };
      }
    }
    return order;
  });

  if (allocatedCount > 0) {
    saveOrders(updatedOrders);
    addNotification(`Auto-Allocation complete. Assigned ${allocatedCount} jobs to carpenters.`, 'admin@service.com', 'Admin');
  }

  return allocatedCount;
};

// Reconcile and export CarpenterPortal compatibility layer
export const stateManager = {
  getJobs() {
    return getOrders();
  },

  getJobById(id) {
    const orders = getOrders();
    return orders.find(o => o.orderId === id) || null;
  },

  updateJob(jobId, updatedFields) {
    return updateOrder(jobId, updatedFields);
  },

  toggleChecklistItem(jobId, itemId) {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.orderId === jobId);
    if (orderIndex !== -1) {
      const order = orders[orderIndex];
      const updatedChecklist = order.checklist.map(item => {
        if (item.id === itemId) {
          return { ...item, checked: !item.checked };
        }
        return item;
      });
      orders[orderIndex] = { ...order, checklist: updatedChecklist };
      saveOrders(orders);
      return normalizeOrder(orders[orderIndex]);
    }
    return null;
  },

  addComment(jobId, text, sender = 'Carpenter') {
    return addComment(jobId, text, sender);
  },

  submitDamageReport(jobId, partName, notes, photoBase64, photoFile) {
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.orderId === jobId);
    if (orderIndex !== -1) {
      const order = orders[orderIndex];
      const damageReport = {
        partName,
        notes,
        photo: photoBase64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23c0392b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">Parts Damage</text></svg>'
      };

      const timestamp = new Date().toISOString();
      const updatedOrderObj = {
        ...order,
        damageReport,
        damageReportFile: photoFile || null,
        jobStatus: 'On Hold - Parts Requested',
        status: 'On Hold - Parts Requested',
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: 'Status Changed to On Hold',
            user: order.assignedCarpenter || 'Carpenter',
            comments: `Replacement parts requested: "${partName}". Notes: ${notes}`
          }
        ]
      };
      
      orders[orderIndex] = updatedOrderObj;
      saveOrders(orders);
      
      // Auto-insert chat comment
      addComment(jobId, `System: Replacement part requested [${partName}]. Status changed to On Hold. Notes: ${notes}`, order.assignedCarpenter || 'Carpenter');
      
      return normalizeOrder(orders[orderIndex]);
    }
    return null;
  },

  getEarningsSummary() {
    const orders = getOrders();
    const completedJobs = orders.filter(job => job.jobStatus === 'Completed');
    
    let totalPaid = 0;
    let totalPending = 0;
    let collectedOnSite = 0;
    
    completedJobs.forEach(job => {
      const amt = job.payout || 0;
      if (job.paymentStatus === 'Paid') {
        totalPaid += amt;
      } else if (job.paymentStatus === 'Collected on-site' || job.paymentStatus === 'Collected') {
        collectedOnSite += amt;
      } else {
        totalPending += amt;
      }
    });

    return {
      completedCount: completedJobs.length,
      totalPaid,
      totalPending,
      collectedOnSite,
      totalEarnings: totalPaid + totalPending + collectedOnSite,
      completedJobs
    };
  },

  resetState() {
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CARPENTERS);
    localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    initializeStorage();
    return getOrders();
  },

  getCarpenters() {
    return getCarpenters();
  },

  getActiveUser() {
    return getActiveUser();
  }
};

// PocketBase Synchronization Helpers

function mapRecordToOrder(r) {
  // Extract the PocketBase relation ID for assigned_carpenter
  // r.assigned_carpenter is the relation ID string (or null)
  // r.expand.assigned_carpenter is the full expanded user record
  const carpenterId = (typeof r.assigned_carpenter === 'string' && r.assigned_carpenter.length > 8)
    ? r.assigned_carpenter
    : '';
  const carpenterName = r.expand?.assigned_carpenter?.name
    || r.expand?.assigned_carpenter?.username
    || r.assigned_carpenter_name
    || '';

  return normalizeOrder({
    orderId: r.order_id,
    platform: r.platform || 'Amazon',
    customerName: r.customer_name || '',
    customerPhone: r.customer_phone || '',
    customerAddress: r.customer_address || '',
    city: r.city || '',
    state: r.state || '',
    pincode: r.pincode || '',
    status: r.status || 'Unassigned',
    paymentStatus: r.payment_status || 'Unpaid',
    paymentType: r.payment_type || 'Company Pay',
    assignedCarpenter: carpenterName,
    assignedCarpenterId: carpenterId,
    assigned_carpenter_name: carpenterName,
    assigned_carpenter_id: carpenterId,
    assembly_payout: Number(r.assembly_payout || 0),
    deliveryStatus: r.delivery_status || 'Pending',
    deliveryDate: r.delivery_date || '',
    promiseDate: r.promise_date || '',
    checklist: r.checklist || [],
    comments: r.comments || [],
    auditLogs: r.audit_logs || [],
    damageReport: r.damage_report || null,
    photos: r.photos || { before: null, after: null },
    signature: r.signature || null,
    archived: r.archived || r.is_archived || false,
    subCarpenterName: r.sub_carpenter_name || '',
    subCarpenterPhone: r.sub_carpenter_phone || '',
    extraCharges: r.extra_charges || []
  });
}

// Converts base64 Data URL to Blob for file upload
export function dataURLtoBlob(dataurl) {
  if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return null;
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error('Failed to parse data URL to blob:', e);
    return null;
  }
}

async function syncOrderToPocketBase(orderId, order) {
  try {
    let record = null;
    try {
      record = await pb.collection('orders').getFirstListItem(`order_id="${orderId}"`, { $autoCancel: false });
    } catch (err) {
      // 404
    }

    const pbFields = {
      order_id: orderId,
      platform: order.platform || 'Amazon',
      customer_name: order.customerName || order.customer_name || 'Unknown Customer',
      customer_phone: order.customerPhone || order.customer_phone || '',
      customer_address: order.customerAddress || order.customer_address || '',
      city: order.city || '',
      state: order.state || '',
      pincode: order.pincode || '',
      status: order.jobStatus || order.status || 'Unassigned',
      payment_status: order.paymentStatus || order.payment_status || 'Unpaid',
      payment_type: order.paymentType || order.payment_type || 'Company Pay',
      assembly_payout: Number(order.payout || order.assembly_payout || 0),
      delivery_status: order.deliveryStatus || order.delivery_status || 'Pending',
      delivery_date: order.deliveryDate || order.delivery_date || '',
      promise_date: order.promiseDate || order.promise_date || '',
      checklist: order.checklist || [],
      comments: order.comments || [],
      audit_logs: order.auditLogs || order.audit_logs || [],
      damage_report: order.damageReport || order.damage_report || null,
      photos: order.photos || { before: null, after: null },
      signature: order.signature || null,
      archived: order.archived || false,
      is_archived: order.archived || false,
      sub_carpenter_name: order.subCarpenterName || '',
      sub_carpenter_phone: order.subCarpenterPhone || '',
      extra_charges: order.extraCharges || [],
      product_sku: order.sku || order.product_sku || '',
      assigned_date: order.assignedDate || order.assigned_date || '',
      
      
      // Screenshot-aligned exact schema keys
      assembly_amount: Number(order.payout || order.assembly_amount || 0),
      customer_number: order.customerPhone || order.customer_number || '',
      payment_source: order.paymentType || order.payment_source || '',
      product_image_url: order.productImage || order.product_image_url || '',
      product_review_link: order.productRefLink || order.product_review_link || '',
      seller_review_link: order.sellerReviewer || order.seller_review_link || '',
      assembly_status: order.jobStatus || order.assembly_status || 'Unassigned'
    };

    if (order.assignedCarpenter) {
      pbFields.assigned_carpenter_name = order.assignedCarpenter;

      // Step 1: Resolve relation ID from local carpenters cache (already has real PB IDs from boot sync).
      // This avoids the permission-blocked API lookup (PocketBase users collection blocks listing).
      const localCarps = getCarpenters();
      const localMatch = localCarps.find(
        c => c.name?.toLowerCase() === order.assignedCarpenter.toLowerCase()
      );
      if (localMatch && localMatch.id && localMatch.id.length > 10 && !localMatch.id.startsWith('c')) {
        pbFields.assigned_carpenter = localMatch.id;
        console.log('[PocketBase] Carpenter relation resolved from local cache:', localMatch.name, '->', localMatch.id);
      } else if (order.assignedCarpenterId && order.assignedCarpenterId.length > 10) {
        // Step 2: Use already-known relation ID if cached on the order itself
        pbFields.assigned_carpenter = order.assignedCarpenterId;
      } else {
        // Step 3: Last resort — try PB API lookup (may fail due to collection API rules)
        try {
          const userRec = await pb.collection('users').getFirstListItem(`name="${order.assignedCarpenter}"`, { $autoCancel: false });
          if (userRec) pbFields.assigned_carpenter = userRec.id;
        } catch (e) {
          // PocketBase collection rules block listing — silent fail, name is still saved in assigned_carpenter_name
        }
      }
    } else {
      pbFields.assigned_carpenter_name = '';
      pbFields.assigned_carpenter = null;
    }


    // Prepare files to upload if any fields contain base64 data URLs
    let hasFiles = false;
    const formData = new FormData();

    // Append regular fields
    Object.keys(pbFields).forEach(key => {
      let val = pbFields[key];
      if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      }
      formData.append(key, val);
    });

    if (order.photos && order.photos.before && order.photos.before.startsWith('data:image/')) {
      const blob = dataURLtoBlob(order.photos.before);
      if (blob) {
        formData.append('photos_before', blob, `before_${orderId}.jpg`);
        hasFiles = true;
      }
    }
    if (order.photos && order.photos.after && order.photos.after.startsWith('data:image/')) {
      const blob = dataURLtoBlob(order.photos.after);
      if (blob) {
        formData.append('photos_after', blob, `after_${orderId}.jpg`);
        hasFiles = true;
      }
    }
    if (order.signature && order.signature.startsWith('data:image/')) {
      const blob = dataURLtoBlob(order.signature);
      if (blob) {
        formData.append('signature_file', blob, `signature_${orderId}.png`);
        hasFiles = true;
      }
    }

    let updatedRecord = null;
    if (hasFiles) {
      try {
        // Attempt upload with files
        if (record) {
          updatedRecord = await pb.collection('orders').update(record.id, formData, { $autoCancel: false });
        } else {
          updatedRecord = await pb.collection('orders').create(formData, { $autoCancel: false });
        }
      } catch (uploadError) {
        console.warn('File upload to PocketBase failed (collection might lack file fields). Falling back to JSON/base64 sync:', uploadError);
        // Fallback to JSON if file upload fails
        if (record) {
          updatedRecord = await pb.collection('orders').update(record.id, pbFields, { $autoCancel: false });
        } else {
          updatedRecord = await pb.collection('orders').create(pbFields, { $autoCancel: false });
        }
      }
    } else {
      // Normal JSON update/create
      if (record) {
        updatedRecord = await pb.collection('orders').update(record.id, pbFields, { $autoCancel: false });
      } else {
        updatedRecord = await pb.collection('orders').create(pbFields, { $autoCancel: false });
      }
    }

    // If upload succeeded and file paths exist, replace local base64 with public URL links
    if (updatedRecord) {
      const updatedPhotos = { ...order.photos };
      let localUpdateNeeded = false;

      if (updatedRecord.photos_before) {
        const fileUrl = `${POCKETBASE_URL}/api/files/orders/${updatedRecord.id}/${updatedRecord.photos_before}`;
        if (order.photos.before !== fileUrl) {
          updatedPhotos.before = fileUrl;
          localUpdateNeeded = true;
        }
      }
      if (updatedRecord.photos_after) {
        const fileUrl = `${POCKETBASE_URL}/api/files/orders/${updatedRecord.id}/${updatedRecord.photos_after}`;
        if (order.photos.after !== fileUrl) {
          updatedPhotos.after = fileUrl;
          localUpdateNeeded = true;
        }
      }
      let updatedSignature = order.signature;
      if (updatedRecord.signature_file) {
        const fileUrl = `${POCKETBASE_URL}/api/files/orders/${updatedRecord.id}/${updatedRecord.signature_file}`;
        if (order.signature !== fileUrl) {
          updatedSignature = fileUrl;
          localUpdateNeeded = true;
        }
      }

      if (localUpdateNeeded) {
        const localOrders = getOrders();
        const idx = localOrders.findIndex(o => o.orderId === orderId);
        if (idx !== -1) {
          localOrders[idx] = {
            ...localOrders[idx],
            photos: updatedPhotos,
            signature: updatedSignature
          };
          saveOrdersLocalOnly(localOrders);
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync order to PocketBase:', err);
    if (err.response) {
      console.error('PocketBase Validation Error Details:', JSON.stringify(err.response, null, 2));
    }
  }
}


async function syncCarpenterPincodesToPocketBase(carpId, pincodes) {
  try {
    // If carpId is a real PocketBase record ID (not a mock local ID like 'c1', 'c2'),
    // try a direct PATCH. This avoids the permission-blocked username/phone filter queries.
    if (carpId && carpId.length > 10 && !carpId.startsWith('c')) {
      try {
        await pb.collection('users').update(carpId, {
          pincodes: pincodes || []
        });
        console.log('[PocketBase] Carpenter pincodes synced directly by ID:', carpId);
        return;
      } catch (e) {
        // 404 = record not in this PB instance, or API rules deny update — skip silently
      }
    }
    // Local-only mock carpenters (c1/c2/c3/c4) are not synced to PocketBase
  } catch (e) {
    // Fail silently in offline mode
  }
}


async function syncCarpentersFromPocketBase() {
  try {
    const records = await pb.collection('users').getFullList({
      filter: 'role="Carpenter"'
    });
    
    const localCarps = getCarpenters();
    const serverEmails = new Set(records.map(r => (r.email || '').toLowerCase()));
    const serverPhones = new Set(records.map(r => (r.phone || r.username || '').replace(/[^0-9]/g, '')));

     // 1. Upload local-only carpenters to PocketBase
    for (const carp of localCarps) {
      // Skip default mock carpenters to allow deletion from server
      if (['c1', 'c2', 'c3', 'c4'].includes(carp.id) || carp.email?.toLowerCase().endsWith('@service.com')) {
        continue;
      }

      const cleanPhone = (carp.phone || '').replace(/[^0-9]/g, '');
      const hasEmail = carp.email && serverEmails.has(carp.email.toLowerCase());
      const hasPhone = cleanPhone && serverPhones.has(cleanPhone);

      if (!hasEmail && !hasPhone) {
        try {
          const tempPass = 'carpenter123'; // Set default password for easy login
          const generatedEmail = carp.email || `${cleanPhone || Date.now()}@timberflow.in`;
          const created = await pb.collection('users').create({
            username: cleanPhone || `carp_${Date.now()}`,
            email: generatedEmail,
            password: tempPass,
            passwordConfirm: tempPass,
            name: carp.name,
            phone: carp.phone || '',
            role: 'Carpenter',
            rank: carp.rank || 'Expert',
            max_active_jobs: Number(carp.maxActiveJobs || 3),
            pincodes: carp.pincodes || []
          });
          console.log("[PocketBase Sync] Auto-uploaded pre-existing local carpenter:", created.name);
          carp.id = created.id;
        } catch (err) {
          console.error("[PocketBase Sync] Failed to auto-upload local carpenter:", carp.name, err);
        }
      }
    }

    // 2. Fetch fresh list from server to merge
    const freshRecords = await pb.collection('users').getFullList({
      filter: 'role="Carpenter"',
      $autoCancel: false
    });

    const merged = freshRecords.map(r => {
      const match = localCarps.find(lc => lc.phone === r.phone || lc.id === r.id || lc.phone === r.username || lc.email === r.email);
      return {
        id: r.id,
        name: r.name || r.username,
        phone: r.phone || r.username || '',
        email: r.email || '',
        rank: r.rank || 'Expert',
        activeJobs: match ? (match.activeJobs || 0) : 0,
        maxActiveJobs: Number(r.max_active_jobs || 3),
        pincodes: (match && match.pincodes !== undefined) ? match.pincodes : (r.pincodes || [])
      };
    });
    saveCarpentersLocalOnly(merged);
  } catch (e) {
    console.error("[PocketBase Sync] Error during carpenters sync:", e);
  }
}

function setupPocketBaseRealtime() {
  try {
    pb.collection('orders').subscribe('*', async (e) => {
      const action = e.action;
      const record = e.record;
      
      const orders = getOrders();
      const orderIndex = orders.findIndex(o => o.orderId === record.order_id);
      
      if (action === 'delete') {
        if (orderIndex !== -1) {
          const filtered = orders.filter(o => o.orderId !== record.order_id);
          saveOrdersLocalOnly(filtered);
        }
      } else {
        let fullRecord = record;
        try {
          fullRecord = await pb.collection('orders').getOne(record.id, { expand: 'assigned_carpenter' });
        } catch (err) {}
        const updatedOrder = mapRecordToOrder(fullRecord);
        
        // If PB record has no carpenter info, preserve local order's carpenter data
        // This handles the case when assigned_carpenter_name field doesn't exist in PB schema
        if (orderIndex !== -1) {
          const existingOrder = orders[orderIndex];
          if (!updatedOrder.assignedCarpenter && existingOrder.assignedCarpenter) {
            updatedOrder.assignedCarpenter = existingOrder.assignedCarpenter;
            updatedOrder.assigned_carpenter_name = existingOrder.assignedCarpenter;
            updatedOrder.assignedCarpenterId = updatedOrder.assignedCarpenterId || existingOrder.assignedCarpenterId;
          }
          orders[orderIndex] = updatedOrder;
        } else {
          orders.unshift(updatedOrder);
        }
        saveOrdersLocalOnly(orders);
      }

    });
    
    pb.collection('users').subscribe('*', async (e) => {
      const record = e.record;
      if (record.role === 'Carpenter') {
        const localCarps = getCarpenters();
        const index = localCarps.findIndex(c => c.email === record.email);
        if (index !== -1) {
          // Preserve local pincodes if they exist since PB updates may fail for guests
          const localPincodes = localCarps[index].pincodes;
          localCarps[index].pincodes = (localPincodes !== undefined) ? localPincodes : (record.pincodes || []);
          localCarps[index].name = record.name || record.username;
          localCarps[index].rank = record.rank || 'Expert';
          saveCarpentersLocalOnly(localCarps);
        }
      }
    });
  } catch (err) {
    // Fail silently in offline mode
  }
}

// ─────────────────────────────────────────────
// n8n INTEGRATION & WEBHOOKS
// ─────────────────────────────────────────────
export function getN8nConfig() {
  try {
    const raw = localStorage.getItem('fsa_n8n_config');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { enabled: false, webhookUrl: '' };
}

export function saveN8nConfig(config) {
  try {
    localStorage.setItem('fsa_n8n_config', JSON.stringify(config));
    window.dispatchEvent(new Event('fsa_storage_update'));
    return true;
  } catch (e) {
    return false;
  }
}

export async function triggerN8nWebhook(event, data) {
  const config = getN8nConfig();
  if (!config.enabled || !config.webhookUrl) return;

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Server status ${response.status}`);
    }
    
    // Log success in dashboard notifications
    addNotification(`n8n Webhook: Fired '${event}' successfully.`, '', 'System');
  } catch (err) {
    console.error(`n8n Webhook error for event '${event}':`, err);
    addNotification(`n8n Webhook failed for event '${event}'.`, '', 'System');
    queueSyncOperation('n8n_webhook', { event, data });
  }
}

// ─────────────────────────────────────────────
// OFFLINE SYNC QUEUE
// ─────────────────────────────────────────────
export function queueSyncOperation(type, data) {
  try {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
    queue.push({ type, data, timestamp: new Date().toISOString(), retries: 0 });
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
  } catch (e) {}
}

async function processSyncQueue() {
  if (!navigator.onLine) return;
  try {
    const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
    if (queue.length === 0) return;
    const remaining = [];
    for (const op of queue) {
      try {
        if (op.type === 'upsert_order') {
          await syncOrderToPocketBase(op.data.orderId, op.data);
        } else if (op.type === 'delete_order') {
          const rec = await pb.collection('orders').getFirstListItem(`order_id="${op.data.orderId}"`);
          if (rec) await pb.collection('orders').delete(rec.id);
        } else if (op.type === 'upsert_carpenter') {
          await syncCarpenterPincodesToPocketBase(op.data.id, op.data.pincodes);
        } else if (op.type === 'n8n_webhook') {
          const config = getN8nConfig();
          if (config.enabled && config.webhookUrl) {
            await fetch(config.webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: op.data.event, timestamp: op.timestamp, data: op.data.data })
            });
          }
        }
        // success — don't re-queue
      } catch (e) {
        if (op.retries < 5) {
          remaining.push({ ...op, retries: op.retries + 1 });
        }
      }
    }
    localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining));
    if (remaining.length < queue.length) {
      window.dispatchEvent(new Event('fsa_storage_update'));
    }
  } catch (e) {}
}

// Retry queue when coming back online
window.addEventListener('online', () => {
  processSyncQueue();
  addNotification('Connection restored. Syncing pending operations to server...', '', 'Admin');
});

window.addEventListener('offline', () => {
  addNotification('You are offline. Changes will be saved locally and synced when reconnected.', '', 'Admin');
});

// ─────────────────────────────────────────────
// SLA AUTO-ESCALATION MONITOR
// ─────────────────────────────────────────────
export function checkSlaBreaches() {
  const orders = getOrders();
  const now = new Date();
  let breachCount = 0;

  orders.forEach(order => {
    if (order.jobStatus === 'Completed') return;
    if (!order.promiseDate && !order.promise_date) return;

    const promiseDate = new Date(order.promiseDate || order.promise_date);
    if (isNaN(promiseDate.getTime())) return;

    const hoursUntilBreach = (promiseDate - now) / (1000 * 60 * 60);
    const alreadyEscalated = order.auditLogs?.some(l => l.action === 'SLA BREACH — Auto-Escalated');

    if (hoursUntilBreach < 0 && !alreadyEscalated) {
      // SLA breached — auto-escalate
      const updatedOrder = {
        ...order,
        slaBreached: true,
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp: new Date().toISOString(),
            action: 'SLA BREACH — Auto-Escalated',
            user: 'SLA Monitor',
            comments: `Promise date ${promiseDate.toLocaleDateString()} has passed. Order automatically flagged for dispatcher review.`
          }
        ]
      };
      const allOrders = getOrders();
      const idx = allOrders.findIndex(o => o.orderId === order.orderId);
      if (idx !== -1) {
        allOrders[idx] = updatedOrder;
        saveOrders(allOrders);
      }
      addNotification(
        `🚨 SLA BREACH: Order ${order.orderId} (${order.customerName}) missed its promise date. Escalated to Dispatcher.`,
        '',
        'Dispatcher'
      );
      // Trigger webhook alert
      triggerN8nWebhook('sla_breach_detected', {
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone || order.customer_number || '',
        promiseDate: promiseDate.toISOString(),
        hoursOverdue: Math.abs(Math.round(hoursUntilBreach))
      });
      // Fire browser notification if permission granted
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('⚠️ SLA Breach Detected', {
          body: `Order ${order.orderId} missed its deadline. Immediate action required.`,
          icon: '/favicon.ico'
        });
      }
      breachCount++;
    } else if (hoursUntilBreach >= 0 && hoursUntilBreach <= 4) {
      // At-risk — warn if not already warned
      const alreadyWarned = order.auditLogs?.some(l => l.action === 'SLA At-Risk Warning');
      if (!alreadyWarned) {
        const allOrders = getOrders();
        const idx = allOrders.findIndex(o => o.orderId === order.orderId);
        if (idx !== -1) {
          allOrders[idx] = {
            ...allOrders[idx],
            slaAtRisk: true,
            auditLogs: [
              ...(allOrders[idx].auditLogs || []),
              {
                timestamp: new Date().toISOString(),
                action: 'SLA At-Risk Warning',
                user: 'SLA Monitor',
                comments: `Order promise date in ${Math.round(hoursUntilBreach)} hours. Flagged as at-risk.`
              }
            ]
          };
          saveOrders(allOrders);
        }
        addNotification(
          `⚠️ SLA At-Risk: Order ${order.orderId} deadline in ${Math.round(hoursUntilBreach)}h. Assign carpenter immediately.`,
          '',
          'Dispatcher'
        );
        // Trigger webhook alert
        triggerN8nWebhook('sla_warning_at_risk', {
          orderId: order.orderId,
          customerName: order.customerName,
          customerPhone: order.customerPhone || order.customer_number || '',
          promiseDate: promiseDate.toISOString(),
          hoursRemaining: Math.round(hoursUntilBreach)
        });
      }
    }
  });

  if (breachCount > 0) {
    window.dispatchEvent(new Event('fsa_storage_update'));
  }
  return breachCount;
}

function setupSlaMonitor() {
  // Run immediately on boot
  setTimeout(() => checkSlaBreaches(), 2000);
  // Then check every 60 seconds
  setInterval(() => checkSlaBreaches(), 60 * 1000);
}

// ─────────────────────────────────────────────
// Normalise phone number to last 10 digits for resilient matching (ignoring country codes, dashes, spaces)
export function normalizePhoneForComparison(p) {
  if (!p) return '';
  const clean = p.replace(/[^0-9]/g, '');
  return clean.slice(-10);
}

// AUTHENTICATION
// ─────────────────────────────────────────────
export async function authenticateUser(phone, password) {
  const cleanInputPhone = normalizePhoneForComparison(phone);
  const cleanPhoneDigits = phone.replace(/[^0-9]/g, '');

  // Try PocketBase first
  try {
    let authData = null;
    
    // Build possible login identity candidates (usernames or emails)
    // Build possible login identity candidates (usernames, emails, or phone variations)
    const candidates = [];
    
    if (phone.includes('@')) {
      // If the user typed a direct email, prioritize it
      candidates.push(phone.trim().toLowerCase());
    } else {
      // If it contains letters (like a username 'superadmin'), add it directly
      if (/[a-zA-Z]/.test(phone)) {
        candidates.push(phone.trim());
      }
      
      // Build phone-based candidates if there are digits
      if (cleanPhoneDigits.length > 0) {
        candidates.push(cleanPhoneDigits);
        candidates.push(`${cleanPhoneDigits}@timberflow.in`);
        
        if (cleanPhoneDigits.length === 10) {
          candidates.push('91' + cleanPhoneDigits);
          candidates.push(`91${cleanPhoneDigits}@timberflow.in`);
        } else if (cleanPhoneDigits.length > 10) {
          const last10 = cleanPhoneDigits.slice(-10);
          candidates.push(last10);
          candidates.push(`${last10}@timberflow.in`);
        }
      }
    }

    console.log('[Auth] Trying PocketBase candidates:', candidates);

    // Try each login identity candidate until one succeeds
    for (const identity of candidates) {
      try {
        authData = await pb.collection('users').authWithPassword(identity, password);
        if (authData?.record) {
          console.log('[Auth] PocketBase login succeeded with identity:', identity);
          break;
        }
      } catch (err) {
        console.warn('[Auth] Candidate failed:', identity, err?.message || err);
        // try next candidate
      }
    }

    if (authData?.record) {
      const record = authData.record;
      const role = record.role || 'Carpenter';
      return {
        success: true,
        user: {
          role,
          name: record.name || record.username,
          username: record.username,
          phone: record.phone || phone,
          email: record.email,
          id: record.id
        },
        source: 'pocketbase'
      };
    }
  } catch (pbErr) {
    // PocketBase auth error or connection failure — fall through to local demo fallback
  }

  // Demo / offline fallback — match against phone numbers or emails
  const DEMO_ACCOUNTS = [
    { phone: '+91-80000-00001', email: 'superadmin@service.com', password: 'admin123', role: 'Super Admin',       name: 'Super Admin' },
    { phone: '+91-80000-00002', email: 'dispatcher@service.com', password: 'admin123', role: 'Dispatcher',         name: 'Dispatcher Manager' },
    { phone: '+91-80000-00003', email: 'inventory@service.com', password: 'admin123', role: 'Inventory Manager',  name: 'Logistics Supervisor' },
    { phone: '+91-80000-00004', email: 'support@service.com', password: 'admin123', role: 'Customer Support',   name: 'Support Executive' },
  ];

  const demoMatch = DEMO_ACCOUNTS.find(a => {
    if (phone.includes('@')) {
      return a.email && a.email.toLowerCase() === phone.trim().toLowerCase() && a.password === password;
    }
    return normalizePhoneForComparison(a.phone) === cleanInputPhone && a.password === password;
  });
  if (demoMatch) {
    return {
      success: true,
      user: { role: demoMatch.role, name: demoMatch.name, phone: demoMatch.phone, email: demoMatch.email },
      source: 'demo'
    };
  }

  // Check carpenter list by phone number
  const carpenters = getCarpenters();
  const matchedCarpenter = carpenters.find(
    c => normalizePhoneForComparison(c.phone) === cleanInputPhone
  );
  if (matchedCarpenter && password === 'carpenter123') {
    return {
      success: true,
      user: { role: 'Carpenter', name: matchedCarpenter.name, username: matchedCarpenter.name, phone: matchedCarpenter.phone, email: matchedCarpenter.email, id: matchedCarpenter.id },
      source: 'demo'
    };
  }

  return { success: false, error: 'Invalid phone number or password.' };
}


// ─────────────────────────────────────────────
// Initial Sync trigger on boot
// ─────────────────────────────────────────────
async function selfHealMissingRelations(records) {
  try {
    const localCarps = getCarpenters();
    const localOrders = getOrders();
    for (const r of records) {
      if (!r.assigned_carpenter) {
        // Get carpenter name: from PB field or fallback to local data
        const carpName = r.assigned_carpenter_name
          || localOrders.find(o => o.orderId === r.order_id)?.assignedCarpenter
          || '';
        if (!carpName) continue;
        
        const match = localCarps.find(c => c.name?.toLowerCase() === carpName.toLowerCase());
        if (match && match.id && !match.id.startsWith('c')) {
          await pb.collection('orders').update(r.id, {
            assigned_carpenter: match.id,
            assigned_carpenter_name: match.name  // write back name too in case field exists
          });
          console.log(`[Self-Heal] Resolved relation ID for order ${r.order_id} -> carpenter ${match.name}`);
        }
      }
    }
  } catch (err) {
    console.warn('[Self-Heal] Failed to heal order relations:', err);
  }
}


setTimeout(() => {
  syncCarpentersFromPocketBase();
  (async () => {
    try {
      const records = await pb.collection('orders').getFullList({ sort: '-created', expand: 'assigned_carpenter', $autoCancel: false });
      window.fsa_db_sync_error = null;
      window.dispatchEvent(new Event('fsa_storage_update'));
      if (records.length > 0) {
        const localOrders = getOrders(); // existing local orders before overwrite
        const mapped = records.map(r => {
          const order = mapRecordToOrder(r);
          // Preserve local carpenter assignment if PB expand/name field is empty
          if (!order.assignedCarpenter) {
            const existingLocal = localOrders.find(o => o.orderId === order.orderId);
            if (existingLocal && existingLocal.assignedCarpenter) {
              order.assignedCarpenter = existingLocal.assignedCarpenter;
              order.assigned_carpenter_name = existingLocal.assignedCarpenter;
              order.assignedCarpenterId = order.assignedCarpenterId || existingLocal.assignedCarpenterId;
            }
          }
          return order;
        });
        saveOrdersLocalOnly(mapped);
        
        // Heal relations for orders assigned before current ID sync was deployed
        selfHealMissingRelations(records);
      }

    } catch (e) {
      window.fsa_db_sync_error = e.message || String(e);
      window.dispatchEvent(new Event('fsa_storage_update'));
    }
  })();
  setupPocketBaseRealtime();
  setupSlaMonitor();
  processSyncQueue();
}, 1000);

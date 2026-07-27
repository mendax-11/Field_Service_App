import PocketBase from 'pocketbase';

// Connect to local or remote PocketBase instance.
let POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'https://assembly.vikifurniture.com:8090';

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

export const lastLocalUpdate = new Map();

/* eslint-disable no-unused-vars */
const DEFAULT_ORDERS = [];
const OLD_UNUSED_ORDERS = [];

const DEFAULT_NOTIFICATIONS = [];

const getDefaultTechAccessPin = (orderId) => {
  const source = String(orderId || '0000');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) % 9000;
  }
  return String(1000 + hash).slice(-4);
};

const getDefaultAssemblyChecklist = () => [
  { id: 1, label: 'Unbox components & verify hardware inventory', checked: false },
  { id: 2, label: 'Assemble main frame structure', checked: false },
  { id: 3, label: 'Install internal shelves/drawers', checked: false },
  { id: 4, label: 'Inspect leg alignment and secure joints', checked: false },
  { id: 5, label: 'Clean surfaces and request client sign-off', checked: false }
];

// Normalize an order object to present both snake_case and camelCase aliases 
// to prevent breaking any component layouts that depend on either format.
export function normalizeOrder(o) {
  if (!o) return null;

  const orderId = String(o.orderId || o.order_id || o.id || '');
  const sku = String(o.sku || o.product_sku || '');
  const productName = String(o.productName || o.product_name || o.product_sku || '');
  const payout = Number(o.payout || o.assembly_payout || o.payoutAmount || o.assembly_amount || 0);
  const customerName = String(o.customerName || o.customer_name || '');
  const customerPhone = String(o.customerPhone || o.customer_phone || o.customer_number || o.customer_phone_number || '');
  const customerAddress = String(o.customerAddress || o.customer_address || o.address || '');
  const jobStatus = String(o.jobStatus || o.status || o.assembly_status || o.assemblyStatus || 'Unassigned');
  const paymentStatus = String(o.paymentStatus || o.payment_status || 'Unpaid');
  
  let platform = String(o.platform || '');
  if (!platform) {
    if (orderId.startsWith('AMZ')) platform = 'Amazon';
    else if (orderId.startsWith('FLP')) platform = 'Flipkart';
    else if (orderId.startsWith('WEB') || orderId.startsWith('WOO')) platform = 'WooCommerce';
    else platform = 'Amazon';
  }
  
  let paymentType = o.paymentType || o.payment_type || o.payment_source || 'Company Pay';
  if (paymentType === 'Company') paymentType = 'Company Pay';
  if (paymentType === 'Customer') paymentType = 'Customer Pay';

  let assignedCarpenter = o.assignedCarpenter || o.assignedCarpenterName || o.assigned_carpenter_name || (o.expand?.assigned_carpenter?.name) || '';
  let assignedCarpenterId = o.assignedCarpenterId || o.assigned_carpenter_id || (o.expand?.assigned_carpenter?.id) || '';

  // If assigned_carpenter contains the ID
  if (o.assigned_carpenter && o.assigned_carpenter.length > 10) {
    assignedCarpenterId = o.assigned_carpenter;
  } else if (o.assigned_carpenter) {
    assignedCarpenter = o.assigned_carpenter;
  }

  if (jobStatus === 'Unassigned') {
    assignedCarpenter = '';
    assignedCarpenterId = '';
  }
  const assignedDate = o.assignedDate || o.assigned_date || '';
  const productImage = o.productImage || o.product_image || o.product_image_url || 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=600&q=80';
  const productRefLink = o.productRefLink || o.product_ref_link || o.product_review_link || 'https://manuals.service.com/assembly-guide.pdf';
  const sellerReviewer = o.sellerReviewer || o.seller_reviewer || o.seller_review_link || 'System';
  let deliveryStatus = o.deliveryStatus || o.delivery_status || 'Pending';
  if (jobStatus === 'Completed' && deliveryStatus !== 'Delivered') {
    deliveryStatus = 'Delivered';
  }
  const deliveryDate = o.deliveryDate || o.delivery_date || '';
  const promiseDate = o.promiseDate || o.promise_date || o['promise date'] || '';
  
  let checklist = o.checklist;
  if (typeof checklist === 'string') {
    try { checklist = JSON.parse(checklist); } catch (e) { checklist = null; }
  }
  if (!Array.isArray(checklist) || checklist.length === 0) {
    checklist = getDefaultAssemblyChecklist();
  } else {
    checklist = checklist.map((item, index) => ({
      id: item.id ?? index + 1,
      label: item.label || item.title || item.name || `Checklist item ${index + 1}`,
      checked: Boolean(item.checked)
    }));
  }

  let damageReport = o.damageReport || o.damage_report || o.replacement_request || null;
  if (damageReport && typeof damageReport === 'string') {
    try {
      damageReport = JSON.parse(damageReport);
    } catch (e) {
      // Ignored
    }
  }

  let damagePhoto = o.damagePhoto || '';
  let partsList = o.partsList || '';
  let carpenterComments = o.carpenterComments || '';

  // If nested damageReport is present, extract flat values
  if (damageReport && typeof damageReport === 'object') {
    if (!damagePhoto) damagePhoto = damageReport.photo || damageReport.damagePhoto || '';
    if (!partsList) partsList = damageReport.partName || damageReport.partsList || '';
    if (!carpenterComments) carpenterComments = damageReport.notes || damageReport.carpenterComments || '';
  }

  let damagePhotos = o.damagePhotos || o.damage_photos || [];
  if (damageReport && typeof damageReport === 'object' && damageReport.damagePhotos) {
    damagePhotos = damageReport.damagePhotos;
  }
  if (typeof damagePhotos === 'string') {
    try { damagePhotos = JSON.parse(damagePhotos); } catch (e) { damagePhotos = []; }
  }
  if (!Array.isArray(damagePhotos)) {
    damagePhotos = [];
  }
  if (damagePhotos.length === 0 && damagePhoto) {
    if (typeof damagePhoto === 'string' && damagePhoto.startsWith('[')) {
      try {
        damagePhotos = JSON.parse(damagePhoto);
      } catch (e) {
        damagePhotos = [damagePhoto];
      }
    } else {
      damagePhotos = [damagePhoto];
    }
  }

  // If flat values are present, build/update nested damageReport
  if ((damagePhoto || partsList || carpenterComments) && !damageReport) {
    damageReport = {
      partName: partsList,
      notes: carpenterComments,
      photo: damagePhoto,
      damagePhotos: damagePhotos,
      status: o.partRequestStatus || o.part_request_status || 'Pending',
      previousStatus: o.partHoldPreviousStatus || o.part_hold_previous_status || o.holdResumeStatus || o.hold_resume_status || ''
    };
  } else if (damageReport && typeof damageReport === 'object') {
    damageReport.photo = damagePhoto || damageReport.photo || '';
    damageReport.partName = partsList || damageReport.partName || '';
    damageReport.notes = carpenterComments || damageReport.notes || '';
    damageReport.status = damageReport.status || o.partRequestStatus || o.part_request_status || 'Pending';
    damageReport.previousStatus = damageReport.previousStatus || o.partHoldPreviousStatus || o.part_hold_previous_status || o.holdResumeStatus || o.hold_resume_status || '';
  }

  const photos = o.photos || { before: null, after: null };
  let otp = o.otp || o.otp_code;
  if (!otp || otp === '1234') {
    otp = String(Math.floor(1000 + Math.random() * 9000));
  }
  const otpSent = o.otpSent !== undefined ? o.otpSent : (o.otp_sent !== undefined ? o.otp_sent : false);
  const otpVerified = o.otpVerified !== undefined ? o.otpVerified : (o.otp_verified !== undefined ? o.otp_verified : false);
  const techAccessPin = String(o.techAccessPin || o.tech_access_pin || o.jobAccessPin || o.job_access_pin || getDefaultTechAccessPin(orderId));
  const signature = o.signature || o.customer_signature || null;
  const comments = Array.isArray(o.comments) ? o.comments : (o.comments ? [o.comments] : []);
  const auditLogs = Array.isArray(o.auditLogs) ? o.auditLogs : (Array.isArray(o.audit_logs) ? o.audit_logs : []);
  const rawArchived = o.archived !== undefined ? o.archived : (o.is_archived !== undefined ? o.is_archived : false);
  const archived = typeof rawArchived === 'string' ? rawArchived.toLowerCase() === 'true' : !!rawArchived;
  const extraCharges = Array.isArray(o.extraCharges) ? o.extraCharges : (Array.isArray(o.extra_charges) ? o.extra_charges : []);

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
    orderDate: o.orderDate || o.created || o.order_date || '',
    created: o.orderDate || o.created || o.order_date || '',
    
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
    techAccessPin,
    tech_access_pin: techAccessPin,
    signature,
    customer_signature: signature,
    comments,
    auditLogs,
    audit_logs: auditLogs,
    archived,
    is_archived: archived,
    extraCharges,
    extra_charges: extraCharges,
    feedbackRequested: o.feedbackRequested || o.feedback_requested || false,
    feedback_requested: o.feedbackRequested || o.feedback_requested || false,
    gpsCoords: o.gpsCoords || o.gps_coords || null,
    damagePhoto,
    partsList,
    carpenterComments,
    damagePhotos,
    damage_photos: damagePhotos,
    partHoldPreviousStatus: damageReport?.previousStatus || o.partHoldPreviousStatus || o.part_hold_previous_status || '',
    part_hold_previous_status: damageReport?.previousStatus || o.partHoldPreviousStatus || o.part_hold_previous_status || '',
    secureSignatureUrl: o.secureSignatureUrl || o.secure_signature_url || '',
    securePhotoUrl: o.securePhotoUrl || o.secure_photo_url || ''
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
  if (!localStorage.getItem(STORAGE_KEYS.USER_ROLE)) {
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, 'Super Admin'); // Default role
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
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
    memoryOrders = raw.map(normalizeOrder).filter(Boolean);
    return memoryOrders;
  } catch (e) {
    memoryOrders = [];
    return memoryOrders;
  }
};

export const hydrateOrders = (serverOrders) => {
  const normalized = serverOrders.map(normalizeOrder).filter(Boolean);
  // Only update if memoryOrders is empty or missing items, to prevent overwriting recent optimistic updates
  if (!memoryOrders || memoryOrders.length === 0) {
    memoryOrders = normalized;
  } else {
    // Merge new server items that don't exist in memory
    const existingIds = new Set(memoryOrders.map(o => o.id));
    const newItems = normalized.filter(o => !existingIds.has(o.id));
    if (newItems.length > 0) {
      memoryOrders = [...memoryOrders, ...newItems];
    }
  }
};

export const saveOrders = (orders, changedOrders = []) => {
  const normalized = orders.map(normalizeOrder).filter(Boolean);
  memoryOrders = normalized;

  // Always persist to localStorage so changes survive PB refetches and page reloads
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(normalized));
  } catch (e) {
    // localStorage full — continue anyway, memory cache is still updated
  }

  window.dispatchEvent(new Event('fsa_storage_update'));
  
  // Background sync ONLY changed orders to PocketBase
  let toSync = changedOrders;
  if (toSync && !Array.isArray(toSync)) {
    toSync = [toSync];
  }
  if (toSync && toSync.length > 0) {
    toSync.forEach(o => {
      syncOrderToPocketBase(o.orderId, o);
    });
  }

  // Prune stale/heavy data from localStorage (runs async, non-blocking)
  setTimeout(pruneLocalStorage, 0);
};

export const rejectJob = (orderId, carpenterName, reason, fallbackJob = null) => {
  const orders = getOrders();
  let index = orders.findIndex(o => o.id === orderId || o.orderId === orderId || o.order_id === orderId);
  
  if (index === -1 && fallbackJob) {
    orders.push(fallbackJob);
    index = orders.length - 1;
  }

  if (index !== -1) {
    const order = orders[index];
    const newStatus = 'Unassigned';
    
    // Update order
    orders[index] = { 
      ...order, 
      assignedCarpenter: '', 
      assignedCarpenterId: '',
      assigned_carpenter_name: '',
      assigned_carpenter_id: '',
      assigned_carpenter: null,
      expand: order.expand ? { ...order.expand, assigned_carpenter: null } : undefined,
      jobStatus: newStatus,
      status: newStatus
    };
    
    saveOrders(orders, orders[index]);
    
    // Add comment
    addComment(
      orderId,
      `Carpenter ${carpenterName} rejected/skipped the order. Reason: ${reason}`,
      'System'
    );
    
    // Add audit log manually since we updated the order already
    const updatedOrders = getOrders();
    const updatedIndex = updatedOrders.findIndex(o => o.id === orderId || o.orderId === orderId || o.order_id === orderId);
    if (updatedIndex !== -1) {
      if (!Array.isArray(updatedOrders[updatedIndex].auditLogs)) {
        updatedOrders[updatedIndex].auditLogs = [];
      }
      updatedOrders[updatedIndex].auditLogs.push({
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Job Rejected',
        comments: `Carpenter ${carpenterName} skipped order: ${reason}`
      });
      saveOrders(updatedOrders, updatedOrders[updatedIndex]);
    }
  }
};

export const updateOrder = (orderId, updatedFields) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId || o.orderId === orderId || o.order_id === orderId);
  if (index !== -1) {
    const o = orders[index];
    lastLocalUpdate.set(orderId, Date.now());
    if (o.orderId) lastLocalUpdate.set(o.orderId, Date.now());
    if (o.id) lastLocalUpdate.set(o.id, Date.now());
    if (o.order_id) lastLocalUpdate.set(o.order_id, Date.now());
    const oldStatus = orders[index].jobStatus || orders[index].status || 'Unassigned';
    const newStatus = updatedFields.jobStatus || updatedFields.status;
    
    if (newStatus) {
      updatedFields.jobStatus = newStatus;
      updatedFields.status = newStatus;
      if (newStatus === 'Completed' && !updatedFields.deliveryStatus) {
        updatedFields.deliveryStatus = 'Delivered';
      }
    }

    orders[index] = { ...orders[index], ...updatedFields };
    saveOrders(orders, orders[index]);
    const updated = normalizeOrder(orders[index]);

    // Check status transition
    if (newStatus && newStatus !== oldStatus && !updatedFields.skipWebhook) {
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
  saveOrders(orders, newOrder);
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
    qualityScore: Number(carpObj.qualityScore || carpObj.quality_score || 100),
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
        quality_score: Number(carpObj.qualityScore || carpObj.quality_score || 100),
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
  try {
    localStorage.setItem(STORAGE_KEYS.CARPENTERS, JSON.stringify(carpenters));
  } catch (e) {
    console.warn('[FSA] Failed to persist carpenters locally:', e);
  }

  window.dispatchEvent(new Event('fsa_storage_update'));
  
  // Background sync carpenters served pincodes to PocketBase
  carpenters.forEach(c => {
    syncCarpenterPincodesToPocketBase(c.id, c.pincodes);
  });
};
function saveOrdersLocalOnly(orders) {
  const normalized = orders.map(normalizeOrder);
  memoryOrders = normalized;
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(normalized));
  } catch (e) {
    // ignore storage quota errors
  }
  window.dispatchEvent(new Event('fsa_storage_update'));
}

/**
 * pruneLocalStorage — keeps localStorage lean by:
 * 1. Stripping base64 photo/signature blobs from any order that already has a real
 *    PocketBase record ID (meaning the data is confirmed on the server).
 * 2. Evicting Completed or Archived orders whose last audit-log is older than 7 days.
 * Called automatically after every saveOrders() write.
 */
function pruneLocalStorage() {
  try {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const orders = memoryOrders || [];

    const pruned = orders
      .filter(order => {
        // ── Evict old completed / archived orders ──────────────────────────
        const isDone = order.jobStatus === 'Completed' || order.status === 'Completed'
          || order.archived === true || order.is_archived === true;
        if (!isDone) return true; // keep active orders always

        // Find the most-recent audit-log timestamp
        const logs = Array.isArray(order.auditLogs) ? order.auditLogs : [];
        const lastLogTs = logs.length > 0
          ? Math.max(...logs.map(l => new Date(l.timestamp || 0).getTime()))
          : 0;
        const refTs = lastLogTs || new Date(order.updated || order.created || 0).getTime();
        return (now - refTs) < SEVEN_DAYS_MS; // keep if still within 7-day window
      })
      .map(order => {
        // ── Strip heavy base64 blobs only from server-confirmed orders ────
        // A real PocketBase record ID is 15 chars; local mock IDs start with
        // letters like 'c1', 'ORD-', etc.
        const hasPbId = order.id && order.id.length === 15;
        if (!hasPbId) return order; // local-only record — keep everything

        const stripped = { ...order };

        // Clear heavy before/after photos from completed orders (server has these in photos JSON field)
        if (stripped.photos) {
          const hasBase64Before = typeof stripped.photos.before === 'string' && stripped.photos.before.startsWith('data:');
          const hasBase64After  = typeof stripped.photos.after  === 'string' && stripped.photos.after.startsWith('data:');
          if (hasBase64Before || hasBase64After) {
            stripped.photos = {
              before: hasBase64Before ? null : stripped.photos.before,
              after:  hasBase64After  ? null : stripped.photos.after
            };
          }
        }

        // Clear base64 signature blob
        if (typeof stripped.signature === 'string' && stripped.signature.startsWith('data:')) {
          stripped.signature = null;
        }

        return stripped;
      });

    memoryOrders = pruned;
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(pruned));
    } catch (e) {
      // Still full — nothing more we can do here
    }
  } catch (e) {
    // Pruning is best-effort; never crash the app
    console.warn('[FSA] pruneLocalStorage error:', e);
  }
}

function saveCarpentersLocalOnly(carpenters) {
  memoryCarpenters = carpenters;
  try {
    localStorage.setItem(STORAGE_KEYS.CARPENTERS, JSON.stringify(carpenters));
  } catch (e) {
    console.warn('[FSA] Failed to persist carpenters locally:', e);
  }
  window.dispatchEvent(new Event('fsa_storage_update'));
}

const normalizePincodeValue = (pincode) => String(pincode || '').trim();

const upsertCarpenterFromSnapshot = (carpenters, carpenterId, snapshot = {}) => {
  const index = carpenters.findIndex(c =>
    c.id === carpenterId
    || (snapshot.email && c.email === snapshot.email)
    || (snapshot.phone && c.phone === snapshot.phone)
    || (snapshot.username && c.phone === snapshot.username)
    || (snapshot.name && c.name === snapshot.name)
  );

  if (index !== -1) return index;
  if (!carpenterId && !snapshot.id) return -1;

  carpenters.push({
    id: carpenterId || snapshot.id,
    name: snapshot.name || snapshot.username || '',
    phone: snapshot.phone || snapshot.username || '',
    email: snapshot.email || '',
    rank: snapshot.rank || 'Expert',
    qualityScore: Number(snapshot.qualityScore || snapshot.quality_score || 100),
    activeJobs: Number(snapshot.activeJobs || 0),
    maxActiveJobs: Number(snapshot.maxActiveJobs || snapshot.max_active_jobs || 3),
    pincodes: Array.isArray(snapshot.pincodes) ? snapshot.pincodes : []
  });

  return carpenters.length - 1;
};

export const addCarpenterPincode = (carpenterId, pincode, carpenterSnapshot = {}) => {
  const cleanPincode = normalizePincodeValue(pincode);
  if (!cleanPincode) return false;

  const carpenters = getCarpenters();
  const index = upsertCarpenterFromSnapshot(carpenters, carpenterId, carpenterSnapshot);
  if (index !== -1) {
    const carp = carpenters[index];
    if (!carp.pincodes) carp.pincodes = [];
    if (!carp.pincodes.includes(cleanPincode)) {
      carp.pincodes.push(cleanPincode);
    }
    saveCarpenters(carpenters);
    return true;
  }
  return false;
};

export const removeCarpenterPincode = (carpenterId, pincode, carpenterSnapshot = {}) => {
  const cleanPincode = normalizePincodeValue(pincode);
  if (!cleanPincode) return false;

  const carpenters = getCarpenters();
  const index = upsertCarpenterFromSnapshot(carpenters, carpenterId, carpenterSnapshot);
  if (index !== -1) {
    const carp = carpenters[index];
    if (carp.pincodes) {
      carp.pincodes = carp.pincodes.filter(p => p !== cleanPincode);
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
  const orders = getOrders().filter(o => !o.archived);
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

export const hasRole = (userRole, targetRole) => {
  if (!userRole) return false;
  const roles = userRole.split(',').map(r => r.trim());
  return roles.includes('Super Admin') || roles.includes(targetRole);
};

export const hasPermission = (userRole, allowedRoles = []) => {
  if (!userRole) return false;
  const roles = userRole.split(',').map(r => r.trim());
  if (roles.includes('Super Admin')) return true;
  return allowedRoles.some(r => roles.includes(r));
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
  const order = orders.find(o => o.id === orderId || o.orderId === orderId || o.order_id === orderId);
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

    saveOrders(orders, order);
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
    if (!Array.isArray(order.auditLogs)) {
      order.auditLogs = [];
    }
    order.auditLogs.push({
      timestamp: new Date().toISOString(),
      action,
      user,
      comments
    });
    saveOrders(orders, order);
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

      // Map to weighted score
      const scoredCarpenters = underCapacityCarpenters.map(c => {
        const qs = Number(c.qualityScore || 100);
        const limit = Number(c.maxActiveJobs || c.max_active_jobs || MAX_ACTIVE_JOBS);
        const active = getActiveWorkload(c.name);
        
        const qualityPoints = qs / 2; // e.g. 100 score = 50 pts
        const capacityPoints = (limit - active) * 10; // e.g. 5 spare slots = 50 pts
        
        let rankPoints = 0;
        if (c.rank === 'Expert') rankPoints = 15;
        if (c.rank === 'Intermediate') rankPoints = 10;
        if (c.rank === 'Apprentice') rankPoints = 5;

        const totalScore = qualityPoints + capacityPoints + rankPoints;

        return {
          carpenter: c,
          totalScore,
          breakdown: `Quality: ${qs} (+${qualityPoints}pts) | Capacity: ${limit - active} spare (+${capacityPoints}pts) | Rank: ${c.rank} (+${rankPoints}pts) | Total = ${totalScore}`
        };
      });

      // Sort by total score (descending)
      scoredCarpenters.sort((a, b) => b.totalScore - a.totalScore);

      const winner = scoredCarpenters[0];
      if (winner) {
        const bestCarpenter = winner.carpenter;
        allocatedCount++;
        return {
          ...order,
          assignedCarpenter: bestCarpenter.name,
          assignedCarpenterId: bestCarpenter.id,
          assigned_carpenter_name: bestCarpenter.name,
          assigned_carpenter_id: bestCarpenter.id,
          jobStatus: 'Assigned',
          assignedDate: todayStr,
          auditLogs: [
            ...(order.auditLogs || []),
            {
              timestamp: todayStr,
              action: 'Carpenter Assigned (Auto-Weighted)',
              user: 'Auto-Allocation Engine',
              comments: `Assigned to ${bestCarpenter.name} based on Industry Standard Weighted Score: [${winner.breakdown}]`
            }
          ]
        };
      }
    }
    return order;
  });

  if (allocatedCount > 0) {
    const newlyAllocated = updatedOrders.filter(o => {
      const old = orders.find(oldOrder => oldOrder.orderId === o.orderId);
      return old && old.jobStatus !== o.jobStatus;
    });
    saveOrders(updatedOrders, newlyAllocated);
    
    // Trigger webhooks for the new assignments
    updatedOrders.forEach(o => {
      if (o.jobStatus === 'Assigned' && !orders.find(old => old.id === o.id && old.jobStatus === 'Assigned')) {
        const assignedCarp = getCarpenters().find(c => c.name === o.assignedCarpenter);
        triggerN8nWebhook('technician_job_assigned', {
          technician_name: assignedCarp?.name || o.assignedCarpenter,
          technician_phone: assignedCarp?.phone || '',
          order_id: o.id,
          order_ref: o.orderId,
          customer_pincode: o.pincode,
          payout: o.payout
        });
      }
    });

    addNotification(`Auto-Allocation complete. Assigned ${allocatedCount} jobs to carpenters.`, 'admin@service.com', 'Admin');
  }

  return allocatedCount;
};

export function resetState() {
  localStorage.removeItem(STORAGE_KEYS.ORDERS);
  localStorage.removeItem(STORAGE_KEYS.CARPENTERS);
  localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
  localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
  idbSave(STORES.ORDERS, []);
  idbSave(STORES.CARPENTERS, []);
  initializeStorage();
  return getOrders();
}

// Reconcile and export CarpenterPortal compatibility layer
export const stateManager = {
  getOrders() {
    return getOrders();
  },

  getJobs() {
    return getOrders();
  },

  hydrateOrders(orders) {
    return hydrateOrders(orders);
  },

  getJobById(id) {
    const orders = getOrders();
    return orders.find(o => o.id === id || o.orderId === id || o.order_id === id) || null;
  },

  updateJob(jobId, updatedFields) {
    return updateOrder(jobId, updatedFields);
  },

  rejectJob(orderId, carpenterName, reason, fallbackJob = null) {
    return rejectJob(orderId, carpenterName, reason, fallbackJob);
  },

  toggleChecklistItem(jobId, itemId) {
    lastLocalUpdate.set(jobId, Date.now());
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === jobId || o.orderId === jobId);
    if (orderIndex !== -1) {
      const order = normalizeOrder(orders[orderIndex]);
      const updatedChecklist = order.checklist.map(item => {
        if (item.id === itemId) {
          return { ...item, checked: !item.checked };
        }
        return item;
      });
      orders[orderIndex] = { ...order, checklist: updatedChecklist };
      saveOrders(orders, orders[orderIndex]);
      return normalizeOrder(orders[orderIndex]);
    }
    return null;
  },

  addComment(jobId, text, sender = 'Carpenter') {
    return addComment(jobId, text, sender);
  },

  submitDamageReport(jobId, partName, notes, damagePhotosPayload) {
    lastLocalUpdate.set(jobId, Date.now());
    const orders = getOrders();
    const orderIndex = orders.findIndex(o => o.id === jobId || o.orderId === jobId || o.order_id === jobId);
    if (orderIndex !== -1) {
      const order = orders[orderIndex];
      let damagePhotos = [];
      if (typeof damagePhotosPayload === 'string' && damagePhotosPayload.startsWith('[')) {
        try {
          damagePhotos = JSON.parse(damagePhotosPayload);
        } catch(e) {}
      } else if (Array.isArray(damagePhotosPayload)) {
        damagePhotos = damagePhotosPayload;
      }
      
      const damageReport = {
        partName,
        notes,
        photo: damagePhotos.length > 0 ? damagePhotos[0] : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23c0392b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="10">Parts Damage</text></svg>',
        damagePhotos,  // embed so normalizeOrder can extract on re-load
        status: 'Pending',
        previousStatus: order.jobStatus || order.status || 'Assigned'
      };

      const timestamp = new Date().toISOString();
      const updatedOrderObj = {
        ...order,
        damageReport,
        damagePhotos,
        damage_photos: damagePhotos,
        damageReportFile: null,
        jobStatus: 'On Hold - Parts Requested',
        status: 'On Hold - Parts Requested',
        partHoldPreviousStatus: damageReport.previousStatus,
        part_hold_previous_status: damageReport.previousStatus,
        auditLogs: [
          ...(Array.isArray(order.auditLogs) ? order.auditLogs : []),
          {
            timestamp,
            action: 'Status Changed to On Hold',
            user: order.assignedCarpenter || 'Carpenter',
            comments: `Replacement parts requested: "${partName}". Notes: ${notes}`
          }
        ]
      };
      
      orders[orderIndex] = updatedOrderObj;
      saveOrders(orders, updatedOrderObj);  // pass changed order to trigger PB sync
      
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
    return resetState();
  },

  getCarpenters() {
    return getCarpenters();
  },

  getActiveUser() {
    return getActiveUser();
  },

  async fetchJobFromServer(jobId) {
    try {
      if (!pb) return null;
      // Fetch by semantic orderId instead of PocketBase row ID, since the link uses orderId
      const record = await pb.collection('orders').getFirstListItem(`order_id="${jobId}" || id="${jobId}"`, { expand: 'assigned_carpenter' });
      if (!record) return null;
      
      const order = mapRecordToOrder(record);
      const orders = getOrders();
      const existingIndex = orders.findIndex(o => o.orderId === order.orderId);
      
      if (existingIndex !== -1) {
        orders[existingIndex] = { ...orders[existingIndex], ...order };
      } else {
        orders.push(order);
      }
      
      saveOrdersLocalOnly(orders);
      window.dispatchEvent(new Event('fsa_storage_update'));
      return normalizeOrder(order);
    } catch (e) {
      console.warn("[PocketBase] Direct job fetch failed:", e.message);
      return null;
    }
  }
};

// PocketBase Synchronization Helpers

export function mapRecordToOrder(r) {
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
    sku: r.product_sku || '',
    platform: r.platform || 'Amazon',
    customerName: r.customer_name || '',
    customerPhone: r.customer_phone || '',
    customerAddress: r.customer_address || '',
    city: r.city || '',
    state: r.state || '',
    pincode: r.pincode || '',
    status: r.assembly_status || r.status || 'Unassigned',
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
    damagePhoto: r.damage_photo || r.damagePhoto || '',
    damagePhotos: r.damage_photos || r.damagePhotos || [],
    partsList: r.parts_list || r.partsList || '',
    carpenterComments: r.carpenter_comments || r.carpenterComments || '',
    productImage: r.product_image || r.product_image_url || '',
    photos: r.photos || { before: null, after: null },
    signature: r.signature || null,
    archived: r.archived || r.is_archived || false,
    otp: r.otp || '',
    otpSent: r.otp_sent || r.otpSent || false,
    otpVerified: r.otp_verified || r.otpVerified || false,
    subCarpenterName: r.sub_carpenter_name || '',
    subCarpenterPhone: r.sub_carpenter_phone || '',
    extraCharges: r.extra_charges || []
  });
}

function hasAuditAction(order, action) {
  const auditLogs = Array.isArray(order?.auditLogs)
    ? order.auditLogs
    : (Array.isArray(order?.audit_logs) ? order.audit_logs : []);
  return auditLogs.some(log => log.action === action);
}

function preserveLocalPartsDispatch(existingOrder, incomingOrder) {
  if (!hasAuditAction(existingOrder, 'Parts Dispatched')) return incomingOrder;

  const existingDamageReport = existingOrder.damageReport || existingOrder.damage_report || null;
  const incomingDamageReport = incomingOrder.damageReport || incomingOrder.damage_report || null;
  const previousStatus = existingDamageReport?.previousStatus
    || incomingDamageReport?.previousStatus
    || existingOrder.partHoldPreviousStatus
    || existingOrder.part_hold_previous_status
    || incomingOrder.partHoldPreviousStatus
    || incomingOrder.part_hold_previous_status
    || '';
  const damageReport = existingDamageReport
    ? { ...existingDamageReport, status: 'Dispatched', previousStatus }
    : (incomingDamageReport ? { ...incomingDamageReport, status: 'Dispatched', previousStatus } : incomingDamageReport);
  const auditLogs = Array.isArray(existingOrder.auditLogs) ? existingOrder.auditLogs : incomingOrder.auditLogs;
  const preservedStatus = existingOrder.jobStatus === 'On Hold - Parts Requested'
    ? 'Assigned'
    : (existingOrder.jobStatus || existingOrder.status || 'Assigned');

  return normalizeOrder({
    ...incomingOrder,
    jobStatus: preservedStatus,
    status: preservedStatus,
    assembly_status: preservedStatus,
    damageReport,
    damage_report: damageReport,
    damagePhoto: existingOrder.damagePhoto || incomingOrder.damagePhoto,
    damagePhotos: existingOrder.damagePhotos || incomingOrder.damagePhotos,
    damage_photos: existingOrder.damage_photos || existingOrder.damagePhotos || incomingOrder.damage_photos,
    partsList: existingOrder.partsList || incomingOrder.partsList,
    carpenterComments: existingOrder.carpenterComments || incomingOrder.carpenterComments,
    partHoldPreviousStatus: previousStatus,
    part_hold_previous_status: previousStatus,
    auditLogs,
    audit_logs: existingOrder.audit_logs || auditLogs || incomingOrder.audit_logs
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
      let filterStr = `order_id="${orderId}"`;
      if (orderId && orderId.length === 15) {
        filterStr = `order_id="${orderId}" || id="${orderId}"`;
      }
      record = await pb.collection('orders').getFirstListItem(filterStr, { $autoCancel: false });
    } catch (err) {
      // 404
    }

    let mergedComments = order.comments || [];
    let mergedAuditLogs = order.auditLogs || order.audit_logs || [];

    if (record) {
      // Merge comments: sort chronologically and deduplicate
      const serverComments = record.comments || [];
      const seenComments = new Set();
      const tempComments = [];
      const addCommentObj = (c) => {
        if (!c || !c.text) return;
        const key = `${c.timestamp}_${c.author}_${c.text}`;
        if (!seenComments.has(key)) {
          seenComments.add(key);
          tempComments.push(c);
        }
      };
      mergedComments.forEach(addCommentObj);
      serverComments.forEach(addCommentObj);
      mergedComments = tempComments.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

      // Merge audit logs: sort chronologically and deduplicate
      const serverLogs = record.audit_logs || [];
      const seenLogs = new Set();
      const tempLogs = [];
      const addLogObj = (l) => {
        if (!l || !l.action) return;
        const key = `${l.timestamp}_${l.action}_${l.user}_${l.comments}`;
        if (!seenLogs.has(key)) {
          seenLogs.add(key);
          tempLogs.push(l);
        }
      };
      mergedAuditLogs.forEach(addLogObj);
      serverLogs.forEach(addLogObj);
      mergedAuditLogs = tempLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
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
      comments: mergedComments,
      audit_logs: mergedAuditLogs,
      damage_report: order.damageReport ? { ...order.damageReport, damagePhotos: order.damagePhotos || [] } : (order.damage_report || null),
      photos: order.photos || { before: null, after: null },
      signature: order.signature || null,
      archived: order.archived || false,
      is_archived: order.archived || false,
      otp: order.otp || '1234',
      otp_sent: order.otpSent || order.otp_sent || false,
      otp_verified: order.otpVerified || order.otp_verified || false,
      sub_carpenter_name: order.subCarpenterName || '',
      sub_carpenter_phone: order.subCarpenterPhone || '',
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
      pbFields.assigned_carpenter = '';
    }

    // Attempt direct JSON sync. PocketBase schema uses "json" for photos and "text" for signature.
    // Base64 strings will be stored directly in these fields.
    let updatedRecord = null;
    
    try {
      const safeFields = { ...pbFields };
      
      try {
        if (record) {
          updatedRecord = await pb.collection('orders').update(record.id, safeFields, { $autoCancel: false });
        } else {
          updatedRecord = await pb.collection('orders').create(safeFields, { $autoCancel: false });
        }
      } catch (err) {
        if (err.status >= 400 && record) {
          console.warn(`[PocketBase] ${err.status} Error during full sync. Applying KISS fallback for core status...`, err);
          const kissFields = {
            status: safeFields.status,
            assembly_status: safeFields.assembly_status,
            payment_status: safeFields.payment_status,
            delivery_status: safeFields.delivery_status,
            damage_report: safeFields.damage_report,
            assigned_carpenter_name: safeFields.assigned_carpenter_name,
            assigned_carpenter: safeFields.assigned_carpenter
          };
          updatedRecord = await pb.collection('orders').update(record.id, kissFields, { $autoCancel: false });
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.warn('JSON sync failed entirely.', err);
    }

    // If upload succeeded, strip heavy base64 blobs from localStorage — data is now on PocketBase
    if (updatedRecord) {
      const localOrders = getOrders();
      const idx = localOrders.findIndex(o => o.id === orderId || o.orderId === orderId || o.order_id === orderId);
      if (idx !== -1) {
        const local = localOrders[idx];

        // Preserve damagePhotos and damageReport intact for Logistics dashboard
        const updatedDamagePhotos = local.damagePhotos || [];
        const updatedDamageReport = local.damageReport;

        // Replace base64 before/after photos with null (server holds them in photos JSON)
        const strippedPhotos = local.photos ? {
          before: typeof local.photos.before === 'string' && local.photos.before.startsWith('data:') ? null : local.photos.before,
          after:  typeof local.photos.after  === 'string' && local.photos.after.startsWith('data:')  ? null : local.photos.after
        } : local.photos;

        // Clear base64 signature blob
        const strippedSignature = typeof local.signature === 'string' && local.signature.startsWith('data:')
          ? null
          : local.signature;

        localOrders[idx] = {
          ...local,
          comments: mergedComments,
          auditLogs: mergedAuditLogs,
          audit_logs: mergedAuditLogs,
          damagePhotos: updatedDamagePhotos,
          damage_photos: updatedDamagePhotos,
          damageReport: updatedDamageReport,
          photos: strippedPhotos,
          signature: strippedSignature
        };
        saveOrdersLocalOnly(localOrders);
        console.log('[FSA] Base64 blobs cleared from localStorage for order', orderId, '— data confirmed on PocketBase.');
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
            quality_score: Number(carp.qualityScore || 100),
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
        qualityScore: Number(r.quality_score !== undefined ? r.quality_score : (match ? (match.qualityScore || 100) : 100)),
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
        let updatedOrder = mapRecordToOrder(fullRecord);
        
        // If PB record has no carpenter info, preserve local order's carpenter data
        // This handles the case when assigned_carpenter_name field doesn't exist in PB schema
        if (orderIndex !== -1) {
          const existingOrder = orders[orderIndex];
          if (!updatedOrder.assignedCarpenter && existingOrder.assignedCarpenter) {
            updatedOrder.assignedCarpenter = existingOrder.assignedCarpenter;
            updatedOrder.assigned_carpenter_name = existingOrder.assignedCarpenter;
            updatedOrder.assignedCarpenterId = updatedOrder.assignedCarpenterId || existingOrder.assignedCarpenterId;
          }
          
          // Preserve local-only UI states that PocketBase doesn't track
          updatedOrder.otp = existingOrder.otp || updatedOrder.otp;
          updatedOrder.otpSent = existingOrder.otpSent;
          updatedOrder.otp_sent = existingOrder.otpSent;
          updatedOrder.otpVerified = existingOrder.otpVerified;
          updatedOrder.otp_verified = existingOrder.otpVerified;

          // Merge & preserve local fields to prevent race conditions on recent local updates
          const lastLocalTime = lastLocalUpdate.get(record.order_id) || 0;
          const isRecentlyUpdatedLocally = (Date.now() - lastLocalTime) < 5000;
          if (isRecentlyUpdatedLocally) {
            updatedOrder.checklist = existingOrder.checklist;
            updatedOrder.status = existingOrder.status;
            updatedOrder.jobStatus = existingOrder.jobStatus;
            updatedOrder.assembly_status = existingOrder.assembly_status;
            updatedOrder.photos = existingOrder.photos;
            updatedOrder.signature = existingOrder.signature;
            updatedOrder.damageReport = existingOrder.damageReport;
            updatedOrder.damage_report = existingOrder.damage_report;
            updatedOrder.damagePhoto = existingOrder.damagePhoto;
            updatedOrder.partsList = existingOrder.partsList;
            updatedOrder.carpenterComments = existingOrder.carpenterComments;
            updatedOrder.paymentStatus = existingOrder.paymentStatus;
            updatedOrder.payment_status = existingOrder.payment_status;
            updatedOrder.secureSignatureUrl = existingOrder.secureSignatureUrl;
            updatedOrder.securePhotoUrl = existingOrder.securePhotoUrl;
            updatedOrder.gpsCoords = existingOrder.gpsCoords;
            updatedOrder.auditLogs = existingOrder.auditLogs;
            updatedOrder.audit_logs = existingOrder.audit_logs;
          }

          // Protect completed status from being overwritten by a pending server status
          if (existingOrder.jobStatus === 'Completed' && updatedOrder.jobStatus !== 'Completed') {
            updatedOrder.jobStatus = 'Completed';
            updatedOrder.status = 'Completed';
            updatedOrder.assembly_status = 'Completed';
          }

          updatedOrder = preserveLocalPartsDispatch(existingOrder, updatedOrder);
          
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
          localCarps[index].qualityScore = record.quality_score !== undefined ? Number(record.quality_score) : localCarps[index].qualityScore || 100;
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
  
  // Fallback to Environment Variable for massive multi-user deployments
  const envUrl = import.meta.env?.VITE_N8N_WEBHOOK_URL;
  if (envUrl) {
    return { enabled: true, webhookUrl: envUrl };
  }
  
  return { enabled: false, webhookUrl: '' };
}

export async function saveN8nConfig(config) {
  try {
    localStorage.setItem('fsa_n8n_config', JSON.stringify(config));
    window.dispatchEvent(new Event('fsa_storage_update'));
    
    // Attempt to cloud-sync settings to PocketBase if available
    if (pb && pb.authStore?.isValid) {
      try {
        const records = await pb.collection('app_settings').getFullList();
        if (records.length > 0) {
          await pb.collection('app_settings').update(records[0].id, {
            n8n_webhook_url: config.webhookUrl,
            n8n_enabled: config.enabled
          });
        } else {
          await pb.collection('app_settings').create({
            n8n_webhook_url: config.webhookUrl,
            n8n_enabled: config.enabled
          });
        }
      } catch (e) {
        console.warn('[PocketBase] app_settings sync failed. Collection might not exist yet.');
      }
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function syncSettingsFromPocketBase() {
  if (!pb) return;
  try {
    const records = await pb.collection('app_settings').getFullList();
    if (records.length > 0) {
      const remoteConfig = {
        enabled: records[0].n8n_enabled,
        webhookUrl: records[0].n8n_webhook_url
      };
      localStorage.setItem('fsa_n8n_config', JSON.stringify(remoteConfig));
    }
  } catch(e) {
    // Collection doesn't exist or no permission, ignore silently
  }
}

export async function triggerN8nWebhook(event, data) {
  const config = getN8nConfig();
  if (!config.enabled || !config.webhookUrl) {
    addNotification(`Customer message skipped for '${event}': n8n webhook is not configured.`, '', 'System');
    return { sent: false, skipped: true, queued: false };
  }

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
    return { sent: true, skipped: false, queued: false };
  } catch (err) {
    console.error(`n8n Webhook error for event '${event}':`, err);
    addNotification(`n8n Webhook failed for event '${event}'.`, '', 'System');
    queueSyncOperation('n8n_webhook', { event, data });
    return { sent: false, skipped: false, queued: true, error: err.message || String(err) };
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
        saveOrders(allOrders, updatedOrder);
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
          saveOrders(allOrders, allOrders[idx]);
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
  const normalizedInput = phone.trim().toLowerCase();

  const demoUsers = [
    { phone: '+91-80000-00001', password: 'admin123', role: 'Super Admin', name: 'Super Admin', email: 'superadmin@timberflow.in' },
    { phone: '+91-80000-00002', password: 'admin123', role: 'Dispatcher', name: 'Dispatcher', email: 'dispatcher@timberflow.in' },
    { phone: '+91-80000-00003', password: 'admin123', role: 'Inventory Manager', name: 'Inventory Manager', email: 'inventory@timberflow.in' },
    { phone: '+91-80000-00004', password: 'admin123', role: 'Customer Support', name: 'Customer Support', email: 'support@timberflow.in' }
  ];

  const demoUser = demoUsers.find(user => {
    const cleanDemoPhone = normalizePhoneForComparison(user.phone);
    return password === user.password && (
      cleanInputPhone === cleanDemoPhone ||
      normalizedInput === user.email ||
      cleanPhoneDigits === user.phone.replace(/[^0-9]/g, '')
    );
  });

  if (demoUser) {
    return {
      success: true,
      user: {
        role: demoUser.role,
        name: demoUser.name,
        username: demoUser.phone.replace(/[^0-9]/g, ''),
        phone: demoUser.phone,
        email: demoUser.email,
        id: `demo_${demoUser.role.toLowerCase().replace(/\s+/g, '_')}`
      },
      source: 'local-demo'
    };
  }

  const demoCarpenter = getCarpenters().find(carpenter => {
    const cleanCarpenterPhone = normalizePhoneForComparison(carpenter.phone || carpenter.id || '');
    const carpenterEmail = String(carpenter.email || '').toLowerCase();
    return password === 'carpenter123' && (
      cleanInputPhone === cleanCarpenterPhone ||
      normalizedInput === carpenterEmail
    );
  });

  if (demoCarpenter) {
    return {
      success: true,
      user: {
        role: 'Carpenter',
        name: demoCarpenter.name,
        username: demoCarpenter.phone || demoCarpenter.id,
        phone: demoCarpenter.phone || '',
        email: demoCarpenter.email || '',
        id: demoCarpenter.id
      },
      source: 'local-demo'
    };
  }

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
        // Try regular users collection first
        authData = await pb.collection('users').authWithPassword(identity, password);
        if (authData?.record) {
          console.log('[Auth] PocketBase user login succeeded with identity:', identity);
          break;
        }
      } catch (err) {
        // Fallback: try PocketBase v0.23+ superusers collection
        try {
          authData = await pb.collection('_superusers').authWithPassword(identity, password);
          if (authData?.record) {
            console.log('[Auth] PocketBase superuser login succeeded with identity:', identity);
            break;
          }
        } catch (se) {
          // Legacy PocketBase admin auth fallback
          try {
            authData = await pb.admins.authWithPassword(identity, password);
            if (authData?.admin) {
              console.log('[Auth] PocketBase legacy admin login succeeded with identity:', identity);
              break;
            }
          } catch (ae) {
            console.warn('[Auth] Candidate failed for all auth models:', identity);
          }
        }
      }
    }

    if (authData?.record || authData?.admin) {
      const record = authData.record || authData.admin;
      const role = record.role || 'Super Admin'; // Default to Super Admin for superusers/admins
      return {
        success: true,
        user: {
          role,
          name: record.name || record.username || (record.email ? record.email.split('@')[0] : 'Admin'),
          username: record.username || '',
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
  syncSettingsFromPocketBase();
  (async () => {
    try {
      // Fetch only active, unpaid, or recently created orders (within last 30 days) to keep boot times fast
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - 30);
      const dateStr = dateLimit.toISOString().replace('T', ' '); // PocketBase format: YYYY-MM-DD HH:MM:SS.FFF
      const activeFilter = `created >= "${dateStr}" || status != "Completed" || payment_status != "Paid"`;

      const records = await pb.collection('orders').getFullList({ 
        sort: '-created', 
        expand: 'assigned_carpenter', 
        filter: activeFilter,
        $autoCancel: false 
      });
      window.fsa_db_sync_error = null;
      window.dispatchEvent(new Event('fsa_storage_update'));
      if (records.length > 0) {
        const localOrders = getOrders(); // existing local orders before overwrite
        const mapped = records.map(r => {
          let order = mapRecordToOrder(r);
          const existingLocal = localOrders.find(o => o.orderId === order.orderId);
          if (existingLocal) {
            // Preserve local carpenter assignment if PB expand/name field is empty
            if (!order.assignedCarpenter && existingLocal.assignedCarpenter) {
              order.assignedCarpenter = existingLocal.assignedCarpenter;
              order.assigned_carpenter_name = existingLocal.assignedCarpenter;
              order.assignedCarpenterId = order.assignedCarpenterId || existingLocal.assignedCarpenterId;
            }
            
            // Protect completed status from being overwritten by a pending server status
            if (existingLocal.jobStatus === 'Completed' && order.jobStatus !== 'Completed') {
              order.jobStatus = 'Completed';
              order.status = 'Completed';
              order.assembly_status = 'Completed';
            }

            // Protect locally-rejected / unassigned orders from stale PB data
            // If user just rejected (local = Unassigned + no carpenter) honour it
            if (
              existingLocal.jobStatus === 'Unassigned' &&
              !existingLocal.assignedCarpenter &&
              order.jobStatus !== 'Unassigned'
            ) {
              const localUpdatedAt = existingLocal.updated || existingLocal.updatedAt || 0;
              const pbUpdatedAt = order.updated || order.updatedAt || 0;
              if (new Date(localUpdatedAt) > new Date(pbUpdatedAt)) {
                order.jobStatus = 'Unassigned';
                order.status = 'Unassigned';
                order.assignedCarpenter = '';
                order.assignedCarpenterId = '';
                order.assigned_carpenter = null;
                order.assigned_carpenter_name = '';
              }
            }

            // Preserve local-only UI states
            order.otpSent = existingLocal.otpSent;
            order.otp_sent = existingLocal.otpSent;
            order.otpVerified = existingLocal.otpVerified;
            order.otp_verified = existingLocal.otpVerified;

            // Preserve locally saved damage photos — PB may not have synced them yet
            if (
              existingLocal.damagePhotos &&
              Array.isArray(existingLocal.damagePhotos) &&
              existingLocal.damagePhotos.length > 0 &&
              (!order.damagePhotos || order.damagePhotos.length === 0)
            ) {
              order.damagePhotos = existingLocal.damagePhotos;
              order.damage_photos = existingLocal.damagePhotos;
              if (order.damageReport) {
                order.damageReport.damagePhotos = existingLocal.damagePhotos;
              }
            }

            order = preserveLocalPartsDispatch(existingLocal, order);
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

// React Query Helper Exports
export const fsaQueries = {
  orders: {
    all: (page = 1, perPage = 50, filter = '') => ({
      queryKey: ['orders', page, perPage, filter],
      queryFn: async () => {
        // Request only lightweight fields to avoid downloading massive base64 strings in older records
        const fields = 'id,created,updated,order_id,platform,customer_name,customer_phone,customer_address,city,state,pincode,status,payment_status,payment_type,assembly_payout,delivery_status,delivery_date,promise_date,checklist,comments,audit_logs,damage_report,assigned_carpenter,assigned_carpenter_name,archived,is_archived,otp,otp_sent,otp_verified,sub_carpenter_name,sub_carpenter_phone,product_sku,assigned_date,assembly_amount,customer_number,payment_source,product_image_url,product_review_link,seller_review_link,assembly_status,expand.assigned_carpenter.name,expand.assigned_carpenter.username';
        return await pb.collection('orders').getList(page, perPage, { filter, sort: '-created', expand: 'assigned_carpenter', fields });
      }
    }),
    detail: (id) => ({
      queryKey: ['orders', id],
      queryFn: async () => {
        return await pb.collection('orders').getOne(id, { expand: 'assigned_carpenter' });
      }
    })
  },
  carpenters: {
    all: (page = 1, perPage = 50, filter = '') => ({
      queryKey: ['carpenters', page, perPage, filter],
      queryFn: async () => {
        const queryFilter = filter ? `(role="Carpenter" && ${filter})` : 'role="Carpenter"';
        const result = await pb.collection('users').getList(page, perPage, { filter: queryFilter, sort: '-created' });
        const localCarps = getCarpenters();
        const items = result.items.map(record => {
          const local = localCarps.find(c =>
            c.id === record.id
            || (record.email && c.email === record.email)
            || (record.phone && c.phone === record.phone)
            || (record.username && c.phone === record.username)
            || (record.name && c.name === record.name)
          );

          return {
            ...record,
            pincodes: [...new Set([...(record.pincodes || []), ...(local?.pincodes || [])])]
          };
        });

        return { ...result, items };
      }
    }),
    detail: (id) => ({
      queryKey: ['carpenters', id],
      queryFn: async () => {
        return await pb.collection('users').getOne(id);
      }
    })
  }
};

// --- STUBS FOR MISSING FUNCTIONS (Production Readiness Cleanup) ---

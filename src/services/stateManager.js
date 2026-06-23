/**
 * State Management and Mock Data Service for Field Service App
 * Persists state in localStorage and simulates a real-time database backend.
 */

// Helper to get dates relative to today
const getRelativeDate = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().split('T')[0];
};

// Seed Data for Carpenters
const seedCarpenters = [
  {
    name: 'John Carpenter',
    email: 'john.carpenter@service.com'
  },
  {
    name: 'Mark Carpenter',
    email: 'mark.carpenter@service.com'
  }
];

// Seed Data for Orders
const seedOrders = [
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
    product_ref_link: 'https://manuals.service.com/beds/queen-bed-assembly.pdf',
    seller_reviewer: 'Amazon Quality Reviewer',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-1), // Delivered yesterday
    promise_date: getRelativeDate(1),
    replacement_request: null
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
    payment_type: 'Customer Pay',
    assigned_carpenter: 'John Carpenter',
    assigned_date: getRelativeDate(0), // Assigned today
    product_image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/tables/study-desk-assembly.pdf',
    seller_reviewer: 'Flipkart Auditor Team',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(0), // Delivered today
    promise_date: getRelativeDate(2),
    replacement_request: null
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
    replacement_request: null
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
    replacement_request: {
      partName: 'Gas Lift Cylinder M8',
      description: 'The hydraulic lift cylinder is completely missing from the hardware box.',
      photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80',
      status: 'Pending'
    }
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
    payment_status: 'Paid',
    payment_type: 'Company Pay',
    assigned_carpenter: 'Mark Carpenter',
    assigned_date: getRelativeDate(-3),
    product_image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/sofas/seater-sofa.pdf',
    seller_reviewer: 'Flipkart Auditor Team',
    delivery_status: 'Delivered',
    delivery_date: getRelativeDate(-3),
    promise_date: getRelativeDate(-1),
    replacement_request: null,
    customer_signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
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
    delivery_status: 'Pending',
    delivery_date: '',
    promise_date: getRelativeDate(3), // delivery pending
    replacement_request: null
  },
  {
    order_id: 'AMZ-1250',
    customer_name: 'Zendaya Coleman',
    product_sku: 'SKU-TABLE-COFFEE-07',
    assembly_payout: 60,
    customer_phone: '+1-555-0182',
    customer_address: '123 Sunset Blvd',
    city: 'Los Angeles',
    state: 'CA',
    pincode: '90028',
    status: 'Unassigned',
    payment_status: 'Unpaid',
    payment_type: 'Customer Pay',
    assigned_carpenter: '',
    assigned_date: '',
    product_image: 'https://images.unsplash.com/photo-1530018607912-eff2daa1bac4?auto=format&fit=crop&w=600&q=80',
    product_ref_link: 'https://manuals.service.com/tables/coffee-table.pdf',
    seller_reviewer: 'Amazon Quality Reviewer',
    delivery_status: 'Shipped',
    delivery_date: '',
    promise_date: getRelativeDate(2),
    replacement_request: null
  }
];

// Seed Data for Comments
const seedComments = [
  {
    orderId: 'FLP-4421',
    user: 'John Carpenter',
    role: 'Carpenter',
    content: 'Called the customer. They confirmed availability for assembly today at 2 PM.',
    timestamp: new Date(new Date().setHours(new Date().getHours() - 2)).toISOString()
  },
  {
    orderId: 'WEB-5523',
    user: 'Mark Carpenter',
    role: 'Carpenter',
    content: 'Started the assembly. The wooden panels are heavy, might need an extra hour.',
    timestamp: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString()
  },
  {
    orderId: 'AMZ-1049',
    user: 'John Carpenter',
    role: 'Carpenter',
    content: 'The hydraulic gas lift cylinder is missing from the packaging. Need to request a replacement.',
    timestamp: getRelativeDate(-2) + 'T14:20:00.000Z'
  },
  {
    orderId: 'AMZ-1049',
    user: 'Admin',
    role: 'Admin',
    content: 'Acknowledged. Replacement request created. Waiting for supplier approval.',
    timestamp: getRelativeDate(-1) + 'T09:00:00.000Z'
  }
];

// Seed Data for Notifications
const seedNotifications = [
  {
    id: 'notif-1',
    recipientEmail: 'john.carpenter@service.com',
    recipientRole: 'Carpenter',
    title: 'New Job Assigned',
    message: 'You have been assigned job FLP-4421 for Scarlett Johansson.',
    read: false,
    timestamp: new Date(new Date().setHours(new Date().getHours() - 3)).toISOString()
  },
  {
    id: 'notif-2',
    recipientEmail: 'mark.carpenter@service.com',
    recipientRole: 'Carpenter',
    title: 'Job Update',
    message: 'Your job WEB-5523 is in progress. Please update status once completed.',
    read: true,
    timestamp: getRelativeDate(-1) + 'T10:00:00.000Z'
  },
  {
    id: 'notif-3',
    recipientEmail: 'admin@service.com',
    recipientRole: 'Admin',
    title: 'Replacement Requested',
    message: 'John Carpenter has requested a replacement part for AMZ-1049.',
    read: false,
    timestamp: getRelativeDate(-2) + 'T14:22:00.000Z'
  }
];

// Seed Data for Audit Logs
const seedAuditLogs = [
  {
    orderId: 'FLP-4421',
    action: 'Job assigned to John Carpenter',
    user: 'Admin',
    timestamp: new Date(new Date().setHours(new Date().getHours() - 3)).toISOString()
  },
  {
    orderId: 'WEB-5523',
    action: 'Job assigned to Mark Carpenter',
    user: 'Admin',
    timestamp: getRelativeDate(-1) + 'T09:30:00.000Z'
  },
  {
    orderId: 'WEB-5523',
    action: 'Status updated to In Progress',
    user: 'Mark Carpenter',
    timestamp: getRelativeDate(-1) + 'T10:15:00.000Z'
  },
  {
    orderId: 'AMZ-1049',
    action: 'Job assigned to John Carpenter',
    user: 'Admin',
    timestamp: getRelativeDate(-2) + 'T10:00:00.000Z'
  },
  {
    orderId: 'AMZ-1049',
    action: 'Status updated to In Progress',
    user: 'John Carpenter',
    timestamp: getRelativeDate(-2) + 'T11:00:00.000Z'
  },
  {
    orderId: 'AMZ-1049',
    action: 'Replacement part requested: Gas Lift Cylinder M8. Job set to On Hold.',
    user: 'John Carpenter',
    timestamp: getRelativeDate(-2) + 'T14:20:00.000Z'
  },
  {
    orderId: 'FLP-9022',
    action: 'Job assigned to Mark Carpenter',
    user: 'Admin',
    timestamp: getRelativeDate(-3) + 'T08:00:00.000Z'
  },
  {
    orderId: 'FLP-9022',
    action: 'Status updated to In Progress',
    user: 'Mark Carpenter',
    timestamp: getRelativeDate(-3) + 'T09:00:00.000Z'
  },
  {
    orderId: 'FLP-9022',
    action: 'Job completed. Signature uploaded.',
    user: 'Mark Carpenter',
    timestamp: getRelativeDate(-3) + 'T11:30:00.000Z'
  },
  {
    orderId: 'FLP-9022',
    action: 'Payout processed',
    user: 'Super Admin',
    timestamp: getRelativeDate(-2) + 'T16:00:00.000Z'
  }
];

/**
 * 1. Checks if database exists in localStorage. If not, seeds it.
 */
export function initDatabase() {
  if (!localStorage.getItem('fsa_carpenters')) {
    localStorage.setItem('fsa_carpenters', JSON.stringify(seedCarpenters));
  }
  if (!localStorage.getItem('fsa_orders')) {
    localStorage.setItem('fsa_orders', JSON.stringify(seedOrders));
  }
  if (!localStorage.getItem('fsa_comments')) {
    localStorage.setItem('fsa_comments', JSON.stringify(seedComments));
  }
  if (!localStorage.getItem('fsa_notifications')) {
    localStorage.setItem('fsa_notifications', JSON.stringify(seedNotifications));
  }
  if (!localStorage.getItem('fsa_audit_logs')) {
    localStorage.setItem('fsa_audit_logs', JSON.stringify(seedAuditLogs));
  }
}

/**
 * 2. Get and Save Orders
 */
export function getOrders() {
  initDatabase();
  return JSON.parse(localStorage.getItem('fsa_orders') || '[]');
}

export function saveOrders(orders) {
  localStorage.setItem('fsa_orders', JSON.stringify(orders));
}

/**
 * 3. Comments Operations
 */
export function getComments(orderId) {
  initDatabase();
  const comments = JSON.parse(localStorage.getItem('fsa_comments') || '[]');
  return comments.filter(c => c.orderId === orderId);
}

export function addComment(orderId, comment) {
  initDatabase();
  const comments = JSON.parse(localStorage.getItem('fsa_comments') || '[]');
  
  const newComment = {
    orderId,
    user: comment.user || 'Unknown',
    role: comment.role || 'User',
    content: comment.content || '',
    timestamp: comment.timestamp || new Date().toISOString()
  };
  
  comments.push(newComment);
  localStorage.setItem('fsa_comments', JSON.stringify(comments));
  
  // Log event automatically on adding comment
  logEvent(orderId, `Comment added by ${newComment.user} (${newComment.role})`, newComment.user);
  
  return newComment;
}

/**
 * 4. Notifications Operations
 */
export function getNotifications(roleOrEmail) {
  initDatabase();
  const notifications = JSON.parse(localStorage.getItem('fsa_notifications') || '[]');
  if (!roleOrEmail) return notifications;
  
  const lowerVal = roleOrEmail.toLowerCase();
  return notifications.filter(n => 
    (n.recipientEmail && n.recipientEmail.toLowerCase() === lowerVal) ||
    (n.recipientRole && n.recipientRole.toLowerCase() === lowerVal)
  );
}

export function addNotification(notification) {
  initDatabase();
  const notifications = JSON.parse(localStorage.getItem('fsa_notifications') || '[]');
  
  const newNotif = {
    id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    recipientEmail: notification.recipientEmail || '',
    recipientRole: notification.recipientRole || '',
    title: notification.title || '',
    message: notification.message || '',
    read: false,
    timestamp: notification.timestamp || new Date().toISOString()
  };
  
  notifications.push(newNotif);
  localStorage.setItem('fsa_notifications', JSON.stringify(notifications));
  return newNotif;
}

export function markNotificationRead(notificationId) {
  initDatabase();
  const notifications = JSON.parse(localStorage.getItem('fsa_notifications') || '[]');
  const index = notifications.findIndex(n => n.id === notificationId);
  
  if (index !== -1) {
    notifications[index].read = true;
    localStorage.setItem('fsa_notifications', JSON.stringify(notifications));
    return true;
  }
  return false;
}

/**
 * 5. Assign Job
 */
export function assignJob(orderId, carpenterName, assignedDate) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  order.status = 'Assigned';
  order.assigned_carpenter = carpenterName;
  order.assigned_date = assignedDate || new Date().toISOString().split('T')[0];
  saveOrders(orders);

  // Find carpenter email to target notification
  const carpenters = JSON.parse(localStorage.getItem('fsa_carpenters') || '[]');
  const carpenter = carpenters.find(c => c.name === carpenterName);
  const carpenterEmail = carpenter ? carpenter.email : 'john.carpenter@service.com';

  logEvent(orderId, `Job assigned to ${carpenterName}`, 'Admin');

  addNotification({
    recipientEmail: carpenterEmail,
    recipientRole: 'Carpenter',
    title: 'New Job Assigned',
    message: `You have been assigned job ${orderId} for customer ${order.customer_name}.`
  });

  return order;
}

/**
 * 6. Update Job Status
 */
export function updateJobStatus(orderId, status) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  const oldStatus = order.status;
  order.status = status;
  
  // Track previous status when putting on hold
  if (status === 'On Hold - Parts Requested') {
    order.previous_status = oldStatus;
  }

  saveOrders(orders);

  const actor = order.assigned_carpenter || 'System';
  logEvent(orderId, `Status updated from ${oldStatus} to ${status}`, actor);

  // Notify admins when status is Completed or On Hold
  if (status === 'Completed' || status === 'On Hold - Parts Requested') {
    addNotification({
      recipientRole: 'Admin',
      recipientEmail: 'admin@service.com',
      title: `Job ${orderId} Status Update`,
      message: `Job ${orderId} has been changed to "${status}" by ${actor}.`
    });
  }

  return order;
}

/**
 * 7. Request Replacement
 */
export function requestReplacement(orderId, partName, description, photo) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  const oldStatus = order.status;
  
  order.previous_status = oldStatus;
  order.status = 'On Hold - Parts Requested';
  order.replacement_request = {
    partName,
    description,
    photoUrl: photo || '',
    status: 'Pending'
  };

  saveOrders(orders);

  const actor = order.assigned_carpenter || 'Carpenter';
  logEvent(orderId, `Replacement requested for part: ${partName}. Job set to On Hold.`, actor);

  addNotification({
    recipientRole: 'Admin',
    recipientEmail: 'admin@service.com',
    title: 'Replacement Part Requested',
    message: `${actor} requested a "${partName}" for job ${orderId}.`
  });

  return order;
}

/**
 * 8. Approve Replacement
 */
export function approveReplacement(orderId) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  if (!order.replacement_request) {
    throw new Error(`No replacement request exists for order ${orderId}`);
  }

  order.replacement_request.status = 'Dispatched';
  
  // Set back to previous active status (or default to Assigned/In Progress)
  const nextStatus = (order.previous_status === 'In Progress') ? 'In Progress' : 'Assigned';
  order.status = nextStatus;
  delete order.previous_status; // Clean up previous status reference

  saveOrders(orders);

  logEvent(orderId, `Replacement request approved & dispatched. Status set to ${nextStatus}.`, 'Admin');

  if (order.assigned_carpenter) {
    const carpenters = JSON.parse(localStorage.getItem('fsa_carpenters') || '[]');
    const carpenter = carpenters.find(c => c.name === order.assigned_carpenter);
    const carpenterEmail = carpenter ? carpenter.email : 'john.carpenter@service.com';

    addNotification({
      recipientEmail: carpenterEmail,
      recipientRole: 'Carpenter',
      title: 'Replacement Parts Dispatched',
      message: `Parts for job ${orderId} have been dispatched. Status is now ${nextStatus}.`
    });
  }

  return order;
}

/**
 * 9. Complete Job
 */
export function completeJob(orderId, signatureBase64) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  order.status = 'Completed';
  order.customer_signature = signatureBase64;
  order.signature = signatureBase64; // support both property names for compatibility
  
  if (order.payment_type === 'Company Pay') {
    order.payment_status = 'Pending Payout';
  } else if (order.payment_type === 'Customer Pay') {
    order.payment_status = 'Collected';
  }

  saveOrders(orders);

  const actor = order.assigned_carpenter || 'Carpenter';
  logEvent(orderId, `Job completed. Signature captured. Payment status: ${order.payment_status}`, actor);

  addNotification({
    recipientRole: 'Admin',
    recipientEmail: 'admin@service.com',
    title: 'Job Completed',
    message: `Job ${orderId} has been completed by ${actor}. Signature recorded.`
  });

  return order;
}

/**
 * 10. Process Payout (Super Admin only)
 */
export function processPayout(orderId) {
  const orders = getOrders();
  const orderIndex = orders.findIndex(o => o.order_id === orderId);
  if (orderIndex === -1) throw new Error(`Order ${orderId} not found`);

  const order = orders[orderIndex];
  const oldPaymentStatus = order.payment_status;
  order.payment_status = 'Paid';
  saveOrders(orders);

  logEvent(orderId, `Payout processed. Payment status changed from ${oldPaymentStatus} to Paid.`, 'Super Admin');

  if (order.assigned_carpenter) {
    const carpenters = JSON.parse(localStorage.getItem('fsa_carpenters') || '[]');
    const carpenter = carpenters.find(c => c.name === order.assigned_carpenter);
    const carpenterEmail = carpenter ? carpenter.email : 'john.carpenter@service.com';

    addNotification({
      recipientEmail: carpenterEmail,
      recipientRole: 'Carpenter',
      title: 'Payout Processed',
      message: `Your payout of ₹${order.assembly_payout} for job ${orderId} has been processed and paid.`
    });
  }

  return order;
}

/**
 * 11. Audit Logs Operations
 */
export function getAuditLogs(orderId) {
  initDatabase();
  const logs = JSON.parse(localStorage.getItem('fsa_audit_logs') || '[]');
  if (!orderId) return logs;
  return logs.filter(log => log.orderId === orderId);
}

export function logEvent(orderId, action, user) {
  initDatabase();
  const logs = JSON.parse(localStorage.getItem('fsa_audit_logs') || '[]');
  
  const newLog = {
    orderId,
    action,
    user: user || 'System',
    timestamp: new Date().toISOString()
  };
  
  logs.push(newLog);
  localStorage.setItem('fsa_audit_logs', JSON.stringify(logs));
  return newLog;
}

/**
 * 12. Auto Allocate Job Algorithm
 * Assigns unassigned orders to John and Mark evenly based on their current active workload.
 */
export function autoAllocate() {
  const orders = getOrders();
  const unassignedOrders = orders.filter(o => o.status === 'Unassigned');
  
  if (unassignedOrders.length === 0) {
    return { success: true, count: 0, message: 'No unassigned orders to allocate.' };
  }

  // Helper to count active jobs (Assigned, In Progress, On Hold) for a carpenter
  const getActiveWorkload = (carpenterName) => {
    return orders.filter(o => o.assigned_carpenter === carpenterName && o.status !== 'Completed').length;
  };

  let johnWorkload = getActiveWorkload('John Carpenter');
  let markWorkload = getActiveWorkload('Mark Carpenter');
  let allocatedCount = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  unassignedOrders.forEach(order => {
    // Assign to carpenter with lower workload
    let assignedTo = 'John Carpenter';
    if (markWorkload < johnWorkload) {
      assignedTo = 'Mark Carpenter';
      markWorkload++;
    } else {
      johnWorkload++;
    }

    order.status = 'Assigned';
    order.assigned_carpenter = assignedTo;
    order.assigned_date = todayStr;
    allocatedCount++;

    // Add log
    logEvent(order.order_id, `Job auto-allocated to ${assignedTo}`, 'System');

    // Notify carpenter
    const carpenters = JSON.parse(localStorage.getItem('fsa_carpenters') || '[]');
    const carpenter = carpenters.find(c => c.name === assignedTo);
    const carpenterEmail = carpenter ? carpenter.email : (assignedTo === 'John Carpenter' ? 'john.carpenter@service.com' : 'mark.carpenter@service.com');

    addNotification({
      recipientEmail: carpenterEmail,
      recipientRole: 'Carpenter',
      title: 'Job Auto-Allocated',
      message: `Job ${order.order_id} has been auto-allocated to you by the system.`
    });
  });

  saveOrders(orders);
  return { success: true, count: allocatedCount, message: `Successfully allocated ${allocatedCount} orders.` };
}

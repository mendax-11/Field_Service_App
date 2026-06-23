// src/stateManager.js
// Redirect file to redirect root state manager imports to the unified utils manager.

export { 
  getOrders, saveOrders, updateOrder, deleteOrder, addOrder,
  getCarpenters, saveCarpenters, addCarpenter, updateCarpenter, deleteCarpenter,
  addCarpenterPincode, removeCarpenterPincode,
  getUserRole, setUserRole, 
  getNotifications, saveNotifications, addNotification, clearNotifications, 
  addComment, addAuditLog, autoAllocateOrders, getActiveUser, setActiveUser,
  authenticateUser, checkSlaBreaches, queueSyncOperation,
  getN8nConfig, saveN8nConfig, triggerN8nWebhook,
  normalizeOrder, initializeStorage, pb,
  stateManager 
} from './utils/stateManager';


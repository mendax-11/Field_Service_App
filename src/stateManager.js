// src/stateManager.js
// Redirect file — re-exports from the unified utils state manager so that
// any legacy import paths (e.g. from './stateManager') still resolve correctly.

export {
  getOrders, saveOrders, updateOrder, deleteOrder, addOrder,
  getCarpenters, saveCarpenters, addCarpenter, updateCarpenter, deleteCarpenter,
  addCarpenterPincode, addCarpenterPincodes, removeCarpenterPincode,
  replaceCarpenterPincodes, clearCarpenterPincodes,
  getUserRole, setUserRole, hasRole, hasPermission,
  getNotifications, saveNotifications, addNotification, clearNotifications,
  addComment, addAuditLog, autoAllocateOrders, getActiveUser, setActiveUser,
  getActiveWorkload, MAX_ACTIVE_JOBS, isActiveOrder,
  authenticateUser, checkSlaBreaches, queueSyncOperation,
  getN8nConfig, saveN8nConfig, triggerN8nWebhook,
  exportOrdersCSV, exportCarpentersCSV,
  normalizeOrder, initializeStorage, pb,
  fsaQueries, stateManager, lastLocalUpdate,
  rejectJob, mapRecordToOrder, dataURLtoBlob
} from './utils/stateManager';

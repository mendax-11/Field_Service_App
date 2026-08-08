// src/components/OrderGrid.jsx
import { useState, useEffect } from 'react';
import { 
  Search, ArrowUpDown, ChevronLeft, ChevronRight, 
  Trash2, Eye, SlidersHorizontal, RefreshCw
} from 'lucide-react';
import { deleteOrder, updateOrder, saveOrders, getActiveWorkload, MAX_ACTIVE_JOBS, hasRole, hasPermission, fsaQueries, normalizeOrder, pb, getCarpenters, stateManager, isActiveOrder } from '../utils/stateManager';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import OrderDetailsModal from './OrderDetailsModal';

export default function OrderGrid({ refreshTrigger, onRefresh }) {
  const queryClient = useQueryClient();
  const { data: ordersData = { items: [] }, refetch: refetchOrders, isLoading: isOrdersLoading } = useQuery(fsaQueries.orders.all(1, 500));
  const { data: carpentersData = { items: [] }, refetch: refetchCarpenters, isLoading: isCarpentersLoading } = useQuery(fsaQueries.carpenters.all(1, 500));
  
  const isLoading = isOrdersLoading || isCarpentersLoading;
  const serverOrders = (ordersData.items || []).map(normalizeOrder).filter(Boolean);
  const localOrders = stateManager.getOrders();
  const mergedOrders = new Map();
  serverOrders.forEach(order => mergedOrders.set(order.orderId, order));
  localOrders.forEach(order => {
    const normalized = normalizeOrder(order);
    if (normalized) {
      mergedOrders.set(normalized.orderId, { ...(mergedOrders.get(normalized.orderId) || {}), ...normalized });
    }
  });
  const orders = Array.from(mergedOrders.values());
  const carpenters = carpentersData.items?.length > 0 ? carpentersData.items : getCarpenters();
  
  const [role, setRole] = useState('Super Admin');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedJobStatus, setSelectedJobStatus] = useState('All');
  const [selectedCarpenter, setSelectedCarpenter] = useState('All');
  const [selectedPaymentType, setSelectedPaymentType] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  
  // Sorting & Pagination
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, sla_asc, payout_desc
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Column Selection states
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const cached = localStorage.getItem('fsa_visible_columns');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return {
      platform: true,
      sku: true,
      payout: true,
      delivery: true,
      jobStatus: true,
      carpenter: true,
      payment: true,
      sla: true
    };
  });

  // Save visible columns preference
  useEffect(() => {
    localStorage.setItem('fsa_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const loadData = () => {
    setRole(pb.authStore.model?.role || 'Super Admin');
    setSelectedOrderIds([]); // Clear selection on full reload
    refetchOrders();
    refetchCarpenters();
  };

  const handleQuickAssign = (orderId, carpenterName) => {
    const nextStatus = carpenterName ? 'Assigned' : 'Unassigned';
    const currentOrder = orders.find(o => o.orderId === orderId);

    if (carpenterName && currentOrder && !isActiveOrder({ ...currentOrder, assignedCarpenter: carpenterName, jobStatus: nextStatus })) {
      alert('This order is cancelled, completed, or archived and cannot be assigned to a technician.');
      return;
    }
    
    // Resolve carpenter ID from the PocketBase fetched carpenters list
    const matchedCarpenter = carpenters.find(c => c.name === carpenterName || c.username === carpenterName);
    const assignedCarpenterId = matchedCarpenter ? matchedCarpenter.id : null;
    
    const updatedFields = {
      assignedCarpenter: carpenterName || null,
      assignedCarpenterId,
      jobStatus: nextStatus,
      assignmentHold: !carpenterName,
      assignment_hold: !carpenterName
    };

    if (currentOrder) {
      const changes = [];
      if (currentOrder.assignedCarpenter !== updatedFields.assignedCarpenter) {
        changes.push(`Carpenter: ${currentOrder.assignedCarpenter || 'None'} -> ${updatedFields.assignedCarpenter || 'None'}`);
      }
      if (currentOrder.jobStatus !== updatedFields.jobStatus) {
        changes.push(`Job Status: ${currentOrder.jobStatus} -> ${updatedFields.jobStatus}`);
      }
      if (changes.length > 0) {
        const timestamp = new Date().toISOString();
        const newAuditLog = {
          timestamp,
          action: 'Quick Assigned',
          user: role,
          comments: changes.join(', ')
        };
        const existingLogs = currentOrder.auditLogs || [];
        updatedFields.auditLogs = [...existingLogs, newAuditLog];
      }
    }

    updateOrder(orderId, updatedFields);
    
    // Optimistic UI update to prevent race condition with server sync
    queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(o => o.order_id === orderId || o.id === orderId ? { ...o, assigned_carpenter_name: carpenterName, assigned_carpenter: assignedCarpenterId, assignment_hold: !carpenterName, assembly_status: nextStatus, status: nextStatus } : o)
      };
    });
    
    if (onRefresh) onRefresh();
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Handle external storage changes
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = (e, orderId) => {
    e.stopPropagation(); // Avoid opening details modal
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
      deleteOrder(orderId);
      
      // Optimistic UI update to prevent race condition with server sync
      queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter(o => o.order_id !== orderId && o.id !== orderId)
        };
      });
      
      if (onRefresh) onRefresh();
    }
  };

  const handleSelectOrder = (orderId, e) => {
    e.stopPropagation();
    setSelectedOrderIds(prev => 
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAllOnPage = (e) => {
    const pageOrderIds = paginatedOrders.map(o => o.orderId);
    if (e.target.checked) {
      setSelectedOrderIds(prev => {
        const union = new Set([...prev, ...pageOrderIds]);
        return Array.from(union);
      });
    } else {
      setSelectedOrderIds(prev => prev.filter(id => !pageOrderIds.includes(id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedOrderIds.length === 0) return;
    
    const targetOrders = orders.filter(o => selectedOrderIds.includes(o.orderId));
    const protectedOrders = targetOrders.filter(o => o.paymentStatus === 'Paid' || o.jobStatus === 'Completed' || o.status === 'Completed');
    
    if (protectedOrders.length > 0) {
      alert(`Cannot delete: ${protectedOrders.length} of the selected orders are Paid or Completed and cannot be deleted for audit integrity.`);
      return;
    }

    if (confirm(`Are you sure you want to delete the ${selectedOrderIds.length} selected orders?`)) {
      selectedOrderIds.forEach(id => deleteOrder(id));
      
      // Optimistic UI update to prevent race condition with server sync
      queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter(o => !selectedOrderIds.includes(o.order_id) && !selectedOrderIds.includes(o.id))
        };
      });
      
      setSelectedOrderIds([]);
      if (onRefresh) onRefresh();
    }
  };

  const handleBulkAssign = (carpenterName) => {
    if (selectedOrderIds.length === 0 || !carpenterName) return;

    const targetOrders = orders.filter(o => selectedOrderIds.includes(o.orderId));
    const blockedOrders = targetOrders.filter(o => !isActiveOrder({ ...o, assignedCarpenter: carpenterName, jobStatus: 'Assigned' }));
    if (blockedOrders.length > 0) {
      alert(`Cannot assign ${blockedOrders.length} selected orders because they are cancelled, completed, or archived.`);
      return;
    }
    
    selectedOrderIds.forEach(id => {
      updateOrder(id, { 
        assignedCarpenter: carpenterName,
        jobStatus: 'Assigned',
        status: 'Assigned',
        assignmentHold: false,
        assignment_hold: false
      });
    });
    
    // Optimistic UI update to prevent race condition with server sync
    queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(o => selectedOrderIds.includes(o.order_id) || selectedOrderIds.includes(o.id) ? { ...o, assigned_carpenter_name: carpenterName, assignment_hold: false, assembly_status: 'Assigned', status: 'Assigned' } : o)
      };
    });
    
    setSelectedOrderIds([]);
    if (onRefresh) onRefresh();
  };

  const handleBulkStatusChange = (status) => {
    if (selectedOrderIds.length === 0 || !status) return;
    const assignmentHold = status === 'Unassigned';
    
    selectedOrderIds.forEach(id => {
      updateOrder(id, { 
        jobStatus: status,
        status: status,
        ...(assignmentHold ? {
          assignedCarpenter: null,
          assignedCarpenterId: null,
          assigned_carpenter_name: '',
          assigned_carpenter: null
        } : {}),
        assignmentHold,
        assignment_hold: assignmentHold
      });
    });
    
    // Optimistic UI update to prevent race condition with server sync
    queryClient.setQueryData(fsaQueries.orders.all(1, 500).queryKey, (old) => {
      if (!old) return old;
      return {
        ...old,
        items: old.items.map(o => selectedOrderIds.includes(o.order_id) || selectedOrderIds.includes(o.id) ? {
          ...o,
          ...(assignmentHold ? { assigned_carpenter_name: '', assigned_carpenter: null } : {}),
          assignment_hold: assignmentHold,
          assembly_status: status,
          status: status
        } : o)
      };
    });
    
    setSelectedOrderIds([]);
    if (onRefresh) onRefresh();
  };

  const handleBulkEvidenceDelete = () => {
    if (selectedOrderIds.length === 0) return;

    const targetOrders = orders.filter(o => selectedOrderIds.includes(o.orderId));
    if (targetOrders.length === 0) {
      alert('No selected orders found.');
      return;
    }

    if (!confirm(`Clear before, after, and replacement photos from ${targetOrders.length} selected orders? Download anything important first.`)) {
      return;
    }

    const timestamp = new Date().toISOString();
    targetOrders.forEach(order => {
      const currentDamageReport = order.damageReport || order.damage_report || null;
      const nextDamageReport = currentDamageReport
        ? { ...currentDamageReport, damagePhotos: [], photo: '' }
        : currentDamageReport;

      const updatedFields = {
        photos: { ...(order.photos || {}), before: null, after: null },
        damagePhotos: [],
        damage_photos: [],
        damagePhoto: '',
        damageReport: nextDamageReport,
        damage_report: nextDamageReport,
        auditLogs: [
          ...(order.auditLogs || []),
          {
            timestamp,
            action: 'Evidence Photos Bulk Deleted',
            user: role,
            comments: 'Before, after, and replacement photos cleared from selected-orders bulk action.'
          }
        ]
      };
      const updatedOrder = updateOrder(order.orderId, updatedFields);
      if (!updatedOrder) {
        const fallbackOrder = normalizeOrder({ ...order, ...updatedFields });
        const localOrders = stateManager.getOrders();
        const existingIndex = localOrders.findIndex(o => o.orderId === order.orderId || o.order_id === order.orderId || o.id === order.orderId);
        const nextOrders = existingIndex === -1
          ? [...localOrders, fallbackOrder]
          : localOrders.map((localOrder, idx) => idx === existingIndex ? fallbackOrder : localOrder);
        saveOrders(nextOrders, fallbackOrder);
      }
    });

    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setSelectedOrderIds([]);
    loadData();
    if (onRefresh) onRefresh();
  };

  const handleBulkExport = () => {
    if (selectedOrderIds.length === 0) return;
    const selectedList = orders.filter(o => selectedOrderIds.includes(o.orderId));
    
    const headers = ['Order ID', 'Platform', 'Customer Name', 'Phone', 'Address', 'Pincode', 'SKU', 'Payout', 'Delivery Status', 'Job Status', 'Payment Status'];
    const rows = selectedList.map(o => [
      o.orderId,
      o.platform,
      o.customerName,
      o.customerPhone || '',
      o.customerAddress || '',
      o.pincode,
      o.sku,
      o.payout,
      o.deliveryStatus,
      o.jobStatus,
      o.paymentStatus
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `timberflow_selected_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate SLA values for sorting
  const getSlaValue = (order) => {
    if (order.deliveryStatus === 'Delivered') {
      return 9999999999999; // Completed SLA gets sent to the bottom of ascending sort
    }
    const delivery = new Date(order.deliveryDate);
    const now = new Date();
    return delivery - now; // Time remaining in ms (negative if overdue)
  };

  // Calculate SLA label for column display
  const getSlaLabel = (order) => {
    if (order.deliveryStatus === 'Delivered') {
      return { text: 'Delivered', class: 'sla-met-badge' };
    }
    const delivery = new Date(order.deliveryDate);
    const now = new Date();
    const diffMs = delivery - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) {
      return { text: `${Math.abs(diffHours)}h Overdue`, class: 'sla-overdue-badge' };
    } else if (diffHours <= 24) {
      return { text: `${diffHours}h remaining`, class: 'sla-urgent-badge' };
    } else {
      return { text: `${diffHours}h left`, class: 'sla-normal-badge' };
    }
  };

  // Filtering Logic
  const filteredOrders = orders.filter(order => {
    const matchesArchived = showArchived ? true : !order.archived;
    if (!matchesArchived) return false;

    // Search Box matches Order ID, Customer Name, Phone, or SKU
    const matchesSearch = 
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone.includes(searchTerm) ||
      order.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesPlatform = selectedPlatform === 'All' || order.platform === selectedPlatform;
    const matchesJobStatus = selectedJobStatus === 'All' || order.jobStatus === selectedJobStatus;
    const matchesCarpenter = selectedCarpenter === 'All'
      || (selectedCarpenter === 'Unassigned' ? !order.assignedCarpenter : order.assignedCarpenter === selectedCarpenter);
    const matchesPaymentType = selectedPaymentType === 'All' || order.paymentType === selectedPaymentType;

    return matchesSearch && matchesPlatform && matchesJobStatus && matchesCarpenter && matchesPaymentType;
  });

  // Sorting Logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.orderDate) - new Date(a.orderDate);
    }
    if (sortBy === 'date_asc') {
      return new Date(a.orderDate) - new Date(b.orderDate);
    }
    if (sortBy === 'payout_desc') {
      return b.payout - a.payout;
    }
    if (sortBy === 'sla_asc') {
      return getSlaValue(a) - getSlaValue(b);
    }
    return 0;
  });

  // Pagination Logic
  const totalItems = sortedOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Adjust current page if it exceeds total pages after filtering
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedOrders = sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="order-grid-container">
      {/* Advanced Filters Card */}
      <div className="filters-card">
        <div className="filters-header">
          <h4><SlidersHorizontal size={18} /> Advanced Order Filters</h4>
          <span className="results-count">Showing {filteredOrders.length} of {orders.length} orders</span>
        </div>
        
        <div className="filters-grid">
          {/* Search Box */}
          <div className="filter-item search-box">
            <label><Search size={14} /> Search</label>
            <input 
              type="text" 
              placeholder="Search ID, Name, Phone, or SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Platform Filter */}
          <div className="filter-item">
            <label>Platform</label>
            <select 
              value={selectedPlatform} 
              onChange={(e) => {
                setSelectedPlatform(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Platforms</option>
              <option value="Amazon">Amazon</option>
              <option value="Flipkart">Flipkart</option>
              <option value="WooCommerce">WooCommerce</option>
            </select>
          </div>

          {/* Job Status Filter */}
          <div className="filter-item">
            <label>Job Status</label>
            <select 
              value={selectedJobStatus} 
              onChange={(e) => {
                setSelectedJobStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Job Statuses</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Assigned">Assigned</option>
              <option value="On Hold - Parts Requested">On Hold - Parts Requested</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Carpenter Filter */}
          <div className="filter-item">
            <label>Assigned Carpenter</label>
            <select 
              value={selectedCarpenter} 
              onChange={(e) => {
                setSelectedCarpenter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Carpenters</option>
              <option value="Unassigned">Unassigned Only</option>
              {carpenters.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Type Filter */}
          <div className="filter-item">
            <label>Payment Type</label>
            <select 
              value={selectedPaymentType} 
              onChange={(e) => {
                setSelectedPaymentType(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Payments</option>
              <option value="Prepaid">Prepaid</option>
              <option value="COD">COD</option>
              <option value="EMI">EMI</option>
            </select>
          </div>
        </div>

        {/* Sorting and Items Per Page Panel */}
        <div className="sorting-pagination-settings">
          <div className="sort-control">
            <label><ArrowUpDown size={14} /> Sort By</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_desc">Order Date (Newest first)</option>
              <option value="date_asc">Order Date (Oldest first)</option>
              <option value="sla_asc">SLA Time Remaining (Urgent first)</option>
              <option value="payout_desc">Payout Value (Highest first)</option>
            </select>
          </div>

          <div className="items-per-page-control">
            <label>Show</label>
            <select 
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', position: 'relative' }}>
            <input 
              type="checkbox" 
              id="showArchived" 
              checked={showArchived}
              onChange={(e) => {
                setShowArchived(e.target.checked);
                setCurrentPage(1);
              }}
              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <label htmlFor="showArchived" style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: 'var(--admin-text-secondary)', textTransform: 'uppercase', marginRight: '8px' }}>
              Show Archived
            </label>

            {/* Column Selector Toggle Dropdown */}
            <button
              type="button"
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="template-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                margin: 0,
                fontSize: '11px',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid var(--admin-border-color)',
                color: 'var(--admin-text-primary)'
              }}
            >
              <SlidersHorizontal size={12} />
              <span>Columns</span>
            </button>

            {showColumnDropdown && (
              <div style={{
                position: 'absolute',
                top: '32px',
                right: '0',
                backgroundColor: 'var(--admin-bg-secondary, #0f172a)',
                border: '1px solid var(--admin-border-color)',
                borderRadius: '8px',
                padding: '10px',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                minWidth: '150px'
              }}>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--admin-text-secondary)', fontWeight: 'bold', borderBottom: '1px solid var(--admin-border-color)', paddingBottom: '4px', marginBottom: '2px' }}>
                  Toggle Columns
                </span>
                {Object.keys(visibleColumns).map((colKey) => {
                  const labels = {
                    platform: 'Platform',
                    sku: 'SKU / Item',
                    payout: 'Payout (₹)',
                    delivery: 'Delivery Status',
                    jobStatus: 'Job Status',
                    carpenter: 'Carpenter',
                    payment: 'Payment Type',
                    sla: 'SLA priority'
                  };
                  return (
                    <label key={colKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--admin-text-primary)' }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns[colKey]}
                        onChange={() => setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>{labels[colKey]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedOrderIds.length > 0 && (
        <div className="grid-bulk-actions-toolbar animate-fade-in">
          <div className="bulk-select-info">
            <span className="bulk-badge">{selectedOrderIds.length}</span>
            <span>selected</span>
          </div>
          <div className="bulk-actions-group">
            <select 
              onChange={(e) => { handleBulkAssign(e.target.value); e.target.value = ''; }} 
              className="bulk-select-action"
            >
              <option value="">Assign to Carpenter...</option>
              {carpenters.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select 
              onChange={(e) => { handleBulkStatusChange(e.target.value); e.target.value = ''; }} 
              className="bulk-select-action"
            >
              <option value="">Change Status...</option>
              <option value="Unassigned">Unassigned</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>

            <button onClick={handleBulkExport} className="bulk-action-btn secondary">
              Export CSV
            </button>

            <button onClick={handleBulkEvidenceDelete} className="bulk-action-btn secondary">
              Clear Evidence
            </button>

            {hasRole(role, 'Super Admin') && (
              <button onClick={handleBulkDelete} className="bulk-action-btn danger">
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="table-responsive" style={{ position: 'relative' }}>
        {isLoading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 10,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(2px)', borderRadius: '8px'
          }}>
            <div style={{
              padding: '16px 24px', background: 'var(--bg-panel, #1e293b)',
              border: '1px solid var(--border-color, #334155)', borderRadius: '8px',
              color: 'var(--text-main, #f8fafc)', display: 'flex', alignItems: 'center', gap: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
            }}>
              <RefreshCw 
                size={18} 
                style={{ 
                  color: 'var(--color-primary, #3b82f6)',
                  animation: 'spin 1s linear infinite'
                }} 
              />
              <span style={{ fontWeight: 500 }}>Syncing with Database...</span>
              <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}</style>
            </div>
          </div>
        )}
        <table className="orders-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={paginatedOrders.length > 0 && paginatedOrders.every(o => selectedOrderIds.includes(o.orderId))}
                  onChange={handleSelectAllOnPage}
                  style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                />
              </th>
              <th>Order ID</th>
              {visibleColumns.platform && <th>Platform</th>}
              <th>Customer Name</th>
              {visibleColumns.sku && <th>SKU</th>}
              {visibleColumns.payout && <th>Payout</th>}
              {visibleColumns.delivery && <th>Delivery</th>}
              {visibleColumns.jobStatus && <th>Job Status</th>}
              {visibleColumns.carpenter && <th>Carpenter</th>}
              {visibleColumns.payment && <th>Payment</th>}
              {visibleColumns.sla && <th>SLA</th>}
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedOrders.map(order => {
              const slaBadge = getSlaLabel(order);
              const isSelected = selectedOrderIds.includes(order.orderId);
              return (
                <tr 
                  key={order.orderId} 
                  onClick={() => setSelectedOrder(order)} 
                  className={`order-row-interactive ${isSelected ? 'row-selected' : ''}`}
                >
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleSelectOrder(order.orderId, e)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </td>
                  <td className="font-mono text-bold">{order.orderId}</td>
                  {visibleColumns.platform && (
                    <td>
                      <span className={`platform-tag ${order.platform.toLowerCase()}`}>
                        {order.platform}
                      </span>
                    </td>
                  )}
                  <td>{order.customerName}</td>
                  {visibleColumns.sku && <td className="font-mono text-small" title={order.sku}>{order.sku}</td>}
                  {visibleColumns.payout && <td className="text-bold price">₹{order.payout}</td>}
                  {visibleColumns.delivery && (
                    <td>
                      <span className={`status-badge delivery-${order.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.deliveryStatus}
                      </span>
                    </td>
                  )}
                  {visibleColumns.jobStatus && (
                    <td>
                      <span className={`status-badge job-${order.jobStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.jobStatus}
                      </span>
                    </td>
                  )}
                  {visibleColumns.carpenter && (
                    <td className="carpenter-cell" onClick={(e) => e.stopPropagation()}>
                      {!hasPermission(role, ['Super Admin', 'Dispatcher']) ? (
                        order.assignedCarpenter ? (
                          <span className="carpenter-assigned">{order.assignedCarpenter}</span>
                        ) : (
                          <span className="carpenter-unassigned">None</span>
                        )
                      ) : (
                        <select
                          value={order.assignedCarpenter || ''}
                          onChange={(e) => handleQuickAssign(order.orderId, e.target.value)}
                          style={{
                            background: 'var(--bg-input, #1a2333)',
                            color: order.assignedCarpenter ? 'var(--text-main, #f3f4f6)' : 'var(--text-muted, #9ca3af)',
                            border: '1px solid var(--border-color, #232e42)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                            minWidth: '160px'
                          }}
                        >
                          <option value="">None (Unassigned)</option>
                          {carpenters
                            .map(c => ({
                              ...c,
                              servesArea: c.pincodes && c.pincodes.includes(order.pincode),
                              workload: getActiveWorkload(c.name)
                            }))
                            .sort((a, b) => {
                              if (a.servesArea && !b.servesArea) return -1;
                              if (!a.servesArea && b.servesArea) return 1;
                              return a.workload - b.workload;
                            })
                            .map(c => {
                              const limit = Number(c.maxActiveJobs || c.max_active_jobs || MAX_ACTIVE_JOBS);
                              const isAtCapacity = c.workload >= limit;
                              return (
                                <option key={c.id} value={c.name} style={{ color: isAtCapacity ? '#9ca3af' : 'inherit' }}>
                                  {c.name} {c.servesArea ? '✅' : '❌'} ({c.workload}/{limit}){isAtCapacity ? ' ⚠️ max' : ''}
                                </option>
                              );
                            })
                          }
                        </select>
                      )}
                    </td>
                  )}
                  {visibleColumns.payment && (
                    <td>
                      <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                  )}
                  {visibleColumns.sla && (
                    <td>
                      <span className={`sla-indicator-badge ${slaBadge.class}`}>
                        {slaBadge.text}
                      </span>
                    </td>
                  )}
                  <td className="actions-cell text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons-wrapper">
                      <button 
                        className="action-btn view-btn" 
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {hasRole(role, 'Super Admin') ? (
                        (order.paymentStatus === 'Paid' || order.jobStatus === 'Completed' || order.status === 'Completed') ? (
                          <button 
                            className="action-btn delete-btn disabled" 
                            disabled
                            title="Paid or completed orders cannot be deleted for accounting audit integrity."
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button 
                            className="action-btn delete-btn" 
                            onClick={(e) => handleDelete(e, order.orderId)}
                            title="Delete Order"
                          >
                            <Trash2 size={14} />
                          </button>
                        )
                      ) : (
                        <button 
                          className="action-btn delete-btn disabled" 
                          disabled
                          title="Super Admin Only"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedOrders.length === 0 && (
              <tr>
                <td colSpan={12} className="no-data-cell">
                  No orders match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button 
            className={`page-nav-btn ${activePage === 1 ? 'disabled' : ''}`}
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage === 1}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                className={`page-num-btn ${activePage === pageNum ? 'active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button 
            className={`page-nav-btn ${activePage === totalPages ? 'disabled' : ''}`}
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage === totalPages}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Order Details Modal Overlay */}
      {selectedOrder && (
        <OrderDetailsModal 
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdate={() => {
            loadData();
            const localSelected = stateManager.getOrders().find(o => o.orderId === selectedOrder.orderId || o.order_id === selectedOrder.orderId);
            if (localSelected) {
              setSelectedOrder(normalizeOrder(localSelected));
            }
            // Re-sync selected order details to show updated logs/comments in real-time
            refetchOrders().then(({ data }) => {
              if (data) {
                const refreshedOrders = (data.items || []).map(normalizeOrder);
                const currentSelected = refreshedOrders.find(o => o.orderId === selectedOrder.orderId);
                const latestLocalSelected = stateManager.getOrders().find(o => o.orderId === selectedOrder.orderId || o.order_id === selectedOrder.orderId);
                if (latestLocalSelected) {
                  setSelectedOrder({
                    ...(currentSelected || {}),
                    ...normalizeOrder(latestLocalSelected)
                  });
                  return;
                }
                setSelectedOrder(currentSelected || null);
              }
            });
            if (onRefresh) onRefresh();
          }}
          readOnly={!hasRole(role, 'Super Admin') && (!hasRole(role, 'Dispatcher') || selectedOrder.paymentStatus === 'Paid' || selectedOrder.jobStatus === 'Completed' || selectedOrder.status === 'Completed')}
        />
      )}
    </div>
  );
}

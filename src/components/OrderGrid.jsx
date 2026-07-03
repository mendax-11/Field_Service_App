// src/components/OrderGrid.jsx
import { useState, useEffect } from 'react';
import { 
  Search, ArrowUpDown, ChevronLeft, ChevronRight, 
  Trash2, Eye, SlidersHorizontal 
} from 'lucide-react';
import { getOrders, deleteOrder, getUserRole, getCarpenters, updateOrder } from '../utils/stateManager';
import OrderDetailsModal from './OrderDetailsModal';

export default function OrderGrid({ refreshTrigger, onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [carpenters, setCarpenters] = useState([]);
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

  const loadData = () => {
    setOrders(getOrders());
    setCarpenters(getCarpenters());
    setRole(getUserRole());
    setSelectedOrderIds([]); // Clear selection on full reload
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  // Handle external storage changes
  useEffect(() => {
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
  }, []);

  const handleDelete = (e, orderId) => {
    e.stopPropagation(); // Avoid opening details modal
    if (confirm(`Are you sure you want to delete order ${orderId}?`)) {
      deleteOrder(orderId);
      loadData();
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
      setSelectedOrderIds([]);
      loadData();
      if (onRefresh) onRefresh();
    }
  };

  const handleBulkAssign = (carpenterName) => {
    if (selectedOrderIds.length === 0 || !carpenterName) return;
    
    selectedOrderIds.forEach(id => {
      updateOrder(id, { 
        assignedCarpenter: carpenterName,
        jobStatus: 'Assigned',
        status: 'Assigned'
      });
    });
    
    setSelectedOrderIds([]);
    loadData();
    if (onRefresh) onRefresh();
  };

  const handleBulkStatusChange = (status) => {
    if (selectedOrderIds.length === 0 || !status) return;
    
    selectedOrderIds.forEach(id => {
      updateOrder(id, { 
        jobStatus: status,
        status: status
      });
    });
    
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
    const matchesCarpenter = selectedCarpenter === 'All' || order.assignedCarpenter === selectedCarpenter;
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
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
            <label htmlFor="showArchived" style={{ cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>
              Show Archived
            </label>
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

            {role === 'Super Admin' && (
              <button onClick={handleBulkDelete} className="bulk-action-btn danger">
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="table-responsive">
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
              <th>Platform</th>
              <th>Customer Name</th>
              <th>SKU</th>
              <th>Payout</th>
              <th>Delivery</th>
              <th>Job Status</th>
              <th>Carpenter</th>
              <th>Payment</th>
              <th>SLA</th>
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
                      onChange={(e) => handleSelectOrder(order.orderId, e)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                    />
                  </td>
                  <td className="font-mono text-bold">{order.orderId}</td>
                  <td>
                    <span className={`platform-tag ${order.platform.toLowerCase()}`}>
                      {order.platform}
                    </span>
                  </td>
                  <td>{order.customerName}</td>
                  <td className="font-mono text-small" title={order.sku}>{order.sku}</td>
                  <td className="text-bold price">₹{order.payout}</td>
                  <td>
                    <span className={`status-badge delivery-${order.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.deliveryStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge job-${order.jobStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.jobStatus}
                    </span>
                  </td>
                  <td className="carpenter-cell">
                    {order.assignedCarpenter ? (
                      <span className="carpenter-assigned">{order.assignedCarpenter}</span>
                    ) : (
                      <span className="carpenter-unassigned">None</span>
                    )}
                  </td>
                  <td>
                    <span className={`payment-badge ${order.paymentStatus.toLowerCase()}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`sla-indicator-badge ${slaBadge.class}`}>
                      {slaBadge.text}
                    </span>
                  </td>
                  <td className="actions-cell text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="action-buttons-wrapper">
                      <button 
                        className="action-btn view-btn" 
                        onClick={() => setSelectedOrder(order)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {role === 'Super Admin' ? (
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
            // Re-sync selected order details to show updated logs/comments in real-time
            const refreshedOrders = getOrders();
            const currentSelected = refreshedOrders.find(o => o.orderId === selectedOrder.orderId);
            setSelectedOrder(currentSelected || null);
            if (onRefresh) onRefresh();
          }}
          readOnly={role !== 'Super Admin' && (selectedOrder.paymentStatus === 'Paid' || selectedOrder.jobStatus === 'Completed' || selectedOrder.status === 'Completed')}
        />
      )}
    </div>
  );
}

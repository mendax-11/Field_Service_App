// src/components/InventoryDashboard.jsx
import { useState, useEffect } from 'react';
import { Package, Check, ClipboardList, AlertOctagon, User, FileText, Image as ImageIcon, Search } from 'lucide-react';
import { getOrders, updateOrder, addNotification, getUserRole } from '../utils/stateManager';
import './InventoryDashboard.css';

export default function InventoryDashboard({ refreshTrigger, onRefresh }) {
  const [onHoldOrders, setOnHoldOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadOrders = () => {
    const allOrders = getOrders();
    const onHold = allOrders.filter(o => o.jobStatus === 'On Hold - Parts Requested');
    
    // Lean history: find orders that have a 'Parts Dispatched' audit log
    const history = allOrders.filter(o => 
      o.auditLogs && o.auditLogs.some(log => log.action === 'Parts Dispatched')
    );

    setOnHoldOrders(onHold);
    setHistoryOrders(history);
  };

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger]);

  // Listen to external storage updates
  useEffect(() => {
    const handleUpdate = () => {
      loadOrders();
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
  }, []);

  const handleApproveDispatch = (orderId, partsList) => {
    setProcessingId(orderId);
    
    // Simulate slight delay for premium feel
    setTimeout(() => {
      const orders = getOrders();
      const order = orders.find(o => o.orderId === orderId);
      if (order) {
        const timestamp = new Date().toISOString();
        const updatedFields = {
          jobStatus: 'Assigned',
          // Append audit log
          auditLogs: [
            ...(order.auditLogs || []),
            {
              timestamp,
              action: 'Parts Dispatched',
              user: getUserRole(),
              comments: `Parts approved & dispatched: ${partsList || 'Requested parts package'}`
            }
          ]
        };

        updateOrder(orderId, updatedFields);
        addNotification(`Logistics: Parts dispatched for order ${orderId}. Job status changed back to Assigned.`);
        
        setProcessingId(null);
        loadOrders();
        if (onRefresh) onRefresh();
      }
    }, 800);
  };

  return (
    <div className="inventory-dashboard-container">
      <div className="dashboard-sub-header">
        <div>
          <h3><ClipboardList size={22} /> Logistics & Parts Dispatch</h3>
          <p className="subtitle">Manage part requests and inventory logistics for orders marked as On Hold by carpenters.</p>
        </div>
        <div className="logistics-controls">
          <div className="logistics-tabs">
            <button 
              className={`logistics-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending ({onHoldOrders.length})
            </button>
            <button 
              className={`logistics-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              History ({historyOrders.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'history' ? (
        historyOrders.length === 0 ? (
          <div className="empty-inventory-state">
            <div className="empty-icon-circle" style={{ color: '#9ca3af', borderColor: 'rgba(156, 163, 175, 0.25)', background: 'rgba(156, 163, 175, 0.1)' }}>
              <ClipboardList size={40} />
            </div>
            <h4>No History</h4>
            <p>No parts have been dispatched yet. Process pending requests to see them here.</p>
          </div>
        ) : (
          <div className="history-table-container">
            <div className="history-search-bar" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', background: 'var(--admin-bg-secondary)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--admin-border-color)' }}>
              <Search size={18} style={{ color: 'var(--admin-text-secondary)', marginRight: '8px' }} />
              <input 
                type="text" 
                placeholder="Search by Order ID, Carpenter, or Parts..."
                value={historySearchTerm}
                onChange={(e) => setHistorySearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--admin-text-primary)', width: '100%', fontSize: '14px' }}
              />
            </div>
            <table className="history-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Carpenter</th>
                  <th>Damage Photo</th>
                  <th>Parts Dispatched</th>
                </tr>
              </thead>
              <tbody>
                {historyOrders
                  .filter(order => {
                    const searchLower = historySearchTerm.toLowerCase();
                    return (
                      order.orderId.toLowerCase().includes(searchLower) ||
                      (order.assignedCarpenter || '').toLowerCase().includes(searchLower) ||
                      (order.partsList || '').toLowerCase().includes(searchLower)
                    );
                  })
                  .map(order => (
                  <tr key={order.orderId}>
                    <td className="font-bold">{order.orderId}</td>
                    <td>{order.customerName}</td>
                    <td>{order.assignedCarpenter}</td>
                    <td>
                      {order.damagePhoto ? (
                        <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--admin-border-color)' }}>
                          <img src={order.damagePhoto} alt="Damage" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px' }}>No Photo</span>
                      )}
                    </td>
                    <td>
                      <div className="parts-tags">
                        {order.partsList ? order.partsList.split(',').map((part, index) => (
                          <span key={index} className="part-tag">{part.trim()}</span>
                        )) : (
                          <span className="no-parts-text">N/A</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        onHoldOrders.length === 0 ? (
        <div className="empty-inventory-state">
          <div className="empty-icon-circle">
            <Check size={40} />
          </div>
          <h4>All Clear!</h4>
          <p>There are no jobs currently waiting for replacement parts. All logistics requests are resolved.</p>
        </div>
      ) : (
        <div className="hold-jobs-grid">
          {onHoldOrders.map(order => (
            <div key={order.orderId} className="hold-job-card">
              <div className="card-header-logistics">
                <div className="header-order-info">
                  <span className="order-id-label">{order.orderId}</span>
                  <span className={`platform-badge ${order.platform.toLowerCase()}`}>
                    {order.platform}
                  </span>
                </div>
                <div className="carpenter-assignee">
                  <User size={14} /> 
                  <span>{order.assignedCarpenter}</span>
                </div>
              </div>

              <div className="card-main-layout">
                {/* Damage Photo Section */}
                <div className="damage-photo-panel">
                  {order.damagePhoto ? (
                    <div className="photo-wrapper">
                      <img 
                        src={order.damagePhoto} 
                        alt={`Damage for ${order.orderId}`} 
                        className="damage-photo-img"
                        onError={(e) => {
                          // Fallback if image fails to load
                          e.target.src = 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=400&auto=format&fit=crop';
                        }}
                      />
                      <span className="photo-overlay-tag"><ImageIcon size={12} /> Damage Photo</span>
                    </div>
                  ) : (
                    <div className="no-photo-placeholder">
                      <AlertOctagon size={24} />
                      <span>No Photo Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="request-details-panel">
                  <div className="detail-section">
                    <span className="section-label"><Package size={14} /> Parts Requested:</span>
                    <div className="parts-list-display">
                      {order.partsList ? (
                        <div className="parts-tags">
                          {order.partsList.split(',').map((part, index) => (
                            <span key={index} className="part-tag">{part.trim()}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="no-parts-text">No parts itemized by carpenter.</span>
                      )}
                    </div>
                  </div>

                  <div className="detail-section">
                    <span className="section-label"><FileText size={14} /> Carpenter Comments:</span>
                    <p className="carpenter-quote">
                      "{order.carpenterComments || 'No details provided by carpenter.'}"
                    </p>
                  </div>

                  <div className="customer-context">
                    <span className="label">Customer Name:</span>
                    <span className="val">{order.customerName}</span>
                    <span className="label divider">|</span>
                    <span className="label">SKU:</span>
                    <span className="val code-text">{order.sku}</span>
                  </div>
                </div>
              </div>

              <div className="card-footer-logistics">
                <button
                  type="button"
                  className={`dispatch-parts-btn ${processingId === order.orderId ? 'loading' : ''}`}
                  onClick={() => handleApproveDispatch(order.orderId, order.partsList)}
                  disabled={processingId !== null}
                >
                  {processingId === order.orderId ? (
                    <>
                      <span className="spinner"></span> Dispatching...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Approve & Dispatch Parts
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        )
      )}
    </div>
  );
}

// src/components/InventoryDashboard.jsx
import { useState, useEffect } from 'react';
import { Package, Check, ClipboardList, AlertOctagon, User, FileText, Image as ImageIcon, Search } from 'lucide-react';
import { updateOrder, saveOrders, addNotification, getUserRole, fsaQueries, normalizeOrder, stateManager } from '../utils/stateManager';
import { useQuery } from '@tanstack/react-query';
import './InventoryDashboard.css';

function getDamagePhotos(order) {
  if (Array.isArray(order.damagePhotos) && order.damagePhotos.length > 0) {
    return order.damagePhotos;
  }
  if (Array.isArray(order.damage_report?.damagePhotos) && order.damage_report.damagePhotos.length > 0) {
    return order.damage_report.damagePhotos;
  }
  if (Array.isArray(order.damageReport?.damagePhotos) && order.damageReport.damagePhotos.length > 0) {
    return order.damageReport.damagePhotos;
  }
  const singlePhoto = order.damagePhoto || order.damage_report?.photo || order.damageReport?.photo;
  return singlePhoto ? [singlePhoto] : [];
}

function getPartsList(order) {
  return order.partsList || order.damageReport?.partName || order.damage_report?.partName || '';
}

function getCarpenterComments(order) {
  return order.carpenterComments || order.damageReport?.notes || order.damage_report?.notes || '';
}

function getPartRequestStatus(order) {
  const status = order.damageReport?.status || order.damage_report?.status || order.replacement_request?.status || '';
  return String(status).toLowerCase();
}

function hasOpenPartRequest(order) {
  const requestStatus = getPartRequestStatus(order);
  return order.jobStatus === 'On Hold - Parts Requested' && !['approved', 'dispatched', 'resolved', 'closed'].includes(requestStatus);
}

export default function InventoryDashboard({ refreshTrigger, onRefresh }) {
  const [onHoldOrders, setOnHoldOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { data: ordersData = { items: [] }, refetch: refetchOrders } = useQuery(fsaQueries.orders.all(1, 500));
  const getMergedOrders = () => {
    const localOrders = stateManager.getOrders();
    const serverOrders = (ordersData.items || []).map(normalizeOrder).filter(Boolean);
    const mergedById = new Map();

    serverOrders.forEach(order => {
      mergedById.set(order.orderId, order);
    });
    localOrders.forEach(order => {
      const key = order.orderId || order.order_id || order.id;
      mergedById.set(key, { ...(mergedById.get(key) || {}), ...order });
    });

    return Array.from(mergedById.values()).map(normalizeOrder).filter(Boolean);
  };

  const loadOrders = (sourceOrders = getMergedOrders()) => {
    const allOrders = sourceOrders.map(order => {
      const normalized = normalizeOrder(order);
      const damagePhotos = getDamagePhotos(normalized);
      return {
        ...normalized,
        damagePhotos,
        damage_photos: damagePhotos,
        partsList: getPartsList(normalized),
        carpenterComments: getCarpenterComments(normalized)
      };
    });
    const onHold = allOrders.filter(hasOpenPartRequest);
    
    // Lean history: find orders that have a 'Parts Dispatched' audit log
    const history = allOrders.filter(o => 
      o.auditLogs && o.auditLogs.some(log => log.action === 'Parts Dispatched')
    );

    setOnHoldOrders(onHold);
    setHistoryOrders(history);
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, ordersData]);

  // Listen to external storage updates
  useEffect(() => {
    const handleUpdate = () => {
      refetchOrders().then(loadOrders);
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordersData, refetchOrders]);

  const handleApproveDispatch = (orderId, partsList) => {
    setProcessingId(orderId);
    
    // Simulate slight delay for premium feel
    setTimeout(() => {
      const currentOrders = getMergedOrders();
      const order = currentOrders.find(o => o.orderId === orderId);
      if (order) {
        const timestamp = new Date().toISOString();
        const requestedParts = partsList || getPartsList(order);
        const damageReport = order.damageReport || order.damage_report || null;
        const updatedFields = {
          jobStatus: 'Assigned',
          status: 'Assigned',
          assembly_status: 'Assigned',
          damageReport: damageReport ? { ...damageReport, status: 'Dispatched' } : damageReport,
          damage_report: damageReport ? { ...damageReport, status: 'Dispatched' } : damageReport,
          // Append audit log
          auditLogs: [
            ...(order.auditLogs || []),
            {
              timestamp,
              action: 'Parts Dispatched',
              user: getUserRole(),
              comments: `Parts approved & dispatched: ${requestedParts || 'Requested parts package'}`
            }
          ]
        };

        const updatedOrder = updateOrder(orderId, updatedFields);
        const fallbackUpdatedOrder = normalizeOrder({ ...order, ...updatedFields });
        addNotification(`Logistics: Parts dispatched for order ${orderId}. Job status changed to Assigned.`);
        
        setProcessingId(null);
        if (updatedOrder) {
          loadOrders(currentOrders.map(o => o.orderId === orderId ? updatedOrder : o));
        } else {
          const mergedWithApprovedOrder = currentOrders.map(o => o.orderId === orderId ? fallbackUpdatedOrder : o);
          saveOrders(mergedWithApprovedOrder, fallbackUpdatedOrder);
          loadOrders(mergedWithApprovedOrder);
        }
        refetchOrders();
        if (onRefresh) onRefresh();
      } else {
        setProcessingId(null);
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
                    getPartsList(order).toLowerCase().includes(searchLower)
                    );
                  })
                  .map(order => (
                  <tr key={order.orderId}>
                    <td className="font-bold">{order.orderId}</td>
                    <td>{order.customerName}</td>
                    <td>{order.assignedCarpenter}</td>
                    <td>
                      {getDamagePhotos(order).length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '48px', height: '48px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--admin-border-color)', position: 'relative' }}>
                            <img src={getDamagePhotos(order)[0]} alt="Damage" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {getDamagePhotos(order).length > 1 && (
                              <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '9px', padding: '1px 3px', borderTopLeftRadius: '3px', fontWeight: 'bold' }}>
                                +{getDamagePhotos(order).length - 1}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--admin-text-secondary)', fontSize: '12px' }}>No Photo</span>
                      )}
                    </td>
                    <td>
                      <div className="parts-tags">
                        {getPartsList(order) ? getPartsList(order).split(',').map((part, index) => (
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
                <div className="damage-photo-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {getDamagePhotos(order).length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', width: '100%' }}>
                      {getDamagePhotos(order).map((photo, idx) => (
                        <div key={idx} className="photo-wrapper" style={{ height: '90px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--admin-border-color)', position: 'relative' }}>
                          <img 
                            src={photo} 
                            alt={`Damage for ${order.orderId} - Part ${idx + 1}`} 
                            className="damage-photo-img"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=400&auto=format&fit=crop';
                            }}
                          />
                          <span className="photo-overlay-tag" style={{ fontSize: '9px', padding: '1px 4px' }}><ImageIcon size={10} /> Photo {idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-photo-placeholder" style={{ height: '90px' }}>
                      <AlertOctagon size={20} />
                      <span>No Photo Uploaded</span>
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="request-details-panel">
                  <div className="detail-section">
                    <span className="section-label"><Package size={14} /> Parts Requested:</span>
                    <div className="parts-list-display">
                      {getPartsList(order) ? (
                        <div className="parts-tags">
                          {getPartsList(order).split(',').map((part, index) => (
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
                      "{getCarpenterComments(order) || 'No details provided by carpenter.'}"
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
                  onClick={() => handleApproveDispatch(order.orderId, getPartsList(order))}
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

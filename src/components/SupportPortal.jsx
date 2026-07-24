// src/components/SupportPortal.jsx
import { useState, useEffect } from 'react';
import { 
  Search, MessageSquare, History, ArrowLeft, User, 
  Package, Clock, Plus, HelpCircle
} from 'lucide-react';
import { addComment, getUserRole, fsaQueries, normalizeOrder } from '../utils/stateManager';
import { useQuery } from '@tanstack/react-query';

export default function SupportPortal({ refreshTrigger, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [newComment, setNewComment] = useState('');
  const { data: ordersData = { items: [] }, refetch: refetchOrders } = useQuery(fsaQueries.orders.all(1, 500));
  const orders = (ordersData.items || []).map(normalizeOrder);
  const loadData = () => {
    refetchOrders();
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Sync state if localStorage changes
  useEffect(() => {
    const handleUpdate = () => {
      refetchOrders();
    };
    window.addEventListener('fsa_storage_update', handleUpdate);
    return () => window.removeEventListener('fsa_storage_update', handleUpdate);
  }, [refetchOrders]);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  // Filter orders matching search term
  const searchResults = orders.filter(order => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    return (
      order.orderId.toLowerCase().includes(term) ||
      order.customerName.toLowerCase().includes(term) ||
      order.customerPhone.includes(term) ||
      order.sku.toLowerCase().includes(term)
    );
  });

  const selectedOrder = orders.find(o => o.orderId === selectedOrderId);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedOrderId) return;
    
    // Add comment as Customer Support role
    addComment(selectedOrderId, newComment.trim(), getUserRole());
    setNewComment('');
    loadData();
    if (onRefresh) onRefresh();
  };

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
    } else {
      return { text: `${diffHours}h remaining`, class: 'sla-normal-badge' };
    }
  };

  return (
    <div className="support-portal-container">
      {/* Search Header */}
      {!selectedOrderId ? (
        <div className="support-search-hero">
          <div className="hero-text">
            <h3><HelpCircle size={22} /> Support Portal</h3>
            <p className="subtitle">Retrieve orders, review live audit logs, and append customer communication threads.</p>
          </div>
          
          <form onSubmit={handleSearch} className="support-search-form">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Enter Order ID, Customer Name, Phone, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </form>

          {/* Quick list of orders to click if no search text is typed yet */}
          {!searchTerm.trim() ? (
            <div className="quick-access-panel">
              <span className="quick-access-title">Recent Active Orders:</span>
              <div className="quick-list">
                {orders.slice(0, 4).map(o => (
                  <button 
                    key={o.orderId}
                    className="quick-order-btn"
                    onClick={() => {
                      setSelectedOrderId(o.orderId);
                      setSearchTerm(o.orderId);
                    }}
                  >
                    <span className="id">{o.orderId}</span>
                    <span className="name">{o.customerName}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="search-results-panel">
              <h4 className="results-heading">Search Results ({searchResults.length})</h4>
              
              {searchResults.length === 0 ? (
                <div className="no-results-state">
                  <p>No orders found matching "{searchTerm}"</p>
                  <span className="help-text">Try searching for "AMZ", "Tesla", or Phone "+1-555"</span>
                </div>
              ) : (
                <div className="results-list">
                  {searchResults.map(order => (
                    <div 
                      key={order.orderId}
                      className="result-row"
                      onClick={() => setSelectedOrderId(order.orderId)}
                    >
                      <div className="result-main">
                        <span className="order-id">{order.orderId}</span>
                        <span className={`platform-badge ${order.platform.toLowerCase()}`}>
                          {order.platform}
                        </span>
                        <span className="customer-name">{order.customerName}</span>
                        <span className="sku code-text">{order.sku}</span>
                      </div>
                      <div className="result-statuses">
                        <span className={`status-badge job-${order.jobStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          Job: {order.jobStatus}
                        </span>
                        <span className={`status-badge delivery-${order.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          Delivery: {order.deliveryStatus}
                        </span>
                        <button className="view-logs-btn">
                          View Log &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Order selected - Show full logs & comments thread */
        <div className="support-order-view animate-fade-in">
          <div className="view-header">
            <button 
              className="back-btn"
              onClick={() => {
                setSelectedOrderId('');
                setNewComment('');
              }}
            >
              <ArrowLeft size={16} /> Back to Search
            </button>
            <div className="header-info">
              <h3>Order details for {selectedOrder?.orderId}</h3>
              <span className={`platform-badge ${selectedOrder?.platform.toLowerCase()}`}>
                {selectedOrder?.platform}
              </span>
            </div>
          </div>

          {selectedOrder && (
            <div className="support-grid">
              {/* Left Column: Read-Only Order Information */}
              <div className="support-info-col">
                <div className="info-card-support">
                  <h4><User size={16} /> Customer Information</h4>
                  <div className="info-row">
                    <span className="label">Name:</span>
                    <span className="value">{selectedOrder.customerName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Phone:</span>
                    <span className="value">{selectedOrder.customerPhone}</span>
                  </div>
                </div>

                <div className="info-card-support">
                  <h4><Package size={16} /> Order Info</h4>
                  <div className="info-row">
                    <span className="label">SKU:</span>
                    <span className="value code-text">{selectedOrder.sku}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Payout:</span>
                    <span className="value price">₹{selectedOrder.payout}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Payment Type:</span>
                    <span className="value">{selectedOrder.paymentType}</span>
                  </div>
                </div>

                <div className="info-card-support read-only-status-card">
                  <h4><Clock size={16} /> Status Tracker (Read-Only)</h4>
                  <div className="info-row">
                    <span className="label">Job Status:</span>
                    <span className={`status-badge job-${selectedOrder.jobStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedOrder.jobStatus}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Delivery Status:</span>
                    <span className={`status-badge delivery-${selectedOrder.deliveryStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedOrder.deliveryStatus}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Assigned Carpenter:</span>
                    <span className="value highlight-carpenter">
                      {selectedOrder.assignedCarpenter || 'Not Assigned'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Payment Status:</span>
                    <span className={`payment-badge ${selectedOrder.paymentStatus.toLowerCase()}`}>
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">SLA Timeline:</span>
                    <span className={`sla-indicator-badge ${getSlaLabel(selectedOrder).class}`}>
                      {getSlaLabel(selectedOrder).text}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Timeline Logs & Comments Thread */}
              <div className="support-activity-col">
                {/* Live Timeline Audit Logs */}
                <div className="activity-card audit-timeline">
                  <h4><History size={16} /> Live Audit Logs (Timeline)</h4>
                  <div className="timeline-list scrollable-activity">
                    {(selectedOrder.auditLogs || []).map((log, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-marker"></div>
                        <div className="timeline-content">
                          <div className="timeline-meta">
                            <span className="log-action">{log.action}</span>
                            <span className="log-time">
                              {new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="log-details">{log.comments}</div>
                          <div className="log-user">User: <span className="user-tag">{log.user}</span></div>
                        </div>
                      </div>
                    ))}
                    {(!selectedOrder.auditLogs || selectedOrder.auditLogs.length === 0) && (
                      <p className="no-activity">No system events logged.</p>
                    )}
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="activity-card comments-thread">
                  <h4><MessageSquare size={16} /> Customer Communication & Support Comments</h4>
                  <div className="comments-list scrollable-activity">
                    {(selectedOrder.comments || []).map((c, idx) => (
                      <div key={idx} className="comment-item">
                        <div className="comment-header">
                          <span className="comment-author">{c.author}</span>
                          <span className="comment-time">
                            {new Date(c.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="comment-body">{c.text}</div>
                      </div>
                    ))}
                    {(!selectedOrder.comments || selectedOrder.comments.length === 0) && (
                      <p className="no-activity">No team comments on this order.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="comment-form">
                    <input 
                      type="text" 
                      placeholder="Add an internal comment thread..." 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      required
                    />
                    <button type="submit" className="comment-btn">
                      <Plus size={16} /> Add Comment
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
